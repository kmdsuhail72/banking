import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OutboxEvent, OutboxDocument } from '../schemas/outbox.schema';
import { KafkaEventBus } from '@banking/kafka';
import { appConfig } from '@banking/config';
import { createLogger } from '@banking/logger';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OutboxService implements OnModuleInit {
  private logger = createLogger('OutboxService');
  private eventBus = new KafkaEventBus({
    clientId: 'transaction-service',
    brokers: appConfig.kafka.brokers,
  });

  constructor(
    @InjectModel(OutboxEvent.name)
    private outboxModel: Model<OutboxDocument>,
  ) {}

  async onModuleInit() {
    try {
      await this.eventBus.getProducer();
      this.logger.info('OutboxService Kafka producer connected');
    } catch (err: any) {
      this.logger.warn(`Kafka producer init warning: ${err.message}`);
    }
  }

  async saveAndPublishEvent(
    topic: string,
    eventType: string,
    aggregateId: string,
    payload: Record<string, any>,
  ): Promise<OutboxDocument> {
    const eventId = uuidv4();

    // 1. Record in outbox table
    const outbox = await this.outboxModel.create({
      eventId,
      eventType,
      aggregateId,
      payload,
      status: 'PENDING',
      occurredAt: new Date(),
    });

    // 2. Publish to Kafka
    try {
      await this.eventBus.publish(topic, {
        eventId,
        eventType,
        version: 1,
        occurredAt: new Date().toISOString(),
        payload,
      });

      outbox.status = 'PUBLISHED';
      outbox.publishedAt = new Date();
      await outbox.save();

      this.logger.info(`Outbox event '${eventType}' [${eventId}] published to topic '${topic}'`);
    } catch (err: any) {
      this.logger.warn(`Failed immediate publish for outbox event [${eventId}]: ${err.message}`);
      outbox.error = err.message;
      await outbox.save();
    }

    return outbox;
  }
}
