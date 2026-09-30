import { Module } from "@nestjs/common";
import { DatabaseModule } from "@banking/database";
import { HealthModule } from "./health/health.module";
import { FeeModule } from "./modules/fee/fee.module";
import { FeeOutboxEntity } from "./entities/fee-outbox.entity";
import { FeeEntity } from "./entities/fee.entity";

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [FeeEntity, FeeOutboxEntity],
    }),
    HealthModule,
    FeeModule,
  ],
})
export class AppModule {}
