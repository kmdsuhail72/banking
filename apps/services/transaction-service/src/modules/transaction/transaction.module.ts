import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { IdempotencyKey, IdempotencySchema } from './schemas/idempotency.schema';
import { OutboxEvent, OutboxSchema } from './schemas/outbox.schema';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { IdempotencyService } from './services/idempotency.service';
import { OutboxService } from './services/outbox.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: IdempotencyKey.name, schema: IdempotencySchema },
      { name: OutboxEvent.name, schema: OutboxSchema },
    ]),
  ],
  controllers: [TransactionController],
  providers: [
    TransactionService,
    IdempotencyService,
    OutboxService,
    JwtAuthGuard,
  ],
  exports: [TransactionService],
})
export class TransactionModule {}
