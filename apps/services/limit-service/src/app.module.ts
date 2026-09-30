import { Module } from '@nestjs/common';
import { DatabaseModule } from '@banking/database';
import { HealthModule } from './health/health.module';
import { LimitModule } from './modules/limit/limit.module';
import { LmtOutboxEntity } from './entities/lmt-outbox.entity';
import { LimitEntity } from './entities/limit.entity';

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [LimitEntity, LmtOutboxEntity],
    }),
    HealthModule,
    LimitModule,
  ],
})
export class AppModule {}
