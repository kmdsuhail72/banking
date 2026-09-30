import { DynamicModule, Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EntityTarget } from 'typeorm';
import { OutboxEntity } from './outbox.entity';
import { OutboxRelayService, IOutboxEventBus } from './outbox-relay.service';
import { buildTypeOrmConfig } from './typeorm.config';

export interface OutboxModuleOptions {
  /** The entity class created by OutboxEntityFactory(prefix) */
  entity: EntityTarget<OutboxEntity>;
  /** A Kafka / event bus implementation */
  eventBus: IOutboxEventBus;
}

/**
 * DatabaseModule — include once in each service's AppModule.
 *
 * Usage:
 *   DatabaseModule.forService({
 *     entities: [UserEntity, AuthOutboxEntity],
 *     outbox: { entity: AuthOutboxEntity, eventBus: kafkaBus },
 *   })
 */
@Module({})
export class DatabaseModule {
  static forService(options: {
    entities: any[];
    outbox?: OutboxModuleOptions;
  }): DynamicModule {
    const providers: Provider[] = [];

    if (options.outbox) {
      providers.push(
        {
          provide: 'OUTBOX_ENTITY',
          useValue: options.outbox.entity,
        },
        {
          provide: 'OUTBOX_EVENT_BUS',
          useValue: options.outbox.eventBus,
        },
        OutboxRelayService,
      );
    }

    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRoot(buildTypeOrmConfig(options.entities)),
        TypeOrmModule.forFeature(options.entities),
        ScheduleModule.forRoot(),
      ],
      providers,
      exports: [TypeOrmModule, ...providers],
    };
  }
}
