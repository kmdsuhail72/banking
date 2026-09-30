import { Module } from "@nestjs/common";
import { DatabaseModule } from "@banking/database";
import { HealthModule } from "./health/health.module";
import { LdgrOutboxEntity } from "./entities/ldgr-outbox.entity";

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [LdgrOutboxEntity],
    }),
    HealthModule,
    // TODO: import domain module here
  ],
})
export class AppModule {}
