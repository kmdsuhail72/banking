import { OutboxEntityFactory } from "@banking/database";
export const PayOutboxEntity = OutboxEntityFactory("pay");
export type PayOutboxEntity = InstanceType<typeof PayOutboxEntity>;
