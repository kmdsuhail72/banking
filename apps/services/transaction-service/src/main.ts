import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appConfig } from '@banking/config';
import { createLogger } from '@banking/logger';

async function bootstrap() {
  const logger = createLogger('TransactionService');
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  const port = appConfig.ports.transaction || 4004;
  await app.listen(port);
  logger.info('💸 TransactionService running on http://localhost:' + port);
}

bootstrap();
