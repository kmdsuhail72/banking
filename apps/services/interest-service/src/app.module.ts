import { Module } from '@nestjs/common';
import { DatabaseModule } from '@banking/database';
import { HealthModule } from './health/health.module';
import { InterestModule } from './modules/interest/interest.module';
import { IntrOutboxEntity } from './entities/intr-outbox.entity';
import { InterestEntity } from './entities/interest.entity';

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [InterestEntity, IntrOutboxEntity],
    }),
    HealthModule,
    InterestModule,
  ],
})
export class AppModule {}
