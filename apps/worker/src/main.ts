import 'reflect-metadata';
import './load-env';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const { AppModule } = await import('./app.module');
  // No HTTP server: the worker is a standalone BullMQ consumer.
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();
  Logger.log('TradeHook worker started', 'Bootstrap');
}

void bootstrap();
