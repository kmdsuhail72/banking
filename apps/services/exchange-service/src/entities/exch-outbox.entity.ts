import { OutboxEntityFactory } from '@banking/database';
export const ExchOutboxEntity = OutboxEntityFactory('exch');
export type ExchOutboxEntity = InstanceType<typeof ExchOutboxEntity>;
