import { OutboxEntityFactory } from '@banking/database';
export const TxnOutboxEntity = OutboxEntityFactory('txn');
export type TxnOutboxEntity = InstanceType<typeof TxnOutboxEntity>;
