import {
  startTelemetry,
  installMetrics,
  installTelemetryShutdown,
} from "@banking/observability";
startTelemetry("api-gateway");
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { appConfig } from "@banking/config";
import { createLogger } from "@banking/logger";

async function bootstrap() {
  const logger = createLogger("API-Gateway");
  const app = await NestFactory.create(AppModule);
  installMetrics(app, "api-gateway");
  installTelemetryShutdown(app);

  app.use(cookieParser());
  app.enableCors({
    origin: (origin, callback) => {
      // Allow local development frontends or reflection
      callback(null, true);
    },
    credentials: true,
  });

  const port = appConfig.ports.gateway || 3000;
  await app.listen(port);
  logger.info(`🚀 API Gateway running on http://localhost:${port}`);
}

bootstrap();
