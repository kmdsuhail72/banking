import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  Headers,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import * as jwt from 'jsonwebtoken';
import { appConfig } from '@banking/config';
import { JwtPayload } from '@banking/shared-types';

@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  private extractUserId(req: any, headers: Record<string, string>): string {
    const headerUserId = headers['x-user-id'];
    if (headerUserId) return headerUserId;

    const authHeader = headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, appConfig.jwt.accessSecret) as JwtPayload;
        return decoded.sub;
      } catch {
        throw new UnauthorizedException('Invalid access token');
      }
    }

    throw new UnauthorizedException('User authentication required');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCustomer(@Body() dto: CreateCustomerDto) {
    return this.customerService.createCustomer(dto);
  }

  @Get('me')
  async getMe(@Req() req: any, @Headers() headers: Record<string, string>) {
    const userId = this.extractUserId(req, headers);
    return this.customerService.getMe(userId);
  }

  @Get(':id')
  async getCustomerById(@Param('id') id: string) {
    return this.customerService.getCustomerById(id);
  }

  @Patch(':id')
  async updateCustomer(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customerService.updateCustomer(id, dto);
  }
}
