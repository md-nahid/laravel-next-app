import { Injectable, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import type { AuthIdentity } from '../auth/auth.types';
import type { MessageCreatedEvent } from './realtime.types';

@Injectable()
@WebSocketGateway()
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly auth: AuthService) {}

  async handleConnection(client: Socket) {
    let identity: AuthIdentity | null;
    try {
      identity = await this.auth.resolveIdentity(client.request);
    } catch (error) {
      this.logger.error(
        'Socket authentication failed.',
        error instanceof Error ? error.stack : String(error),
      );
      client.disconnect(true);
      return;
    }

    if (!identity) {
      client.disconnect(true);
      return;
    }

    await client.join(`user:${identity.user.id}`);
  }

  notifyMessageCreated(event: MessageCreatedEvent) {
    this.server.to(`user:${event.receiver_id}`).emit('message.created', event);
  }
}
