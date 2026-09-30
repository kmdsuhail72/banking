import { Controller, Get, UseGuards } from '@nestjs/common';
import { EmiService } from './emi.service';

@Controller('emi')
export class EmiController {
  constructor(private readonly service: EmiService) {}

  @Get()
  async findAll() {
    return { message: 'EMI schedule and repayment tracking endpoint', data: [] };
  }
}
