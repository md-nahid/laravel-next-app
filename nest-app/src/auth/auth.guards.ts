import { createHash } from 'node:crypto';
import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq, gt, isNull, or } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { personalAccessTokens } from '../database/schema';
import { users } from '../database/users.schema';
import type { AuthenticatedRequest } from './auth.types';
import { SessionService } from './session.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly database: DatabaseService,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (authorization?.startsWith('Bearer ')) {
      const plainTextToken = authorization.slice('Bearer '.length);
      const separator = plainTextToken.indexOf('|');
      if (separator > 0) {
        const id = Number(plainTextToken.slice(0, separator));
        const secret = plainTextToken.slice(separator + 1);
        if (Number.isSafeInteger(id) && secret.length > 0) {
          const [token] = await this.database.db
            .select()
            .from(personalAccessTokens)
            .where(
              and(
                eq(personalAccessTokens.id, id),
                eq(personalAccessTokens.tokenableType, 'App\\Models\\User'),
                eq(
                  personalAccessTokens.token,
                  createHash('sha256').update(secret).digest('hex'),
                ),
                or(
                  isNull(personalAccessTokens.expiresAt),
                  gt(personalAccessTokens.expiresAt, new Date()),
                ),
              ),
            )
            .limit(1);

          if (token) {
            const [user] = await this.database.db
              .select()
              .from(users)
              .where(eq(users.id, token.tokenableId))
              .limit(1);
            if (user) {
              request.user = user;
              request.authType = 'token';
              await this.database.db
                .update(personalAccessTokens)
                .set({ lastUsedAt: new Date() })
                .where(eq(personalAccessTokens.id, id));
              return true;
            }
          }
        }
      }
      throw new UnauthorizedException();
    }

    const session = await this.sessionService.fromRequest(request);
    if (!session?.userId) throw new UnauthorizedException();

    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    if (!user) throw new UnauthorizedException();

    request.user = user;
    request.authType = 'session';
    request.authSession = { id: session.id, payload: session.payload };
    return true;
  }
}

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (
      request.method === 'GET' ||
      request.method === 'HEAD' ||
      request.method === 'OPTIONS'
    ) {
      return true;
    }

    if (
      request.headers.authorization?.startsWith('Bearer ') &&
      request.authType === 'token'
    ) {
      return true;
    }
    if (!request.authSession) {
      const session = await this.sessionService.fromRequest(request);
      if (session) {
        request.authSession = { id: session.id, payload: session.payload };
      }
    }
    if (this.sessionService.isValidCsrf(request)) return true;

    throw new HttpException({ message: 'CSRF token mismatch.' }, 419);
  }
}
