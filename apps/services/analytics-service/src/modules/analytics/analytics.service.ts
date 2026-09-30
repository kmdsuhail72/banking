import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEntity } from '../../entities/analytics.entity';

/** Spend analytics and category tagging */
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsEntity)
    private readonly repo: Repository<AnalyticsEntity>,
  ) {}

  async findByUserId(userId: string): Promise<AnalyticsEntity[]> {
    return this.repo.find({ where: { userId } });
  }

  // TODO: Implement domain-specific methods
}
