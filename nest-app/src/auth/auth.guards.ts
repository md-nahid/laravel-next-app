import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.types';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const identity = await this.auth.resolveIdentity(request);
    if (!identity) throw new UnauthorizedException();

    request.user = identity.user;
    request.authType = identity.authType;
    request.authSession = identity.authSession;
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
