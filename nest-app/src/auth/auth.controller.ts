import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { LoginDto, RegisterDto, StoreTokenDto } from './auth.dto';
import { AuthGuard, CsrfGuard } from './auth.guards';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';
import { SessionService } from './session.service';

@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Get('csrf-cookie')
  @HttpCode(HttpStatus.NO_CONTENT)
  async csrfCookie(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.sessions.bootstrap(request, response);
  }

  @Post('register')
  @UseGuards(CsrfGuard)
  async register(
    @Body() body: RegisterDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.register(body, request, response);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  async login(
    @Body() body: LoginDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.auth.login(body, request, response);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard, CsrfGuard)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (request.authType !== 'session') throw new UnauthorizedException();
    await this.sessions.destroy(request, response);
  }
}

@Controller('api/tokens')
export class TokenController {
  constructor(private readonly auth: AuthService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: StoreTokenDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.auth.issueToken(body, request);
  }
}
