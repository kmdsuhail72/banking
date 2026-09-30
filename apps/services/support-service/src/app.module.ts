import { Module } from '@nestjs/common';
import { DatabaseModule } from '@banking/database';
import { HealthModule } from './health/health.module';
import { SupportModule } from './modules/support/support.module';
import { SuppOutboxEntity } from './entities/supp-outbox.entity';
import { SupportEntity } from './entities/support.entity';

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [SupportEntity, SuppOutboxEntity],
    }),
    HealthModule,
    SupportModule,
  ],
})
export class AppModule {}
