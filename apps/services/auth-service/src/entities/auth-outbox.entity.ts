import { OutboxEntityFactory } from "@banking/database";

/**
 * Auth service outbox table: auth_outbox
 * Written in the same transaction as user mutations,
 * then relayed to Kafka by OutboxRelayService.
 */
export const AuthOutboxEntity = OutboxEntityFactory("auth");
export type AuthOutboxEntity = InstanceType<typeof AuthOutboxEntity>;
