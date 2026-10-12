import { INestApplication, type ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthGuard, CsrfGuard } from '../src/auth/auth.guards';
import { AuthService } from '../src/auth/auth.service';
import type { AuthenticatedRequest } from '../src/auth/auth.types';
import { SessionService } from '../src/auth/session.service';
import { ConversationsService } from '../src/conversations/conversations.service';
import { DatabaseService } from '../src/database/database.service';
import { UsersService } from '../src/users/users.service';
import { createApiValidationPipe } from '../src/validation.pipe';

describe('Nest API (e2e)', () => {
  let app: INestApplication<App>;
  const currentUser = {
    id: 42,
    name: 'Test User',
    email: 'test@example.com',
    emailVerifiedAt: null,
    password: 'not-returned',
    rememberToken: null,
    twoFactorSecret: null,
    twoFactorRecoveryCodes: null,
    twoFactorConfirmedAt: null,
    createdAt: null,
    updatedAt: null,
  };
  const authMock = {
    register: jest.fn().mockResolvedValue(undefined),
    login: jest.fn().mockResolvedValue(undefined),
    issueToken: jest
      .fn()
      .mockResolvedValue({ token: '1|secret', token_type: 'Bearer' }),
  };
  const sessionMock = {
    bootstrap: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  };
  const usersMock = {
    list: jest.fn().mockResolvedValue({
      current_page: 1,
      data: [{ id: 7, name: 'Alice' }],
      total: 1,
    }),
    detail: jest.fn().mockResolvedValue({
      id: 7,
      name: 'Alice',
      is_blocked_by_me: false,
      is_blocking_me: false,
    }),
    block: jest.fn().mockResolvedValue({ message: 'User blocked.' }),
    unblock: jest.fn().mockResolvedValue({ message: 'User unblocked.' }),
  };
  const conversationsMock = {
    history: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    sendMessage: jest.fn().mockResolvedValue({
      id: 1,
      message: 'Hello',
      created_at: null,
      updated_at: null,
    }),
    deleteHistory: jest
      .fn()
      .mockResolvedValue({ message: 'Conversation deleted.' }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({})
      .overrideProvider(AuthService)
      .useValue(authMock)
      .overrideProvider(SessionService)
      .useValue(sessionMock)
      .overrideProvider(UsersService)
      .useValue(usersMock)
      .overrideProvider(ConversationsService)
      .useValue(conversationsMock)
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context
            .switchToHttp()
            .getRequest<AuthenticatedRequest>();
          request.user = currentUser;
          request.authType = 'session';
          request.authSession = {
            id: 'test-session',
            payload: { csrfToken: 'test-csrf-token' },
          };
          return true;
        },
      })
      .overrideGuard(CsrfGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(createApiValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / returns service status', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect({
      application: 'nest-app',
      status: 'ok',
    });
  });

  it('GET /up returns health status', () => {
    return request(app.getHttpServer())
      .get('/up')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /api/user returns the authenticated public profile', () => {
    return request(app.getHttpServer())
      .get('/api/user')
      .expect(200)
      .expect((response) => {
        const body = response.body as Record<string, unknown>;
        expect(body).toMatchObject({
          id: 42,
          name: 'Test User',
          email: 'test@example.com',
        });
        expect(body.password).toBeUndefined();
      });
  });

  it('GET /api/users forwards the authenticated identity and search filters', () => {
    return request(app.getHttpServer())
      .get('/api/users?search=Alice&per_page=5')
      .expect(200)
      .expect({ current_page: 1, data: [{ id: 7, name: 'Alice' }], total: 1 })
      .then(() => {
        expect(usersMock.list).toHaveBeenCalledWith(
          42,
          expect.objectContaining({ search: 'Alice', per_page: 5 }),
        );
      });
  });

  it('POST /login authenticates with the session-based flow', () => {
    return request(app.getHttpServer())
      .post('/login')
      .send({ email: 'test@example.com', password: 'password' })
      .expect(200);
  });

  it('returns Laravel-style validation errors for invalid message input', () => {
    return request(app.getHttpServer())
      .post('/api/conversations/7')
      .send({ message: '' })
      .expect(422)
      .expect((response) => {
        const body = response.body as {
          message?: string;
          errors?: Record<string, unknown>;
        };
        expect(body.message).toBe('The given data was invalid.');
        expect(body.errors?.message).toBeDefined();
      });
  });

  it('POST /api/tokens returns a bearer token', () => {
    return request(app.getHttpServer())
      .post('/api/tokens')
      .send({
        email: 'test@example.com',
        password: 'password',
        device_name: 'test',
      })
      .expect(201)
      .expect({ token: '1|secret', token_type: 'Bearer' });
  });

  it('POST /api/conversations/:receiverId returns a created message', () => {
    return request(app.getHttpServer())
      .post('/api/conversations/7')
      .send({ message: 'Hello' })
      .expect(201)
      .expect((response) => {
        expect(response.body as Record<string, unknown>).toMatchObject({
          message: 'Hello',
        });
      });
  });
});
