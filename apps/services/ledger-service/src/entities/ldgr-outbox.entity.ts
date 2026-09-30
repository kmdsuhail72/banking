import { OutboxEntityFactory } from "@banking/database";
export const LdgrOutboxEntity = OutboxEntityFactory("ldgr");
export type LdgrOutboxEntity = InstanceType<typeof LdgrOutboxEntity>;
