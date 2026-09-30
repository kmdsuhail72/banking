import { OutboxEntityFactory } from "@banking/database";
export const SchedOutboxEntity = OutboxEntityFactory("sched");
export type SchedOutboxEntity = InstanceType<typeof SchedOutboxEntity>;
