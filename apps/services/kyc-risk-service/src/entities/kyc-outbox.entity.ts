import { OutboxEntityFactory } from "@banking/database";
export const KycOutboxEntity = OutboxEntityFactory("kyc");
export type KycOutboxEntity = InstanceType<typeof KycOutboxEntity>;
