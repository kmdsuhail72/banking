import { Module } from '@nestjs/common';
import { DatabaseModule } from '@banking/database';
import { HealthModule } from './health/health.module';
import { BnfOutboxEntity } from './entities/bnf-outbox.entity';

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [BnfOutboxEntity],
    }),
    HealthModule,
    // TODO: import domain module here
  ],
})
export class AppModule {}
