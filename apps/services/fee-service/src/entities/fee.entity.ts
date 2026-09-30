import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@banking/database';

/** Primary entity for Transaction fee computation. Table prefix: fee_ */
@Entity({ name: 'fee_records' })
export class FeeEntity extends BaseEntity {
  @Column({ length: 100 })
  userId: string;

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  status: string;

  // TODO: Add domain-specific columns
}
