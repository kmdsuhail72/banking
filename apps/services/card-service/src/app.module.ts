import { Module } from "@nestjs/common";
import { DatabaseModule } from "@banking/database";
import { HealthModule } from "./health/health.module";
import { CardModule } from "./modules/card/card.module";
import { CardOutboxEntity } from "./entities/card-outbox.entity";
import { CardEntity } from "./entities/card.entity";

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [CardEntity, CardOutboxEntity],
    }),
    HealthModule,
    CardModule,
  ],
})
export class AppModule {}
