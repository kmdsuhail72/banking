import { Entity, Column } from "typeorm";
import { BaseEntity } from "@banking/database";

/** Primary entity for Loan origination and management. Table prefix: loan_ */
@Entity({ name: "loan_records" })
export class LoanEntity extends BaseEntity {
  @Column({ length: 100 })
  userId: string;

  @Column({ type: "varchar", length: 50, default: "ACTIVE" })
  status: string;

  // TODO: Add domain-specific columns
}
