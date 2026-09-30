import { Module } from '@nestjs/common';
import { DatabaseModule } from '@banking/database';
import { HealthModule } from './health/health.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuditOutboxEntity } from './entities/audit-outbox.entity';
import { AuditEntity } from './entities/audit.entity';

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [AuditEntity, AuditOutboxEntity],
    }),
    HealthModule,
    AuditModule,
  ],
})
export class AppModule {}
