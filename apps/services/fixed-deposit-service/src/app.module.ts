import { Module } from '@nestjs/common';
import { DatabaseModule } from '@banking/database';
import { HealthModule } from './health/health.module';
import { FixedDepositModule } from './modules/fixeddeposit/fixeddeposit.module';
import { FdOutboxEntity } from './entities/fd-outbox.entity';
import { FixedDepositEntity } from './entities/fixeddeposit.entity';

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [FixedDepositEntity, FdOutboxEntity],
    }),
    HealthModule,
    FixedDepositModule,
  ],
})
export class AppModule {}
