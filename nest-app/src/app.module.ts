import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConversationsModule } from './conversations/conversations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().port().default(3001),
        DATABASE_URL: Joi.string()
          .uri({ scheme: ['postgres', 'postgresql'] })
          .required(),
        CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
        SESSION_COOKIE_NAME: Joi.string().default('nest_session'),
        SESSION_SAME_SITE: Joi.string()
          .valid('strict', 'lax', 'none')
          .default('lax'),
        SESSION_SECURE_COOKIE: Joi.boolean().default(false),
        SESSION_LIFETIME: Joi.number().integer().positive().default(120),
      }),
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ConversationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
