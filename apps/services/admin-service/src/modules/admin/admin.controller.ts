import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get()
  async findAll() {
    return { message: 'Back-office admin panel endpoint', data: [] };
  }
}
