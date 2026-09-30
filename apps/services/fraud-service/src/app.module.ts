import { Module } from "@nestjs/common";
import { DatabaseModule } from "@banking/database";
import { HealthModule } from "./health/health.module";
import { FraudModule } from "./modules/fraud/fraud.module";
import { FraudOutboxEntity } from "./entities/fraud-outbox.entity";
import { FraudEntity } from "./entities/fraud.entity";

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [FraudEntity, FraudOutboxEntity],
    }),
    HealthModule,
    FraudModule,
  ],
})
export class AppModule {}
