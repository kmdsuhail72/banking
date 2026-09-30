import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudEntity } from '../../entities/fraud.entity';

/** Real-time fraud scoring and case management */
@Injectable()
export class FraudService {
  constructor(
    @InjectRepository(FraudEntity)
    private readonly repo: Repository<FraudEntity>,
  ) {}

  async findByUserId(userId: string): Promise<FraudEntity[]> {
    return this.repo.find({ where: { userId } });
  }

  // TODO: Implement domain-specific methods
}
