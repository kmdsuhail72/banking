import { Controller, Get, UseGuards } from '@nestjs/common';
import { RecurringDepositService } from './recurringdeposit.service';

@Controller('recurringdeposit')
export class RecurringDepositController {
  constructor(private readonly service: RecurringDepositService) {}

  @Get()
  async findAll() {
    return { message: 'Recurring deposit management endpoint', data: [] };
  }
}
