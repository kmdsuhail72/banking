import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportEntity } from '../../entities/support.entity';

/** Customer support tickets */
@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportEntity)
    private readonly repo: Repository<SupportEntity>,
  ) {}

  async findByUserId(userId: string): Promise<SupportEntity[]> {
    return this.repo.find({ where: { userId } });
  }

  // TODO: Implement domain-specific methods
}
