import { OutboxEntityFactory } from '@banking/database';
export const DocOutboxEntity = OutboxEntityFactory('doc');
export type DocOutboxEntity = InstanceType<typeof DocOutboxEntity>;
