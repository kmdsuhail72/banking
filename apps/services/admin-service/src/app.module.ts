import { Module } from '@nestjs/common';
import { DatabaseModule } from '@banking/database';
import { HealthModule } from './health/health.module';
import { AdminModule } from './modules/admin/admin.module';
import { AdmOutboxEntity } from './entities/adm-outbox.entity';
import { AdminEntity } from './entities/admin.entity';

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [AdminEntity, AdmOutboxEntity],
    }),
    HealthModule,
    AdminModule,
  ],
})
export class AppModule {}
