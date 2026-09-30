import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { LimitEntity } from "../../entities/limit.entity";

/** Daily/monthly transaction limits */
@Injectable()
export class LimitService {
  constructor(
    @InjectRepository(LimitEntity)
    private readonly repo: Repository<LimitEntity>,
  ) {}

  async findByUserId(userId: string): Promise<LimitEntity[]> {
    return this.repo.find({ where: { userId } });
  }

  // TODO: Implement domain-specific methods
}
