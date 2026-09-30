import { OutboxEntityFactory } from '@banking/database';
export const FeeOutboxEntity = OutboxEntityFactory('fee');
export type FeeOutboxEntity = InstanceType<typeof FeeOutboxEntity>;
