import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterestEntity } from '../../entities/interest.entity';

/** Interest accrual for savings and loans */
@Injectable()
export class InterestService {
  constructor(
    @InjectRepository(InterestEntity)
    private readonly repo: Repository<InterestEntity>,
  ) {}

  async findByUserId(userId: string): Promise<InterestEntity[]> {
    return this.repo.find({ where: { userId } });
  }

  // TODO: Implement domain-specific methods
}
