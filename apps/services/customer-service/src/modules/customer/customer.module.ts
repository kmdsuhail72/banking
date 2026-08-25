import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer, CustomerSchema } from './schemas/customer.schema';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { CustomerConsumer } from './customer.consumer';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Customer.name,
        schema: CustomerSchema,
      },
    ]),
  ],
  controllers: [CustomerController],
  providers: [CustomerService, CustomerConsumer],
  exports: [CustomerService],
})
export class CustomerModule {}
