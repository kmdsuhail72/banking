import { OutboxEntityFactory } from '@banking/database';
export const NotifOutboxEntity = OutboxEntityFactory('notif');
export type NotifOutboxEntity = InstanceType<typeof NotifOutboxEntity>;
