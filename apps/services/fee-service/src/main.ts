import { startTelemetry, installMetrics, installTelemetryShutdown } from '@banking/observability';
startTelemetry('fee-service');
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import { createLogger } from '@banking/logger';
import { DEFAULT_GRPC_PORTS, GRPC_PACKAGES } from '@banking/grpc';

async function bootstrap() {
  const logger = createLogger('FeeService');
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      url: `0.0.0.0:${DEFAULT_GRPC_PORTS.FEE}`,
      package: GRPC_PACKAGES.FEE,
      protoPath: join(__dirname, '../../../../packages/grpc/proto/fee.proto'),
    },
  });

  installMetrics(app, 'fee-service');
  installTelemetryShutdown(app);
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/(.*)'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.startAllMicroservices();
  const port = parseInt(process.env.PORT || '4026', 10);
  await app.listen(port);
  logger.info(`Fee Service  HTTP :${port}  gRPC :${DEFAULT_GRPC_PORTS.FEE});
}

bootstrap();
