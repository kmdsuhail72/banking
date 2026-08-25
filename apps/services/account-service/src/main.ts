import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appConfig } from '@banking/config';
import { createLogger } from '@banking/logger';

async function bootstrap() {
  const logger = createLogger('AccountService');
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  const port = appConfig.ports.account || 4003;
  await app.listen(port);
  logger.info('🏦 AccountService running on http://localhost:' + port);
}

bootstrap();
