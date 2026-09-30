import { Controller, Get, UseGuards } from '@nestjs/common';
import { FraudService } from './fraud.service';

@Controller('fraud')
export class FraudController {
  constructor(private readonly service: FraudService) {}

  @Get()
  async findAll() {
    return { message: 'Real-time fraud scoring and case management endpoint', data: [] };
  }
}
