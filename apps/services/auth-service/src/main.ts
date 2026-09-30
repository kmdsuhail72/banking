import {
  startTelemetry,
  installMetrics,
  installTelemetryShutdown,
} from "@banking/observability";
startTelemetry("auth-service");
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { join } from "path";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { createLogger } from "@banking/logger";
import { DEFAULT_GRPC_PORTS, GRPC_PACKAGES } from "@banking/grpc";

async function bootstrap() {
  const logger = createLogger("AuthService");
  const app = await NestFactory.create(AppModule);

  // ── gRPC microservice transport ────────────────────────────────────────────
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      url: `0.0.0.0:${DEFAULT_GRPC_PORTS.AUTH}`,
      package: GRPC_PACKAGES.AUTH,
      protoPath: join(__dirname, "../../../../packages/grpc/proto/auth.proto"),
    },
  });

  installMetrics(app, "auth-service");
  installTelemetryShutdown(app);

  app.use(cookieParser());
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix("api/v1", { exclude: ["health", "health/(.*)"] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.startAllMicroservices();
  const port = parseInt(process.env.PORT || "4001", 10);
  await app.listen(port);
  logger.info(`Auth Service  HTTP :${port}  gRPC :${DEFAULT_GRPC_PORTS.AUTH}`);
}

bootstrap();
