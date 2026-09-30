import { OutboxEntityFactory } from '@banking/database';
export const EmiOutboxEntity = OutboxEntityFactory('emi');
export type EmiOutboxEntity = InstanceType<typeof EmiOutboxEntity>;
