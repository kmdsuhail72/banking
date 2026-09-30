import { Module } from '@nestjs/common';
import { DatabaseModule } from '@banking/database';
import { HealthModule } from './health/health.module';
import { StatementModule } from './modules/statement/statement.module';
import { StmtOutboxEntity } from './entities/stmt-outbox.entity';
import { StatementEntity } from './entities/statement.entity';

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [StatementEntity, StmtOutboxEntity],
    }),
    HealthModule,
    StatementModule,
  ],
})
export class AppModule {}
