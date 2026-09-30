import { OutboxEntityFactory } from "@banking/database";
export const FdOutboxEntity = OutboxEntityFactory("fd");
export type FdOutboxEntity = InstanceType<typeof FdOutboxEntity>;
