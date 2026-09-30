import { OutboxEntityFactory } from "@banking/database";
export const LoanOutboxEntity = OutboxEntityFactory("loan");
export type LoanOutboxEntity = InstanceType<typeof LoanOutboxEntity>;
