import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@banking/database';

/** Primary entity for EMI schedule and repayment tracking. Table prefix: emi_ */
@Entity({ name: 'emi_records' })
export class EmiEntity extends BaseEntity {
  @Column({ length: 100 })
  userId: string;

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  status: string;

  // TODO: Add domain-specific columns
}
