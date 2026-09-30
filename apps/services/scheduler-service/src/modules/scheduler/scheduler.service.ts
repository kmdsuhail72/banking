import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SchedulerEntity } from "../../entities/scheduler.entity";

/** Cron-based batch job triggers */
@Injectable()
export class SchedulerService {
  constructor(
    @InjectRepository(SchedulerEntity)
    private readonly repo: Repository<SchedulerEntity>,
  ) {}

  async findByUserId(userId: string): Promise<SchedulerEntity[]> {
    return this.repo.find({ where: { userId } });
  }

  // TODO: Implement domain-specific methods
}
