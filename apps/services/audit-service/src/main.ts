import {
  startTelemetry,
  installMetrics,
  installTelemetryShutdown,
} from "@banking/observability";
startTelemetry("audit-service");
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { join } from "path";
import { AppModule } from "./app.module";
import { createLogger } from "@banking/logger";
import { DEFAULT_GRPC_PORTS, GRPC_PACKAGES } from "@banking/grpc";

async function bootstrap() {
  const logger = createLogger("AuditService");
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      url: `0.0.0.0:${DEFAULT_GRPC_PORTS.AUDIT}`,
      package: GRPC_PACKAGES.AUDIT,
      protoPath: join(__dirname, "../../../../packages/grpc/proto/audit.proto"),
    },
  });

  installMetrics(app, "audit-service");
  installTelemetryShutdown(app);
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix("api/v1", { exclude: ["health", "health/(.*)"] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.startAllMicroservices();
  const port = parseInt(process.env.PORT || "4020", 10);
  await app.listen(port);
  logger.info(
    `Audit Service  HTTP :${port}  gRPC :${DEFAULT_GRPC_PORTS.AUDIT}`,
  );
}

bootstrap();
