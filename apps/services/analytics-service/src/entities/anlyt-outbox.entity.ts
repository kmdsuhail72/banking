import { OutboxEntityFactory } from '@banking/database';
export const AnlytOutboxEntity = OutboxEntityFactory('anlyt');
export type AnlytOutboxEntity = InstanceType<typeof AnlytOutboxEntity>;
