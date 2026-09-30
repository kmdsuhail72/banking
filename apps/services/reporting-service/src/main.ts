import { startTelemetry, installMetrics, installTelemetryShutdown } from '@banking/observability';
startTelemetry('reporting-service');
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import { createLogger } from '@banking/logger';
import { DEFAULT_GRPC_PORTS, GRPC_PACKAGES } from '@banking/grpc';

async function bootstrap() {
  const logger = createLogger('ReportingService');
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      url: `0.0.0.0:${DEFAULT_GRPC_PORTS.REPORTING}`,
      package: GRPC_PACKAGES.REPORTING,
      protoPath: join(__dirname, '../../../../packages/grpc/proto/reporting.proto'),
    },
  });

  installMetrics(app, 'reporting-service');
  installTelemetryShutdown(app);
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/(.*)'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.startAllMicroservices();
  const port = parseInt(process.env.PORT || '4011', 10);
  await app.listen(port);
  logger.info(`Reporting Service  HTTP :${port}  gRPC :${DEFAULT_GRPC_PORTS.REPORTING});
}

bootstrap();
