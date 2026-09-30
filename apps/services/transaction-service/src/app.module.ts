import { Module } from '@nestjs/common';
import { DatabaseModule } from '@banking/database';
import { HealthModule } from './health/health.module';
import { TxnOutboxEntity } from './entities/txn-outbox.entity';

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [TxnOutboxEntity],
    }),
    HealthModule,
    // TODO: import domain module here
  ],
})
export class AppModule {}
