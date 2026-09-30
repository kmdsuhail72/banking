import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminEntity } from '../../entities/admin.entity';

/** Back-office admin panel */
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AdminEntity)
    private readonly repo: Repository<AdminEntity>,
  ) {}

  async findByUserId(userId: string): Promise<AdminEntity[]> {
    return this.repo.find({ where: { userId } });
  }

  // TODO: Implement domain-specific methods
}
