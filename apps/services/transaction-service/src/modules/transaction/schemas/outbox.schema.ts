import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OutboxDocument = HydratedDocument<OutboxEvent>;

@Schema({
  timestamps: true,
  collection: 'outbox_events',
})
export class OutboxEvent {
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  eventId: string;

  @Prop({
    required: true,
    index: true,
  })
  eventType: string;

  @Prop({
    required: true,
    index: true,
  })
  aggregateId: string;

  @Prop({
    type: Object,
    required: true,
  })
  payload: Record<string, any>;

  @Prop({
    required: true,
    enum: ['PENDING', 'PUBLISHED', 'FAILED'],
    default: 'PENDING',
    index: true,
  })
  status: string;

  @Prop({
    required: true,
    default: Date.now,
  })
  occurredAt: Date;

  @Prop()
  publishedAt?: Date;

  @Prop()
  error?: string;
}

export const OutboxSchema = SchemaFactory.createForClass(OutboxEvent);

OutboxSchema.index({ status: 1, createdAt: 1 });
