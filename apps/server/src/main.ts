import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app.module';

function resolveCorsOrigin(): string[] | false {
  const configuredOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  // No explicit allowlist: default to the local storefront in development,
  // and fail closed (no cross-origin access) in production rather than reflecting any origin.
  return process.env.NODE_ENV === 'production' ? false : ['http://localhost:3500'];
}

async function bootstrap() {
  const appOptions = {
    cors: {
      origin: resolveCorsOrigin(),
      credentials: true,
    },
  };
  const serverPort = process.env.PORT || 5001;
  const app = await NestFactory.create(AppModule, appOptions);

  app.use(helmet());
  app.setGlobalPrefix('api');

  await app.listen(serverPort);
}
bootstrap();
