import { OutboxEntityFactory } from "@banking/database";
export const RdOutboxEntity = OutboxEntityFactory("rd");
export type RdOutboxEntity = InstanceType<typeof RdOutboxEntity>;
