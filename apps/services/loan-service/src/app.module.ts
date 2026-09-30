import { Module } from "@nestjs/common";
import { DatabaseModule } from "@banking/database";
import { HealthModule } from "./health/health.module";
import { LoanModule } from "./modules/loan/loan.module";
import { LoanOutboxEntity } from "./entities/loan-outbox.entity";
import { LoanEntity } from "./entities/loan.entity";

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [LoanEntity, LoanOutboxEntity],
    }),
    HealthModule,
    LoanModule,
  ],
})
export class AppModule {}
