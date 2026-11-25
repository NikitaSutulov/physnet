import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import type { Env } from './config/env.js';
import { CorsIoAdapter } from './realtime/cors-io.adapter.js';
import { setupSwagger, SWAGGER_PATH } from './swagger.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix('api');
  const origins = config.get('CORS_ORIGIN', { infer: true }).split(',');
  app.enableCors({ origin: origins, credentials: true });
  app.useWebSocketAdapter(new CorsIoAdapter(app, origins));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  setupSwagger(app);

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(
    `API docs on http://localhost:${port}/${SWAGGER_PATH}`,
    'Bootstrap',
  );
}
await bootstrap();
