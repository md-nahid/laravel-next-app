import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import type { CookieOptions, Response } from 'express';
import { DatabaseService } from '../database/database.service';
import { sessions } from '../database/schema';
import type { AuthenticatedRequest, SessionPayload } from './auth.types';

const csrfCookieName = 'XSRF-TOKEN';

@Injectable()
export class SessionService {
  private readonly cookieName: string;
  private readonly cookieDomain?: string;
  private readonly sameSite: CookieOptions['sameSite'];
  private readonly secure: boolean;
  private readonly lifetimeMinutes: number;

  constructor(
    private readonly database: DatabaseService,
    config: ConfigService,
  ) {
    this.cookieName = config.get<string>('SESSION_COOKIE_NAME', 'nest_session');
    this.cookieDomain =
      config.get<string>('SESSION_COOKIE_DOMAIN')?.trim() || undefined;
    this.sameSite = config.get<CookieOptions['sameSite']>(
      'SESSION_SAME_SITE',
      'lax',
    );
    this.secure = config.get<boolean>('SESSION_SECURE_COOKIE', false);
    this.lifetimeMinutes = config.get<number>('SESSION_LIFETIME', 120);
  }

  async bootstrap(request: AuthenticatedRequest, response: Response) {
    const existing = await this.fromRequest(request);
    if (existing) {
      this.setCookies(response, existing.id, existing.payload.csrfToken);
      return;
    }

    const session = await this.create(null, request);
    this.setCookies(response, session.id, session.payload.csrfToken);
  }

  async fromRequest(request: Pick<AuthenticatedRequest, 'headers'>) {
    const id = this.readCookie(request.headers.cookie, this.cookieName);
    if (!id) return null;

    const [session] = await this.database.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    if (!session) return null;
    const now = Math.floor(Date.now() / 1000);
    let payload: SessionPayload;
    try {
      payload = JSON.parse(session.payload) as SessionPayload;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      await this.database.db.delete(sessions).where(eq(sessions.id, id));
      return null;
    }

    const lifetime = payload.remember ? 30 * 24 * 60 : this.lifetimeMinutes;
    if (session.lastActivity < now - lifetime * 60) {
      await this.database.db.delete(sessions).where(eq(sessions.id, id));
      return null;
    }

    if (
      typeof payload.csrfToken !== 'string' ||
      (payload.remember !== undefined && typeof payload.remember !== 'boolean')
    ) {
      await this.database.db.delete(sessions).where(eq(sessions.id, id));
      return null;
    }

    await this.database.db
      .update(sessions)
      .set({ lastActivity: now })
      .where(eq(sessions.id, id));

    return { id, userId: session.userId, payload };
  }

  async create(
    userId: number | null,
    request: AuthenticatedRequest,
    remember = false,
  ) {
    const id = randomBytes(32).toString('hex');
    const csrfToken = randomBytes(32).toString('hex');
    const payload: SessionPayload = {
      csrfToken,
      ...(remember ? { remember: true } : {}),
    };
    const now = Math.floor(Date.now() / 1000);

    await this.database.db.insert(sessions).values({
      id,
      userId,
      ipAddress: request.ip?.slice(0, 45) ?? null,
      userAgent: this.headerValue(request.headers['user-agent']),
      payload: JSON.stringify(payload),
      lastActivity: now,
    });

    return { id, payload, remember };
  }

  async authenticate(
    request: AuthenticatedRequest,
    response: Response,
    userId: number,
    remember = false,
  ) {
    const existing = await this.fromRequest(request);
    if (existing) {
      await this.database.db
        .delete(sessions)
        .where(eq(sessions.id, existing.id));
    }

    const session = await this.create(userId, request, remember);
    this.setCookies(
      response,
      session.id,
      session.payload.csrfToken,
      session.remember,
    );
  }

  async destroy(request: AuthenticatedRequest, response: Response) {
    const session = await this.fromRequest(request);
    if (session) {
      await this.database.db
        .delete(sessions)
        .where(eq(sessions.id, session.id));
    }

    response.clearCookie(this.cookieName, this.cookieOptions());
    response.clearCookie(csrfCookieName, this.csrfCookieOptions());
  }

  issueCookies(
    response: Response,
    id: string,
    csrfToken: string,
    remember = false,
  ) {
    this.setCookies(response, id, csrfToken, remember);
  }

  isValidCsrf(request: AuthenticatedRequest) {
    const session = request.authSession;
    const cookie = this.readCookie(request.headers.cookie, csrfCookieName);
    const header = request.headers['x-xsrf-token'];
    return (
      session !== undefined &&
      cookie !== null &&
      typeof header === 'string' &&
      this.constantTimeEqual(cookie, session.payload.csrfToken) &&
      this.constantTimeEqual(header, session.payload.csrfToken)
    );
  }

  private setCookies(
    response: Response,
    id: string,
    csrfToken: string,
    remember = false,
  ) {
    const maxAge = remember ? 30 * 24 * 60 * 60 * 1000 : undefined;
    response.cookie(this.cookieName, id, {
      ...this.cookieOptions(),
      maxAge,
      httpOnly: true,
    });
    response.cookie(csrfCookieName, csrfToken, {
      ...this.csrfCookieOptions(),
      maxAge,
    });
  }

  private cookieOptions(): CookieOptions {
    return {
      path: '/',
      ...(this.cookieDomain ? { domain: this.cookieDomain } : {}),
      sameSite: this.sameSite,
      secure: this.secure,
    };
  }

  private csrfCookieOptions(): CookieOptions {
    return { ...this.cookieOptions(), httpOnly: false };
  }

  private readCookie(header: string | undefined, name: string) {
    if (!header) return null;
    const prefix = `${name}=`;
    for (const part of header.split(';')) {
      const cookie = part.trim();
      if (!cookie.startsWith(prefix)) continue;
      try {
        return decodeURIComponent(cookie.slice(prefix.length));
      } catch {
        return null;
      }
    }
    return null;
  }

  private headerValue(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value[0]?.slice(0, 1000) ?? null;
    return value?.slice(0, 1000) ?? null;
  }

  private constantTimeEqual(left: string, right: string) {
    const leftBytes = Buffer.from(left);
    const rightBytes = Buffer.from(right);
    return (
      leftBytes.length === rightBytes.length &&
      timingSafeEqual(leftBytes, rightBytes)
    );
  }
}
