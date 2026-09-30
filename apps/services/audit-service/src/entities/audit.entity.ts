import { Entity, Column } from "typeorm";
import { BaseEntity } from "@banking/database";

/** Primary entity for Immutable audit trail. Table prefix: audit_ */
@Entity({ name: "audit_records" })
export class AuditEntity extends BaseEntity {
  @Column({ length: 100 })
  userId: string;

  @Column({ type: "varchar", length: 50, default: "ACTIVE" })
  status: string;

  // TODO: Add domain-specific columns
}
