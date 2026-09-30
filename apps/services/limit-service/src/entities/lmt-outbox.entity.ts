import { OutboxEntityFactory } from '@banking/database';
export const LmtOutboxEntity = OutboxEntityFactory('lmt');
export type LmtOutboxEntity = InstanceType<typeof LmtOutboxEntity>;
