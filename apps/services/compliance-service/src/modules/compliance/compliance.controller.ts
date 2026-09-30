import { Controller, Get, UseGuards } from '@nestjs/common';
import { ComplianceService } from './compliance.service';

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly service: ComplianceService) {}

  @Get()
  async findAll() {
    return { message: 'AML checks and regulatory reporting endpoint', data: [] };
  }
}
