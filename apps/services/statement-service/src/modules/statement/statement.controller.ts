import { Controller, Get, UseGuards } from '@nestjs/common';
import { StatementService } from './statement.service';

@Controller('statement')
export class StatementController {
  constructor(private readonly service: StatementService) {}

  @Get()
  async findAll() {
    return { message: 'Account statements (PDF/CSV) endpoint', data: [] };
  }
}
