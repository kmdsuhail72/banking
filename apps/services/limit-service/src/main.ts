import { startTelemetry, installMetrics, installTelemetryShutdown } from '@banking/observability';
startTelemetry('limit-service');
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import { createLogger } from '@banking/logger';
import { DEFAULT_GRPC_PORTS, GRPC_PACKAGES } from '@banking/grpc';

async function bootstrap() {
  const logger = createLogger('LimitService');
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      url: `0.0.0.0:${DEFAULT_GRPC_PORTS.LIMIT}`,
      package: GRPC_PACKAGES.LIMIT,
      protoPath: join(__dirname, '../../../../packages/grpc/proto/limit.proto'),
    },
  });

  installMetrics(app, 'limit-service');
  installTelemetryShutdown(app);
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/(.*)'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.startAllMicroservices();
  const port = parseInt(process.env.PORT || '4021', 10);
  await app.listen(port);
  logger.info(`Limit Service  HTTP :${port}  gRPC :${DEFAULT_GRPC_PORTS.LIMIT});
}

bootstrap();
