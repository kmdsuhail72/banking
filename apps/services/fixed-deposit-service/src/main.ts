import {
  startTelemetry,
  installMetrics,
  installTelemetryShutdown,
} from "@banking/observability";
startTelemetry("fixed-deposit-service");
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { join } from "path";
import { AppModule } from "./app.module";
import { createLogger } from "@banking/logger";
import { DEFAULT_GRPC_PORTS, GRPC_PACKAGES } from "@banking/grpc";

async function bootstrap() {
  const logger = createLogger("FixedDepositService");
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      url: `0.0.0.0:${DEFAULT_GRPC_PORTS.FIXED_DEPOSIT}`,
      package: GRPC_PACKAGES.FIXED_DEPOSIT,
      protoPath: join(
        __dirname,
        "../../../../packages/grpc/proto/fixed-deposit.proto",
      ),
    },
  });

  installMetrics(app, "fixed-deposit-service");
  installTelemetryShutdown(app);
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix("api/v1", { exclude: ["health", "health/(.*)"] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.startAllMicroservices();
  const port = parseInt(process.env.PORT || "4016", 10);
  await app.listen(port);
  logger.info(
    `FixedDeposit Service  HTTP :${port}  gRPC :${DEFAULT_GRPC_PORTS.FIXED_DEPOSIT}`,
  );
}

bootstrap();
