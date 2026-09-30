import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoanEntity } from '../../entities/loan.entity';

/** Loan origination and management */
@Injectable()
export class LoanService {
  constructor(
    @InjectRepository(LoanEntity)
    private readonly repo: Repository<LoanEntity>,
  ) {}

  async findByUserId(userId: string): Promise<LoanEntity[]> {
    return this.repo.find({ where: { userId } });
  }

  // TODO: Implement domain-specific methods
}
