import { Module } from "@nestjs/common";
import { DatabaseModule } from "@banking/database";
import { HealthModule } from "./health/health.module";
import { EmiModule } from "./modules/emi/emi.module";
import { EmiOutboxEntity } from "./entities/emi-outbox.entity";
import { EmiEntity } from "./entities/emi.entity";

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [EmiEntity, EmiOutboxEntity],
    }),
    HealthModule,
    EmiModule,
  ],
})
export class AppModule {}
