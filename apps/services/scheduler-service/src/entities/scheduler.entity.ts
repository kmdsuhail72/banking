import { Entity, Column } from "typeorm";
import { BaseEntity } from "@banking/database";

/** Primary entity for Cron-based batch job triggers. Table prefix: sched_ */
@Entity({ name: "sched_records" })
export class SchedulerEntity extends BaseEntity {
  @Column({ length: 100 })
  userId: string;

  @Column({ type: "varchar", length: 50, default: "ACTIVE" })
  status: string;

  // TODO: Add domain-specific columns
}
