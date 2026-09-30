import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthzEntity } from '../../entities/authz.entity';

/** RBAC authorization service */
@Injectable()
export class AuthzService {
  constructor(
    @InjectRepository(AuthzEntity)
    private readonly repo: Repository<AuthzEntity>,
  ) {}

  async findByUserId(userId: string): Promise<AuthzEntity[]> {
    return this.repo.find({ where: { userId } });
  }

  // TODO: Implement domain-specific methods
}
