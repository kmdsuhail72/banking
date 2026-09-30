import { Module } from '@nestjs/common';
import { DatabaseModule } from '@banking/database';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserEntity } from './entities/user.entity';
import { AuthOutboxEntity } from './entities/auth-outbox.entity';

@Module({
  imports: [
    DatabaseModule.forService({
      entities: [UserEntity, AuthOutboxEntity],
      // Outbox relay wired in AuthModule where KafkaBus is available
    }),
    HealthModule,
    AuthModule,
  ],
})
export class AppModule {}
