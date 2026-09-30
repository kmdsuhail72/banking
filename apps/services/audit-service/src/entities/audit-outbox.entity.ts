import { OutboxEntityFactory } from '@banking/database';
export const AuditOutboxEntity = OutboxEntityFactory('audit');
export type AuditOutboxEntity = InstanceType<typeof AuditOutboxEntity>;
