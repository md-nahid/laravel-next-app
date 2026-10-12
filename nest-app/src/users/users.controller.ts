import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, CsrfGuard } from '../auth/auth.guards';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { ListUsersQuery } from './users.dto';
import { UsersService } from './users.service';

@Controller('api')
@UseGuards(AuthGuard, CsrfGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('user')
  currentUser(@Req() request: AuthenticatedRequest) {
    return {
      id: request.user!.id,
      name: request.user!.name,
      email: request.user!.email,
      email_verified_at: request.user!.emailVerifiedAt,
      created_at: request.user!.createdAt,
      updated_at: request.user!.updatedAt,
    };
  }

  @Get('users')
  list(@Req() request: AuthenticatedRequest, @Query() query: ListUsersQuery) {
    return this.users.list(request.user!.id, query);
  }

  @Get('users/:id')
  detail(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.users.detail(request.user!.id, id);
  }

  @Post('blocks/:userId')
  @HttpCode(HttpStatus.OK)
  block(
    @Req() request: AuthenticatedRequest,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.users.block(request.user!.id, userId);
  }

  @Delete('blocks/:userId')
  unblock(
    @Req() request: AuthenticatedRequest,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.users.unblock(request.user!.id, userId);
  }
}
