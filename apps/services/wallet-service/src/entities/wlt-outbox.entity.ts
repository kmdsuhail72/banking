import { OutboxEntityFactory } from "@banking/database";
export const WltOutboxEntity = OutboxEntityFactory("wlt");
export type WltOutboxEntity = InstanceType<typeof WltOutboxEntity>;
