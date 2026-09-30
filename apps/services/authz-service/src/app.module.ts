import { Module } from '@nestjs/common';
import { DatabaseModule } from '@banking/database';
import { HealthModule } from './health/health.module';
import { AuthzModule } from './modules/authz/authz.module';
import { AuthzOutboxEntity } from './entities/authz-outbox.entity';
import { AuthzEntity } from './entities/authz.entity';

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [AuthzEntity, AuthzOutboxEntity],
    }),
    HealthModule,
    AuthzModule,
  ],
})
export class AppModule {}
