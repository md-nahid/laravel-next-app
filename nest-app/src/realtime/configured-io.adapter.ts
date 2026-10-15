import type { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { IncomingMessage } from 'node:http';
import type { Server, ServerOptions } from 'socket.io';

export class ConfiguredIoAdapter extends IoAdapter {
  constructor(
    app: INestApplication,
    private readonly allowedOrigins: string[],
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    return super.createIOServer(port, {
      ...options,
      cors: {
        ...options?.cors,
        origin: this.allowedOrigins,
        credentials: true,
      },
      allowRequest: (
        request: IncomingMessage,
        callback: (error: string | null | undefined, success: boolean) => void,
      ) => {
        const origin = request.headers.origin;
        callback(
          null,
          typeof origin === 'string' && this.allowedOrigins.includes(origin),
        );
      },
    }) as Server;
  }
}
