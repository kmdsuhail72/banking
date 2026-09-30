import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FixedDepositEntity } from '../../entities/fixeddeposit.entity';

/** Fixed deposit management */
@Injectable()
export class FixedDepositService {
  constructor(
    @InjectRepository(FixedDepositEntity)
    private readonly repo: Repository<FixedDepositEntity>,
  ) {}

  async findByUserId(userId: string): Promise<FixedDepositEntity[]> {
    return this.repo.find({ where: { userId } });
  }

  // TODO: Implement domain-specific methods
}
