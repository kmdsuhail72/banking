import { Controller, Get, UseGuards } from '@nestjs/common';
import { LoanService } from './loan.service';

@Controller('loan')
export class LoanController {
  constructor(private readonly service: LoanService) {}

  @Get()
  async findAll() {
    return { message: 'Loan origination and management endpoint', data: [] };
  }
}
