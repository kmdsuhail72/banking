import { OutboxEntityFactory } from "@banking/database";
export const BnfOutboxEntity = OutboxEntityFactory("bnf");
export type BnfOutboxEntity = InstanceType<typeof BnfOutboxEntity>;
