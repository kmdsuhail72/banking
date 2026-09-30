import { OutboxEntityFactory } from '@banking/database';
export const SuppOutboxEntity = OutboxEntityFactory('supp');
export type SuppOutboxEntity = InstanceType<typeof SuppOutboxEntity>;
