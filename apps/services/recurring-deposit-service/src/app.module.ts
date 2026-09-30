import { Module } from '@nestjs/common';
import { DatabaseModule } from '@banking/database';
import { HealthModule } from './health/health.module';
import { RecurringDepositModule } from './modules/recurringdeposit/recurringdeposit.module';
import { RdOutboxEntity } from './entities/rd-outbox.entity';
import { RecurringDepositEntity } from './entities/recurringdeposit.entity';

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [RecurringDepositEntity, RdOutboxEntity],
    }),
    HealthModule,
    RecurringDepositModule,
  ],
})
export class AppModule {}
