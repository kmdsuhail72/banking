import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type IdempotencyDocument = HydratedDocument<IdempotencyKey>;

@Schema({
  timestamps: true,
  collection: 'idempotency_keys',
})
export class IdempotencyKey {
  @Prop({
    required: true,
    index: true,
  })
  key: string;

  @Prop({
    required: true,
    index: true,
  })
  userId: string;

  @Prop({
    required: true,
  })
  transactionId: string;

  @Prop({
    required: true,
    default: 'COMPLETED',
  })
  status: string;

  @Prop({
    type: Object,
    required: true,
  })
  responseBody: any;
}

export const IdempotencySchema = SchemaFactory.createForClass(IdempotencyKey);

// Compound unique index ensuring each user's idempotency keys are isolated & unique
IdempotencySchema.index({ userId: 1, key: 1 }, { unique: true });
