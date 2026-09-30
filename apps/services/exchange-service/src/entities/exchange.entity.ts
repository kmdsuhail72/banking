import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@banking/database';

/** Primary entity for Currency exchange rates and FX conversion. Table prefix: exch_ */
@Entity({ name: 'exch_records' })
export class ExchangeEntity extends BaseEntity {
  @Column({ length: 100 })
  userId: string;

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  status: string;

  // TODO: Add domain-specific columns
}
