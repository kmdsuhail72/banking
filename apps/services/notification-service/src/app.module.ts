import { Module } from '@nestjs/common';
import { DatabaseModule } from '@banking/database';
import { HealthModule } from './health/health.module';
import { NotifOutboxEntity } from './entities/notif-outbox.entity';

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [NotifOutboxEntity],
    }),
    HealthModule,
    // TODO: import domain module here
  ],
})
export class AppModule {}
