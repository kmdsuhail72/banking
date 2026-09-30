import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmiEntity } from "../../entities/emi.entity";

/** EMI schedule and repayment tracking */
@Injectable()
export class EmiService {
  constructor(
    @InjectRepository(EmiEntity)
    private readonly repo: Repository<EmiEntity>,
  ) {}

  async findByUserId(userId: string): Promise<EmiEntity[]> {
    return this.repo.find({ where: { userId } });
  }

  // TODO: Implement domain-specific methods
}
