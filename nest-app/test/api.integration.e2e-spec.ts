import { type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { and, eq, inArray } from 'drizzle-orm';
import type { Server as HttpServer } from 'node:http';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { getCorsOrigins } from '../src/common/cors-origins';
import { DatabaseService } from '../src/database/database.service';
import { personalAccessTokens, sessions } from '../src/database/schema';
import { users } from '../src/database/users.schema';
import { ConfiguredIoAdapter } from '../src/realtime/configured-io.adapter';
import type { MessageCreatedEvent } from '../src/realtime/realtime.types';
import { createApiValidationPipe } from '../src/validation.pipe';

interface BrowserSession {
  cookie: string;
  csrfToken: string;
}

describe('Nest API with isolated PostgreSQL (e2e)', () => {
  let app: INestApplication<App> | undefined;
  let database: DatabaseService | undefined;
  const createdUserIds: number[] = [];

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useWebSocketAdapter(
      new ConfiguredIoAdapter(app, getCorsOrigins(app.get(ConfigService))),
    );
    app.useGlobalPipes(createApiValidationPipe());
    await app.listen(0, '127.0.0.1');
    database = app.get(DatabaseService);
  });

  afterAll(async () => {
    if (database && createdUserIds.length > 0) {
      await database.db
        .delete(sessions)
        .where(inArray(sessions.userId, createdUserIds));
      await database.db
        .delete(personalAccessTokens)
        .where(
          and(
            eq(personalAccessTokens.tokenableType, 'App\\Models\\User'),
            inArray(personalAccessTokens.tokenableId, createdUserIds),
          ),
        );
      await database.db.delete(users).where(inArray(users.id, createdUserIds));
    }
    await app?.close();
  });

  it('disconnects socket clients without a valid session', async () => {
    const socket = createSocket();
    const disconnected = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Unauthenticated socket stayed connected.')),
        3000,
      );
      socket.once('disconnect', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    socket.connect();
    await disconnected;
    expect(socket.connected).toBe(false);
    socket.disconnect();
  });

  it('registers users and exercises session, CSRF, search, blocking, messages, deletion, and bearer auth', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const firstEmail = `first-${suffix}@integration.test`;
    const secondEmail = `second-${suffix}@integration.test`;
    const password = 'integration-password';

    const firstSession = await register(firstEmail, 'First User', password);
    const firstUser = await currentUser(firstSession);
    createdUserIds.push(firstUser.id);

    const secondSession = await register(secondEmail, 'Second User', password);
    const secondUser = await currentUser(secondSession);
    createdUserIds.push(secondUser.id);

    const listedUsers = await request(server())
      .get('/api/users?search=Second&per_page=10')
      .set('Cookie', firstSession.cookie)
      .expect(200);
    const userList = listedUsers.body as {
      total: number;
      data: Array<Record<string, unknown>>;
    };
    expect(Object.keys(userList).sort()).toEqual(
      [
        'current_page',
        'data',
        'from',
        'last_page',
        'per_page',
        'to',
        'total',
      ].sort(),
    );
    expect(userList.total).toBe(1);
    expect(userList.data[0]).toMatchObject({
      id: secondUser.id,
      name: 'Second User',
    });
    expect(userList.data[0]?.email).toBeUndefined();

    await request(server())
      .post(`/api/blocks/${secondUser.id}`)
      .set('Cookie', firstSession.cookie)
      .expect(419);

    await request(server())
      .post(`/api/blocks/${secondUser.id}`)
      .set('Cookie', firstSession.cookie)
      .set('X-XSRF-TOKEN', firstSession.csrfToken)
      .expect(200)
      .expect({ message: 'User blocked.' });

    await request(server())
      .get(`/api/users/${secondUser.id}`)
      .set('Cookie', firstSession.cookie)
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          is_blocked_by_me: boolean;
          is_blocking_me: boolean;
        };
        expect(body.is_blocked_by_me).toBe(true);
        expect(body.is_blocking_me).toBe(false);
      });

    const recipientSocket = await connectSocket(secondSession.cookie);
    try {
      const event = new Promise<MessageCreatedEvent>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Timed out waiting for message.created.')),
          3000,
        );
        recipientSocket.once(
          'message.created',
          (payload: MessageCreatedEvent) => {
            clearTimeout(timeout);
            resolve(payload);
          },
        );
      });

      const sentMessage = await request(server())
        .post(`/api/conversations/${secondUser.id}`)
        .set('Cookie', firstSession.cookie)
        .set('X-XSRF-TOKEN', firstSession.csrfToken)
        .send({ message: 'First message' })
        .expect(201);
      expect((sentMessage.body as { message: string }).message).toBe(
        'First message',
      );
      await expect(event).resolves.toMatchObject({
        id: (sentMessage.body as { id: number }).id,
        sender_id: firstUser.id,
        receiver_id: secondUser.id,
      });
    } finally {
      recipientSocket.disconnect();
    }

    await request(server())
      .post(`/api/conversations/${firstUser.id}`)
      .set('Cookie', secondSession.cookie)
      .set('X-XSRF-TOKEN', secondSession.csrfToken)
      .send({ message: 'Blocked reply' })
      .expect(403);

    await request(server())
      .delete(`/api/blocks/${secondUser.id}`)
      .set('Cookie', firstSession.cookie)
      .set('X-XSRF-TOKEN', firstSession.csrfToken)
      .expect(200)
      .expect({ message: 'User unblocked.' });

    await request(server())
      .post(`/api/conversations/${firstUser.id}`)
      .set('Cookie', secondSession.cookie)
      .set('X-XSRF-TOKEN', secondSession.csrfToken)
      .send({ message: 'Second message' })
      .expect(201);

    const firstHistory = await request(server())
      .get(`/api/conversations/${secondUser.id}`)
      .set('Cookie', firstSession.cookie)
      .expect(200);
    const history = firstHistory.body as {
      total: number;
      data: Array<{
        message: string;
        sender: { id: number };
        is_mine: boolean;
      }>;
    };
    expect(Object.keys(history).sort()).toEqual(
      [
        'current_page',
        'data',
        'from',
        'last_page',
        'per_page',
        'to',
        'total',
      ].sort(),
    );
    expect(history.total).toBe(2);
    expect(history.data.map((message) => message.message)).toEqual([
      'First message',
      'Second message',
    ]);
    expect(history.data[0]?.sender.id).toBe(firstUser.id);
    expect(history.data[0]?.is_mine).toBe(true);

    await request(server())
      .delete(`/api/conversations/${secondUser.id}`)
      .set('Cookie', firstSession.cookie)
      .set('X-XSRF-TOKEN', firstSession.csrfToken)
      .expect(200)
      .expect({ message: 'Conversation deleted.' });

    await request(server())
      .get(`/api/conversations/${secondUser.id}`)
      .set('Cookie', firstSession.cookie)
      .expect(200)
      .expect((response) => {
        expect((response.body as { total: number }).total).toBe(0);
      });

    await request(server())
      .get(`/api/conversations/${firstUser.id}`)
      .set('Cookie', secondSession.cookie)
      .expect(200)
      .expect((response) => {
        expect((response.body as { total: number }).total).toBe(2);
      });

    const tokenResponse = await request(server())
      .post('/api/tokens')
      .send({
        email: firstEmail,
        password,
        device_name: 'integration-test',
      })
      .expect(201);
    const token = (tokenResponse.body as { token: string }).token;
    await request(server())
      .get('/api/user')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect((response.body as { id: number }).id).toBe(firstUser.id);
      });

    const tokenId = Number(token.split('|', 1)[0]);
    await database.db
      .update(personalAccessTokens)
      .set({ expiresAt: new Date(Date.now() - 1_000) })
      .where(eq(personalAccessTokens.id, tokenId));
    await request(server())
      .get('/api/user')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    const loginCsrfResponse = await request(server())
      .get('/csrf-cookie')
      .expect(204);
    const loginBootstrap = readSession(loginCsrfResponse.headers['set-cookie']);
    const loginResponse = await request(server())
      .post('/login')
      .set('Cookie', loginBootstrap.cookie)
      .set('X-XSRF-TOKEN', loginBootstrap.csrfToken)
      .send({ email: firstEmail, password })
      .expect(200);
    const loginSession = readSession(loginResponse.headers['set-cookie']);
    await request(server())
      .get('/api/user')
      .set('Cookie', loginSession.cookie)
      .expect(200)
      .expect((response) => {
        expect((response.body as { id: number }).id).toBe(firstUser.id);
      });

    await request(server())
      .post('/logout')
      .set('Cookie', loginSession.cookie)
      .set('X-XSRF-TOKEN', loginSession.csrfToken)
      .expect(204);

    await request(server())
      .get('/api/user')
      .set('Cookie', loginSession.cookie)
      .expect(401);
  });

  async function register(email: string, name: string, password: string) {
    const csrfResponse = await request(server())
      .get('/csrf-cookie')
      .expect(204);
    const initialSession = readSession(csrfResponse.headers['set-cookie']);

    const registration = await request(server())
      .post('/register')
      .set('Cookie', initialSession.cookie)
      .set('X-XSRF-TOKEN', initialSession.csrfToken)
      .send({
        name,
        email,
        password,
        password_confirmation: password,
      })
      .expect(201);

    return readSession(registration.headers['set-cookie']);
  }

  async function currentUser(session: BrowserSession) {
    const response = await request(server())
      .get('/api/user')
      .set('Cookie', session.cookie)
      .expect(200);
    return response.body as { id: number; email: string; name: string };
  }

  function readSession(setCookie: string[] | undefined): BrowserSession {
    if (!setCookie)
      throw new Error('Expected the API to issue session cookies.');
    const cookies = setCookie.map((value) => value.split(';', 1)[0]);
    const sessionCookie = cookies.find((value) =>
      value.startsWith('nest_session='),
    );
    const csrfCookie = cookies.find((value) => value.startsWith('XSRF-TOKEN='));
    if (!sessionCookie || !csrfCookie) {
      throw new Error('Expected both session and CSRF cookies.');
    }
    return {
      cookie: cookies.join('; '),
      csrfToken: decodeURIComponent(csrfCookie.slice('XSRF-TOKEN='.length)),
    };
  }

  function server() {
    if (!app) throw new Error('Nest application has not been initialized.');
    return app.getHttpServer();
  }

  async function connectSocket(cookie: string): Promise<Socket> {
    const socket = createSocket(cookie);

    return new Promise((resolve, reject) => {
      const onConnect = () => {
        socket.off('connect_error', onError);
        resolve(socket);
      };
      const onError = (error: Error) => {
        socket.off('connect', onConnect);
        socket.disconnect();
        reject(error);
      };
      socket.once('connect', onConnect);
      socket.once('connect_error', onError);
      socket.connect();
    });
  }

  function createSocket(cookie?: string): Socket {
    const address = (server() as HttpServer).address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected Nest HTTP server to listen on a TCP port.');
    }
    return io(`http://127.0.0.1:${address.port}`, {
      autoConnect: false,
      reconnection: false,
      timeout: 3000,
      transports: ['websocket'],
      extraHeaders: {
        ...(cookie ? { Cookie: cookie } : {}),
        Origin: 'http://localhost:3000',
      },
    });
  }
});
