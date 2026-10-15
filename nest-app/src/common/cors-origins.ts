import type { ConfigService } from '@nestjs/config';

export function getCorsOrigins(config: ConfigService): string[] {
  return config
    .getOrThrow<string>('CORS_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
