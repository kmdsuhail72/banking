import { Entity, Column } from "typeorm";
import { BaseEntity } from "@banking/database";

/** Primary entity for Real-time fraud scoring and case management. Table prefix: fraud_ */
@Entity({ name: "fraud_records" })
export class FraudEntity extends BaseEntity {
  @Column({ length: 100 })
  userId: string;

  @Column({ type: "varchar", length: 50, default: "ACTIVE" })
  status: string;

  // TODO: Add domain-specific columns
}
