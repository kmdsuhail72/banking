import { OutboxEntityFactory } from '@banking/database';
export const FraudOutboxEntity = OutboxEntityFactory('fraud');
export type FraudOutboxEntity = InstanceType<typeof FraudOutboxEntity>;
