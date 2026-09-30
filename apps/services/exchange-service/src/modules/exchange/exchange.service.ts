import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ExchangeEntity } from "../../entities/exchange.entity";

/** Currency exchange rates and FX conversion */
@Injectable()
export class ExchangeService {
  constructor(
    @InjectRepository(ExchangeEntity)
    private readonly repo: Repository<ExchangeEntity>,
  ) {}

  async findByUserId(userId: string): Promise<ExchangeEntity[]> {
    return this.repo.find({ where: { userId } });
  }

  // TODO: Implement domain-specific methods
}
