import { Module } from "@nestjs/common";
import { DatabaseModule } from "@banking/database";
import { HealthModule } from "./health/health.module";
import { SchedulerModule } from "./modules/scheduler/scheduler.module";
import { SchedOutboxEntity } from "./entities/sched-outbox.entity";
import { SchedulerEntity } from "./entities/scheduler.entity";

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [SchedulerEntity, SchedOutboxEntity],
    }),
    HealthModule,
    SchedulerModule,
  ],
})
export class AppModule {}
