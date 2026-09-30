const fs = require("fs");
const path = require("path");

const services = [
  {
    name: "customer-service",
    portKey: "customer",
    defaultPort: 4002,
    label: "CustomerService",
    icon: "👤",
  },
  {
    name: "account-service",
    portKey: "account",
    defaultPort: 4003,
    label: "AccountService",
    icon: "🏦",
  },
  {
    name: "transaction-service",
    portKey: "transaction",
    defaultPort: 4004,
    label: "TransactionService",
    icon: "💸",
  },
  {
    name: "ledger-service",
    portKey: "ledger",
    defaultPort: 4005,
    label: "LedgerService",
    icon: "📖",
  },
  {
    name: "payment-service",
    portKey: "payment",
    defaultPort: 4006,
    label: "PaymentService",
    icon: "💳",
  },
  {
    name: "wallet-service",
    portKey: "wallet",
    defaultPort: 4007,
    label: "WalletService",
    icon: "👛",
  },
  {
    name: "beneficiary-service",
    portKey: "beneficiary",
    defaultPort: 4008,
    label: "BeneficiaryService",
    icon: "🤝",
  },
  {
    name: "notification-service",
    portKey: "notification",
    defaultPort: 4009,
    label: "NotificationService",
    icon: "🔔",
  },
  {
    name: "kyc-risk-service",
    portKey: "kycRisk",
    defaultPort: 4010,
    label: "KycRiskService",
    icon: "🛡️",
  },
  {
    name: "reporting-service",
    portKey: "reporting",
    defaultPort: 4011,
    label: "ReportingService",
    icon: "📊",
  },
];

const baseDir = path.join(process.cwd(), "apps", "services");

for (const s of services) {
  const sDir = path.join(baseDir, s.name);
  const srcDir = path.join(sDir, "src");
  const healthDir = path.join(srcDir, "health");
  fs.mkdirSync(healthDir, { recursive: true });

  // package.json
  const pkg = {
    name: `@banking/${s.name}`,
    version: "1.0.0",
    private: true,
    scripts: {
      build: "tsc",
      start: "node dist/main.js",
      dev: "ts-node-dev --respawn --transpile-only src/main.ts",
    },
    dependencies: {
      "@banking/config": "workspace:*",
      "@banking/logger": "workspace:*",
      "@banking/observability": "workspace:*",
      "@banking/shared-types": "workspace:*",
      "@banking/kafka": "workspace:*",
      "@nestjs/common": "^10.4.15",
      "@nestjs/core": "^10.4.15",
      "@nestjs/platform-express": "^10.4.15",
      "reflect-metadata": "^0.2.2",
      rxjs: "^7.8.1",
    },
    devDependencies: {
      "@types/express": "^4.17.21",
      "@types/node": "^22.10.7",
      "ts-node-dev": "^2.0.0",
      typescript: "^5.8.2",
    },
  };
  fs.writeFileSync(
    path.join(sDir, "package.json"),
    JSON.stringify(pkg, null, 2),
  );

  // tsconfig.json
  const tsconfig = {
    extends: "../../../tsconfig.json",
    compilerOptions: {
      outDir: "./dist",
      rootDir: "./src",
    },
    include: ["src/**/*"],
  };
  fs.writeFileSync(
    path.join(sDir, "tsconfig.json"),
    JSON.stringify(tsconfig, null, 2),
  );

  // health.controller.ts
  const healthCtrl = `import { Controller, Get } from '@nestjs/common';
import { HealthIndicator } from '@banking/observability';
import { IServiceHealth } from '@banking/shared-types';

@Controller('health')
export class HealthController {
  private healthIndicator = new HealthIndicator('${s.name}', '1.0.0');

  @Get()
  getHealth(): IServiceHealth {
    return this.healthIndicator.getHealth({
      mongodb: 'connected',
      redis: 'connected',
      kafka: 'connected',
    });
  }
}
`;
  fs.writeFileSync(path.join(healthDir, "health.controller.ts"), healthCtrl);

  // health.module.ts
  const healthMod = `import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
`;
  fs.writeFileSync(path.join(healthDir, "health.module.ts"), healthMod);

  // app.module.ts
  const appMod = `import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';

@Module({
  imports: [HealthModule],
})
export class AppModule {}
`;
  fs.writeFileSync(path.join(srcDir, "app.module.ts"), appMod);

  // main.ts
  const mainTs = `import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appConfig } from '@banking/config';
import { createLogger } from '@banking/logger';

async function bootstrap() {
  const logger = createLogger('${s.label}');
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  const port = appConfig.ports.${s.portKey} || ${s.defaultPort};
  await app.listen(port);
  logger.info('${s.icon} ${s.label} running on http://localhost:' + port);
}

bootstrap();
`;
  fs.writeFileSync(path.join(srcDir, "main.ts"), mainTs);
}

console.log("Successfully scaffolded 10 microservices!");
