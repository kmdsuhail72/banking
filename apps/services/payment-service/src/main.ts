import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appConfig } from '@banking/config';
import { createLogger } from '@banking/logger';

async function bootstrap() {
  const logger = createLogger('PaymentService');
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  const port = appConfig.ports.payment || 4006;
  await app.listen(port);
  logger.info('💳 PaymentService running on http://localhost:' + port);
}

bootstrap();
