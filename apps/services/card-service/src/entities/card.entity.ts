import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@banking/database';

/** Primary entity for Card issuance and management. Table prefix: card_ */
@Entity({ name: 'card_records' })
export class CardEntity extends BaseEntity {
  @Column({ length: 100 })
  userId: string;

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  status: string;

  // TODO: Add domain-specific columns
}
