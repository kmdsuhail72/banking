import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@banking/database';

/** Primary entity for Back-office admin panel. Table prefix: adm_ */
@Entity({ name: 'adm_records' })
export class AdminEntity extends BaseEntity {
  @Column({ length: 100 })
  userId: string;

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  status: string;

  // TODO: Add domain-specific columns
}
