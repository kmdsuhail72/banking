import { Module } from '@nestjs/common';
import { DatabaseModule } from '@banking/database';
import { HealthModule } from './health/health.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AnlytOutboxEntity } from './entities/anlyt-outbox.entity';
import { AnalyticsEntity } from './entities/analytics.entity';

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [AnalyticsEntity, AnlytOutboxEntity],
    }),
    HealthModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
