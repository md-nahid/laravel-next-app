import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, CsrfGuard } from '../auth/auth.guards';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { ConversationQuery, CreateMessageDto } from './conversations.dto';
import { ConversationsService } from './conversations.service';

@Controller('api/conversations')
@UseGuards(AuthGuard, CsrfGuard)
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get(':partnerId')
  history(
    @Req() request: AuthenticatedRequest,
    @Param('partnerId', ParseIntPipe) partnerId: number,
    @Query() query: ConversationQuery,
  ) {
    return this.conversations.history(request.user!.id, partnerId, query);
  }

  @Post(':receiverId')
  sendMessage(
    @Req() request: AuthenticatedRequest,
    @Param('receiverId', ParseIntPipe) receiverId: number,
    @Body() body: CreateMessageDto,
  ) {
    return this.conversations.sendMessage(
      request.user!.id,
      receiverId,
      body.message,
    );
  }

  @Delete(':partnerId')
  deleteHistory(
    @Req() request: AuthenticatedRequest,
    @Param('partnerId', ParseIntPipe) partnerId: number,
  ) {
    return this.conversations.deleteHistory(request.user!.id, partnerId);
  }
}
