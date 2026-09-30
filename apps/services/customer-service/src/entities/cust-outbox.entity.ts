import { OutboxEntityFactory } from '@banking/database';
export const CustOutboxEntity = OutboxEntityFactory('cust');
export type CustOutboxEntity = InstanceType<typeof CustOutboxEntity>;
