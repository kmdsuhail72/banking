import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';

@Controller('support')
export class SupportController {
  constructor(private readonly service: SupportService) {}

  @Get()
  async findAll() {
    return { message: 'Customer support tickets endpoint', data: [] };
  }
}
