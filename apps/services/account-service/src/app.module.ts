import { Module } from "@nestjs/common";
import { DatabaseModule } from "@banking/database";
import { HealthModule } from "./health/health.module";
import { AcctOutboxEntity } from "./entities/acct-outbox.entity";

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [AcctOutboxEntity],
    }),
    HealthModule,
    // TODO: import domain module here
  ],
})
export class AppModule {}
