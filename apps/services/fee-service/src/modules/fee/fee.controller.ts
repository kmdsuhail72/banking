import { Controller, Get, UseGuards } from '@nestjs/common';
import { FeeService } from './fee.service';

@Controller('fee')
export class FeeController {
  constructor(private readonly service: FeeService) {}

  @Get()
  async findAll() {
    return { message: 'Transaction fee computation endpoint', data: [] };
  }
}
