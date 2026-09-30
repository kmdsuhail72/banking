import { OutboxEntityFactory } from "@banking/database";
export const ComplOutboxEntity = OutboxEntityFactory("compl");
export type ComplOutboxEntity = InstanceType<typeof ComplOutboxEntity>;
