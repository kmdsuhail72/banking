import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthzService } from './authz.service';

@Controller('authz')
export class AuthzController {
  constructor(private readonly service: AuthzService) {}

  @Get()
  async findAll() {
    return { message: 'RBAC authorization service endpoint', data: [] };
  }
}
