import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appConfig } from '@banking/config';
import { createLogger } from '@banking/logger';

async function bootstrap() {
  const logger = createLogger('BeneficiaryService');
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  const port = appConfig.ports.beneficiary || 4008;
  await app.listen(port);
  logger.info('🤝 BeneficiaryService running on http://localhost:' + port);
}

bootstrap();
