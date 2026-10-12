import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, asc, count, eq, ilike, ne, or } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { userBlocks } from '../database/conversations.schema';
import { users } from '../database/users.schema';
import {
  createPaginatedResponse,
  resolvePaginationOptions,
} from '../common/pagination';

@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService) {}

  async list(
    currentUserId: number,
    query: {
      search?: string;
      per_page?: number;
      pagination?: string;
      page?: number;
    },
  ) {
    const conditions = [notSelf(currentUserId)];
    
    const where = and(...conditions);
    const {
      page,
      perPage,
      isPagination,
    } = resolvePaginationOptions(query, 10);

    if (!isPagination) {
      const rows = await this.database.db
        .select()
        .from(users)
        .where(where)
        .orderBy(asc(users.id));
      return rows.map(publicListUser);
    }

    const [{ total  }] = await this.database.db
      .select({ total: count() })
      .from(users)
      .where(where);
    
    const data = await this.database.db
      .select()
      .from(users)
      .where(where)
      .orderBy(asc(users.id))
      .limit(perPage)
      .offset((page - 1) * perPage);

    return createPaginatedResponse(data.map(publicListUser), {
      page,
      perPage,
      total,
    });
  }

  async detail(currentUserId: number, targetId: number) {
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1);
    if (!user) throw new NotFoundException();

    const [blockedByMe] = await this.database.db
      .select({ id: userBlocks.id })
      .from(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, currentUserId),
          eq(userBlocks.blockedId, targetId),
        ),
      )
      .limit(1);
    const [blockingMe] = await this.database.db
      .select({ id: userBlocks.id })
      .from(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, targetId),
          eq(userBlocks.blockedId, currentUserId),
        ),
      )
      .limit(1);

    return {
      ...publicUser(user),
      is_blocked_by_me: Boolean(blockedByMe),
      is_blocking_me: Boolean(blockingMe),
    };
  }

  async block(currentUserId: number, targetId: number) {
    const target = await this.findTarget(targetId);
    if (target.id === currentUserId) {
      throw new UnprocessableEntityException('You cannot block yourself.');
    }

    await this.database.db
      .insert(userBlocks)
      .values({ blockerId: currentUserId, blockedId: targetId })
      .onConflictDoNothing();
    return { message: 'User blocked.' };
  }

  async unblock(_currentUserId: number, targetId: number) {
    await this.findTarget(targetId);
    await this.database.db
      .delete(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, _currentUserId),
          eq(userBlocks.blockedId, targetId),
        ),
      );
    return { message: 'User unblocked.' };
  }

  async findTarget(id: number) {
    const [target] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!target) throw new NotFoundException();
    return target;
  }
}

function notSelf(currentUserId: number) {
  return ne(users.id, currentUserId);
}

function publicListUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email_verified_at: user.emailVerifiedAt,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

function publicUser(user: typeof users.$inferSelect) {
  return {
    ...publicListUser(user),
    email: user.email,
  };
}
