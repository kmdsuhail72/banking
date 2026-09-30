import { OutboxEntityFactory } from "@banking/database";
export const AuthzOutboxEntity = OutboxEntityFactory("authz");
export type AuthzOutboxEntity = InstanceType<typeof AuthzOutboxEntity>;
