import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { IBankingEvent } from '@banking/shared-types';
import { createLogger } from '@banking/logger';
import { EventEmitter } from 'events';

export interface IKafkaConfig {
  clientId: string;
  brokers: string[];
  groupId?: string;
}

// Local in-process event bus fallback for decoupled local testing when Kafka is unavailable
const localEmitter = new EventEmitter();

export class KafkaEventBus {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private logger = createLogger('KafkaEventBus');
  private isConnected = false;

  constructor(private config: IKafkaConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      retry: {
        retries: 2,
        initialRetryTime: 100,
      },
    });
  }

  async getProducer(): Promise<Producer | null> {
    if (this.producer) return this.producer;
    try {
      this.producer = this.kafka.producer();
      await this.producer.connect();
      this.isConnected = true;
      this.logger.info(`Kafka producer connected for ${this.config.clientId}`);
      return this.producer;
    } catch (err: any) {
      this.logger.warn(`Kafka producer connection failed for ${this.config.clientId} (using fallback local event channel): ${err?.message || err}`);
      this.producer = null;
      return null;
    }
  }

  async publish<T>(topic: string, event: IBankingEvent<T>): Promise<void> {
    try {
      const producer = await this.getProducer();
      if (producer) {
        await producer.send({
          topic,
          messages: [
            {
              key: event.correlationId || event.eventId,
              value: JSON.stringify(event),
              headers: {
                eventType: event.eventType,
                sourceService: event.sourceService || this.config.clientId,
                timestamp: event.timestamp || new Date().toISOString(),
              },
            },
          ],
        });
        this.logger.info(`Published event ${event.eventType} to Kafka topic ${topic}`, {
          eventId: event.eventId,
          correlationId: event.correlationId,
        });
      }
    } catch (err: any) {
      this.logger.warn(`Failed to publish event to Kafka (${err?.message}), triggering in-process fallback`);
    }

    // Always emit on local bus so local microservice components stay in sync
    localEmitter.emit(topic, event);
  }

  async subscribe(
    topics: string[],
    handler: (payload: EachMessagePayload) => Promise<void>
  ): Promise<void> {
    if (!this.config.groupId) {
      throw new Error('Consumer groupId is required for subscribing');
    }

    try {
      this.consumer = this.kafka.consumer({ groupId: this.config.groupId });
      await this.consumer.connect();
      for (const topic of topics) {
        await this.consumer.subscribe({ topic, fromBeginning: false });
      }
      await this.consumer.run({
        eachMessage: handler,
      });
      this.logger.info(`Subscribed to Kafka topics: ${topics.join(', ')}`);
    } catch (err: any) {
      this.logger.warn(`Kafka consumer connection failed for group ${this.config.groupId} (${err?.message}). Listening on local event channel fallback.`);
    }

    // Subscribe on local fallback channel
    for (const topic of topics) {
      localEmitter.on(topic, async (event: IBankingEvent) => {
        try {
          await handler({
            topic,
            partition: 0,
            message: {
              key: Buffer.from(event.correlationId || event.eventId || ''),
              value: Buffer.from(JSON.stringify(event)),
              timestamp: (Date.now()).toString(),
              attributes: 0,
              offset: '0',
              headers: {
                eventType: Buffer.from(event.eventType || ''),
              },
            },
            heartbeat: async () => {},
            pause: () => () => {},
          });
        } catch (e: any) {
          this.logger.error(`Error processing local fallback event on topic ${topic}: ${e?.message}`);
        }
      });
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.producer) await this.producer.disconnect();
      if (this.consumer) await this.consumer.disconnect();
    } catch (err) {
      // ignore
    }
  }
}

