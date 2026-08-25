import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { appConfig } from '@banking/config';

@Module({
  imports: [
    MongooseModule.forRoot(appConfig.mongodb.uri, {
      serverSelectionTimeoutMS: 5000,
    }),
    HealthModule,
    AuthModule,
  ],
})
export class AppModule {}
