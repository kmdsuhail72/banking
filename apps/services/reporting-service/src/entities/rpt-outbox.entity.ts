import { OutboxEntityFactory } from "@banking/database";
export const RptOutboxEntity = OutboxEntityFactory("rpt");
export type RptOutboxEntity = InstanceType<typeof RptOutboxEntity>;
