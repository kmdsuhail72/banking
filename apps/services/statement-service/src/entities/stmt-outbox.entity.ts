import { OutboxEntityFactory } from '@banking/database';
export const StmtOutboxEntity = OutboxEntityFactory('stmt');
export type StmtOutboxEntity = InstanceType<typeof StmtOutboxEntity>;
