import { Module } from "@nestjs/common";
import { DatabaseModule } from "@banking/database";
import { HealthModule } from "./health/health.module";
import { ExchangeModule } from "./modules/exchange/exchange.module";
import { ExchOutboxEntity } from "./entities/exch-outbox.entity";
import { ExchangeEntity } from "./entities/exchange.entity";

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [ExchangeEntity, ExchOutboxEntity],
    }),
    HealthModule,
    ExchangeModule,
  ],
})
export class AppModule {}
