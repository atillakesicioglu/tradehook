import 'reflect-metadata';
// Load environment variables before any module that reads process.env.
import './load-env';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { loadConfig } from './config/configuration';
import { isAllowedOrigin } from './config/cors';

async function bootstrap() {
  // AppModule is imported dynamically so the env is loaded first.
  const { AppModule } = await import('./app.module');
  const config = loadConfig();
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(config.port);
  Logger.log(`API listening on ${config.apiUrl}`, 'Bootstrap');
  Logger.log(
    `Auth mode: ${config.devMockAuth ? 'DEV JWT' : 'Firebase'} | Mock trading: ${config.mockTrading}`,
    'Bootstrap',
  );
}

void bootstrap();
