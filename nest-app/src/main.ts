import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getCorsOrigins } from './common/cors-origins';
import { ConfiguredIoAdapter } from './realtime/configured-io.adapter';
import { createApiValidationPipe } from './validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ json: true }),
  });
  const config = app.get(ConfigService);
  const origins = getCorsOrigins(config);
  app.enableCors({
    origin: origins,
    credentials: true,
  });
  app.useWebSocketAdapter(new ConfiguredIoAdapter(app, origins));
  app.useGlobalPipes(createApiValidationPipe());
  await app.listen(config.get<number>('PORT', 3001), '0.0.0.0');
}

void bootstrap();
