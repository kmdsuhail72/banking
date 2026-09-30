import { OutboxEntityFactory } from "@banking/database";
export const IntrOutboxEntity = OutboxEntityFactory("intr");
export type IntrOutboxEntity = InstanceType<typeof IntrOutboxEntity>;
