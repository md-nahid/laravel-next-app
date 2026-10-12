import { createHash, randomBytes } from 'node:crypto';
import {
  HttpException,
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { Response } from 'express';
import { DatabaseService } from '../database/database.service';
import { personalAccessTokens } from '../database/schema';
import { users } from '../database/users.schema';
import type { LoginDto, RegisterDto, StoreTokenDto } from './auth.dto';
import type { AuthenticatedRequest } from './auth.types';
import { SessionService } from './session.service';

interface AttemptWindow {
  count: number;
  startedAt: number;
}

@Injectable()
export class AuthService {
  private readonly loginAttempts = new Map<string, AttemptWindow>();

  constructor(
    private readonly database: DatabaseService,
    private readonly sessionService: SessionService,
  ) {}

  async register(
    input: RegisterDto,
    request: AuthenticatedRequest,
    response: Response,
  ) {
    if (input.password !== input.password_confirmation) {
      throw this.validationError(
        'password',
        'The password confirmation does not match.',
      );
    }

    const email = input.email;
    const password = await hash(input.password, 12);
    const now = new Date();
    let user: typeof users.$inferSelect | undefined;
    try {
      [user] = await this.database.db
        .insert(users)
        .values({
          name: input.name,
          email,
          password,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw this.validationError(
          'email',
          'The email has already been taken.',
        );
      }
      throw error;
    }

    if (!user) {
      throw new Error('User insert completed without returning a user row.');
    }

    await this.sessionService.authenticate(request, response, user.id);
    return;
  }

  async login(
    input: LoginDto,
    request: AuthenticatedRequest,
    response: Response,
  ) {
    const email = input.email;
    this.checkLoginRate(email, request.ip ?? 'unknown');

    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !(await compare(input.password, user.password))) {
      throw this.validationError(
        'email',
        'The provided credentials are incorrect.',
      );
    }

    this.loginAttempts.delete(this.loginKey(email, request.ip ?? 'unknown'));

    await this.sessionService.authenticate(
      request,
      response,
      user.id,
      input.remember,
    );
  }

  async issueToken(input: StoreTokenDto, request: AuthenticatedRequest) {
    const email = input.email;
    const ip = request.ip ?? 'unknown';
    this.checkLoginRate(email, ip);
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!user || !(await compare(input.password, user.password))) {
      throw this.validationError(
        'email',
        'The provided credentials are incorrect.',
      );
    }
    this.loginAttempts.delete(this.loginKey(email, ip));

    const secret = randomBytes(40).toString('hex');
    const [token] = await this.database.db
      .insert(personalAccessTokens)
      .values({
        tokenableType: 'App\\Models\\User',
        tokenableId: user.id,
        name: input.device_name,
        token: createHash('sha256').update(secret).digest('hex'),
        abilities: '["*"]',
      })
      .returning({ id: personalAccessTokens.id });
    if (!token)
      throw new Error('Personal access token insert returned no row.');

    return { token: `${token.id}|${secret}`, token_type: 'Bearer' };
  }

  private checkLoginRate(email: string, ip: string) {
    this.checkRateLimit(
      this.loginAttempts,
      this.loginKey(email, ip),
      'Too many login attempts. Please try again later.',
    );
  }

  private checkRateLimit(
    attempts: Map<string, AttemptWindow>,
    key: string,
    message: string,
  ) {
    const now = Date.now();
    const current = attempts.get(key);
    if (!current || now - current.startedAt >= 60_000) {
      for (const [attemptKey, window] of attempts) {
        if (now - window.startedAt >= 60_000) {
          attempts.delete(attemptKey);
        }
      }
      if (attempts.size >= 10_000) {
        const oldestKey = [...attempts.keys()][0];
        if (oldestKey !== undefined) attempts.delete(oldestKey);
      }
      attempts.set(key, { count: 1, startedAt: now });
      return;
    }
    if (current.count >= 5) {
      throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
    }
    current.count += 1;
  }

  private loginKey(email: string, ip: string) {
    return `${email}|${ip}`;
  }

  private validationError(field: string, message: string) {
    return new UnprocessableEntityException({
      message: 'The given data was invalid.',
      errors: { [field]: [message] },
    });
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Error) || !('code' in error)) return false;
  return error.code === '23505';
}
