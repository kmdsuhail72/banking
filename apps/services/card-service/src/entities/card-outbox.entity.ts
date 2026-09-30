import { OutboxEntityFactory } from '@banking/database';
export const CardOutboxEntity = OutboxEntityFactory('card');
export type CardOutboxEntity = InstanceType<typeof CardOutboxEntity>;
