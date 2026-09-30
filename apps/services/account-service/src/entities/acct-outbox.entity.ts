import { OutboxEntityFactory } from "@banking/database";
export const AcctOutboxEntity = OutboxEntityFactory("acct");
export type AcctOutboxEntity = InstanceType<typeof AcctOutboxEntity>;
