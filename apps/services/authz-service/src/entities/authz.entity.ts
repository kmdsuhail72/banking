import { Entity, Column } from "typeorm";
import { BaseEntity } from "@banking/database";

/** Primary entity for RBAC authorization service. Table prefix: authz_ */
@Entity({ name: "authz_records" })
export class AuthzEntity extends BaseEntity {
  @Column({ length: 100 })
  userId: string;

  @Column({ type: "varchar", length: 50, default: "ACTIVE" })
  status: string;

  // TODO: Add domain-specific columns
}
