import { Entity, Column } from "typeorm";
import { BaseEntity } from "@banking/database";

/** Primary entity for Spend analytics and category tagging. Table prefix: anlyt_ */
@Entity({ name: "anlyt_records" })
export class AnalyticsEntity extends BaseEntity {
  @Column({ length: 100 })
  userId: string;

  @Column({ type: "varchar", length: 50, default: "ACTIVE" })
  status: string;

  // TODO: Add domain-specific columns
}
