import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FeeEntity } from "../../entities/fee.entity";

/** Transaction fee computation */
@Injectable()
export class FeeService {
  constructor(
    @InjectRepository(FeeEntity)
    private readonly repo: Repository<FeeEntity>,
  ) {}

  async findByUserId(userId: string): Promise<FeeEntity[]> {
    return this.repo.find({ where: { userId } });
  }

  // TODO: Implement domain-specific methods
}
