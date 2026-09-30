import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatementEntity } from '../../entities/statement.entity';

/** Account statements (PDF/CSV) */
@Injectable()
export class StatementService {
  constructor(
    @InjectRepository(StatementEntity)
    private readonly repo: Repository<StatementEntity>,
  ) {}

  async findByUserId(userId: string): Promise<StatementEntity[]> {
    return this.repo.find({ where: { userId } });
  }

  // TODO: Implement domain-specific methods
}
