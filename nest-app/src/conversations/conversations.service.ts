import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, count, desc, eq, gt, max, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DatabaseService } from '../database/database.service';
import {
  conversationDeletions,
  conversations,
  userBlocks,
} from '../database/conversations.schema';
import { users } from '../database/users.schema';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import type { MessageCreatedEvent } from '../realtime/realtime.types';
import {
  createPaginatedResponse,
  resolvePaginationOptions,
} from '../common/pagination';

const senderTable = alias(users, 'sender');
const receiverTable = alias(users, 'receiver');

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async history(
    currentUserId: number,
    partnerId: number,
    query: { per_page?: number; page?: number },
  ) {
    const [deletion] = await this.database.db
      .select({
        deletedThroughMessageId: conversationDeletions.deletedThroughMessageId,
      })
      .from(conversationDeletions)
      .where(
        and(
          eq(conversationDeletions.userId, currentUserId),
          eq(conversationDeletions.partnerId, partnerId),
        ),
      )
      .limit(1);

    const conditions = [
      or(
        and(
          eq(conversations.senderId, currentUserId),
          eq(conversations.receiverId, partnerId),
        ),
        and(
          eq(conversations.senderId, partnerId),
          eq(conversations.receiverId, currentUserId),
        ),
      )!,
    ];
    if (
      deletion?.deletedThroughMessageId !== null &&
      deletion?.deletedThroughMessageId !== undefined
    ) {
      conditions.push(gt(conversations.id, deletion.deletedThroughMessageId));
    }
    const where = and(...conditions);
    const { page: currentPage, perPage: pageSize } = resolvePaginationOptions(
      query,
      100,
    );
    const [{ total }] = await this.database.db
      .select({ total: count() })
      .from(conversations)
      .where(where);
    const totalRows = Number(total);

    const descendingRows = await this.database.db
      .select({
        id: conversations.id,
        senderId: conversations.senderId,
        receiverId: conversations.receiverId,
        message: conversations.message,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        sender: {
          id: senderTable.id,
          name: senderTable.name,
          email: senderTable.email,
          emailVerifiedAt: senderTable.emailVerifiedAt,
          createdAt: senderTable.createdAt,
          updatedAt: senderTable.updatedAt,
        },
        receiver: {
          id: receiverTable.id,
          name: receiverTable.name,
          email: receiverTable.email,
          emailVerifiedAt: receiverTable.emailVerifiedAt,
          createdAt: receiverTable.createdAt,
          updatedAt: receiverTable.updatedAt,
        },
      })
      .from(conversations)
      .leftJoin(senderTable, eq(conversations.senderId, senderTable.id))
      .leftJoin(receiverTable, eq(conversations.receiverId, receiverTable.id))
      .where(where)
      .orderBy(desc(conversations.id))
      .limit(pageSize)
      .offset((currentPage - 1) * pageSize);

    const rows = descendingRows.reverse().map((row) => ({
      id: row.id,
      message: row.message,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      sender: row.sender ? publicUser(row.sender) : null,
      receiver: row.receiver ? publicUser(row.receiver) : null,
      is_mine: row.senderId === currentUserId,
    }));
    return createPaginatedResponse(rows, {
      page: currentPage,
      perPage: pageSize,
      total: totalRows,
    });
  }

  async sendMessage(senderId: number, receiverId: number, message: string) {
    const receiver = await this.findUser(receiverId);
    if (senderId === receiver.id) {
      throw new UnprocessableEntityException('You cannot message yourself.');
    }

    const [block] = await this.database.db
      .select({ id: userBlocks.id })
      .from(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, receiverId),
          eq(userBlocks.blockedId, senderId),
        ),
      )
      .limit(1);
    if (block) {
      throw new ForbiddenException('You cannot message this user.');
    }

    const now = new Date();
    const [conversation] = await this.database.db
      .insert(conversations)
      .values({
        senderId,
        receiverId,
        message,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (!conversation) {
      throw new Error('Conversation insert completed without a message row.');
    }
    const event: MessageCreatedEvent = {
      id: conversation.id,
      sender_id: conversation.senderId,
      receiver_id: conversation.receiverId,
      created_at: (conversation.createdAt ?? now).toISOString(),
    };
    try {
      this.realtime.notifyMessageCreated(event);
    } catch (error) {
      this.logger.error(
        `Message ${conversation.id} was saved but its realtime notification failed.`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return {
      id: conversation.id,
      message: conversation.message,
      created_at: conversation.createdAt,
      updated_at: conversation.updatedAt,
    };
  }

  async deleteHistory(currentUserId: number, partnerId: number) {
    const partner = await this.findUser(partnerId);
    if (partner.id === currentUserId) {
      throw new UnprocessableEntityException(
        'You cannot delete a conversation with yourself.',
      );
    }

    const [{ latestMessageId }] = await this.database.db
      .select({ latestMessageId: max(conversations.id) })
      .from(conversations)
      .where(
        or(
          and(
            eq(conversations.senderId, currentUserId),
            eq(conversations.receiverId, partnerId),
          ),
          and(
            eq(conversations.senderId, partnerId),
            eq(conversations.receiverId, currentUserId),
          ),
        ),
      );
    const now = new Date();
    await this.database.db
      .insert(conversationDeletions)
      .values({
        userId: currentUserId,
        partnerId,
        deletedThroughMessageId: latestMessageId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [conversationDeletions.userId, conversationDeletions.partnerId],
        set: {
          deletedThroughMessageId: latestMessageId,
          updatedAt: now,
        },
      });

    return { message: 'Conversation deleted.' };
  }

  private async findUser(id: number) {
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!user) throw new NotFoundException();
    return user;
  }
}

function publicUser(user: {
  id: number;
  name: string;
  email: string;
  emailVerifiedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    email_verified_at: user.emailVerifiedAt,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}
