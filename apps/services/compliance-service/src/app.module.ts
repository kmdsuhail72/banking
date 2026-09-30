import { Module } from '@nestjs/common';
import { DatabaseModule } from '@banking/database';
import { HealthModule } from './health/health.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { ComplOutboxEntity } from './entities/compl-outbox.entity';
import { ComplianceEntity } from './entities/compliance.entity';

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [ComplianceEntity, ComplOutboxEntity],
    }),
    HealthModule,
    ComplianceModule,
  ],
})
export class AppModule {}
