import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RecurringDepositEntity } from "../../entities/recurringdeposit.entity";

/** Recurring deposit management */
@Injectable()
export class RecurringDepositService {
  constructor(
    @InjectRepository(RecurringDepositEntity)
    private readonly repo: Repository<RecurringDepositEntity>,
  ) {}

  async findByUserId(userId: string): Promise<RecurringDepositEntity[]> {
    return this.repo.find({ where: { userId } });
  }

  // TODO: Implement domain-specific methods
}
