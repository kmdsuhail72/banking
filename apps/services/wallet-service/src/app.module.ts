import { Module } from '@nestjs/common';
import { DatabaseModule } from '@banking/database';
import { HealthModule } from './health/health.module';
import { WltOutboxEntity } from './entities/wlt-outbox.entity';

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [WltOutboxEntity],
    }),
    HealthModule,
    // TODO: import domain module here
  ],
})
export class AppModule {}
