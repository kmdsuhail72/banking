import { Module } from "@nestjs/common";
import { DatabaseModule } from "@banking/database";
import { HealthModule } from "./health/health.module";
import { KycOutboxEntity } from "./entities/kyc-outbox.entity";

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [KycOutboxEntity],
    }),
    HealthModule,
    // TODO: import domain module here
  ],
})
export class AppModule {}
