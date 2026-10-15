import { Module } from '@nestjs/common';
import { AuthController, TokenController } from './auth.controller';
import { AuthGuard, CsrfGuard } from './auth.guards';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

@Module({
  controllers: [AuthController, TokenController],
  providers: [AuthService, SessionService, AuthGuard, CsrfGuard],
  exports: [AuthGuard, AuthService, CsrfGuard, SessionService],
})
export class AuthModule {}
