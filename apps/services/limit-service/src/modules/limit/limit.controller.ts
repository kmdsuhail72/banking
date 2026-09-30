import { Controller, Get, UseGuards } from '@nestjs/common';
import { LimitService } from './limit.service';

@Controller('limit')
export class LimitController {
  constructor(private readonly service: LimitService) {}

  @Get()
  async findAll() {
    return { message: 'Daily/monthly transaction limits endpoint', data: [] };
  }
}
