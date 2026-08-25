import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthModule } from './health/health.module';
import { CustomerModule } from './modules/customer/customer.module';
import { appConfig } from '@banking/config';

@Module({
  imports: [
    MongooseModule.forRoot(appConfig.mongodb.uri, {
      serverSelectionTimeoutMS: 5000,
    }),
    HealthModule,
    CustomerModule,
  ],
})
export class AppModule {}
