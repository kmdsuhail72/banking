import { Entity, Column } from "typeorm";
import { BaseEntity } from "@banking/database";

/** Primary entity for AML checks and regulatory reporting. Table prefix: compl_ */
@Entity({ name: "compl_records" })
export class ComplianceEntity extends BaseEntity {
  @Column({ length: 100 })
  userId: string;

  @Column({ type: "varchar", length: 50, default: "ACTIVE" })
  status: string;

  // TODO: Add domain-specific columns
}
