import { Module } from '@nestjs/common';
import { DatabaseModule } from '@banking/database';
import { HealthModule } from './health/health.module';
import { PayOutboxEntity } from './entities/pay-outbox.entity';

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [PayOutboxEntity],
    }),
    HealthModule,
    // TODO: import domain module here
  ],
})
export class AppModule {}
