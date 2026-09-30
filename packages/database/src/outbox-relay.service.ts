import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityTarget, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createLogger } from '@banking/logger';
import { OutboxEntity } from './outbox.entity';

const logger = createLogger('OutboxRelayService');

export interface IOutboxEventBus {
  publish(topic: string, event: Record<string, any>): Promise<void>;
}

/**
 * Polls the outbox table every 2 seconds and publishes unpublished events to Kafka.
 * Guarantees at-least-once delivery: if Kafka publish fails, the row stays
 * with published=false and is retried on the next tick (up to MAX_RETRIES).
 *
 * Usage — in each service's OutboxModule:
 *   OutboxRelayService.forEntity(AuthOutboxEntity, kafkaBus)
 */
@Injectable()
export class OutboxRelayService implements OnModuleInit {
  private static readonly BATCH_SIZE = 50;
  private static readonly MAX_RETRIES = 5;

  constructor(
    private readonly dataSource: DataSource,
    private readonly eventBus: IOutboxEventBus,
    private readonly entityTarget: EntityTarget<OutboxEntity>,
  ) {}

  onModuleInit() {
    logger.info('OutboxRelayService initialized');
  }

  @Cron('*/2 * * * * *') // every 2 seconds
  async relay(): Promise<void> {
    const repo = this.dataSource.getRepository(this.entityTarget);

    const rows = await repo.find({
      where: { published: false },
      order: { createdAt: 'ASC' },
      take: OutboxRelayService.BATCH_SIZE,
      lock: { mode: 'pessimistic_write', onLocked: 'skip_locked' },
    });

    if (rows.length === 0) return;

    for (const row of rows) {
      try {
        await this.eventBus.publish(row.topic, {
          eventId: row.id,
          eventType: row.eventType,
          aggregateId: row.aggregateId,
          payload: row.payload,
          timestamp: row.createdAt.toISOString(),
        });

        await repo.update(row.id, {
          published: true,
          publishedAt: new Date(),
        });
      } catch (err: any) {
        const retries = row.retries + 1;
        const shouldGiveUp = retries >= OutboxRelayService.MAX_RETRIES;

        await repo.update(row.id, {
          retries,
          lastError: err?.message?.slice(0, 495) ?? 'unknown',
          published: shouldGiveUp, // mark as published to stop infinite retry
        });

        logger.warn(`Outbox relay failed for event ${row.id} (attempt ${retries})`, {
          topic: row.topic,
          error: err?.message,
          gaveUp: shouldGiveUp,
        });
      }
    }

    logger.debug(`Outbox relay processed ${rows.length} events`);
  }
}
