import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Transactional Outbox table.
 * Every service that emits Kafka events writes here
 * inside the same DB transaction as the main mutation.
 * The OutboxRelayService polls this table and publishes to Kafka.
 *
 * Table name is set per-service via @Entity({ name: '<prefix>_outbox' }).
 * Use OutboxEntityFactory(prefix) to create the correctly-named entity class.
 */
@Entity({ name: 'outbox' })  // overridden per service
export class OutboxEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  @Index()
  topic: string;

  @Column({ type: 'varchar', length: 200 })
  eventType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  aggregateId: string | null;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  @Index()
  published: boolean;

  @Column({ type: 'int', default: 0 })
  retries: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  lastError: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;
}

// Re-export PrimaryGeneratedColumn (used above before import resolution in some bundlers)
import { PrimaryGeneratedColumn } from 'typeorm';

/**
 * Factory: creates an OutboxEntity class with the correct table name.
 * Usage in each service:
 *   export const AuthOutboxEntity = OutboxEntityFactory('auth');
 */
export function OutboxEntityFactory(servicePrefix: string) {
  @Entity({ name: `${servicePrefix}_outbox` })
  class ServiceOutboxEntity extends OutboxEntity {}
  Object.defineProperty(ServiceOutboxEntity, 'name', { value: `${servicePrefix}OutboxEntity` });
  return ServiceOutboxEntity;
}
