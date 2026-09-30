import { Module } from "@nestjs/common";
import { DatabaseModule } from "@banking/database";
import { HealthModule } from "./health/health.module";
import { RptOutboxEntity } from "./entities/rpt-outbox.entity";

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [RptOutboxEntity],
    }),
    HealthModule,
    // TODO: import domain module here
  ],
})
export class AppModule {}
