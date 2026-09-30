import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountStatusDto } from './dto/update-status.dto';
import { MutateBalanceDto } from './dto/mutate-balance.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createAccount(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateAccountDto,
  ) {
    if (!userId) {
      throw new BadRequestException('User ID could not be identified from authentication');
    }
    return this.accountService.createAccount(userId, dto);
  }

  /**
   * Admin: GET /accounts/admin/all — paginated listing of all accounts
   * Note: must be declared before :id routes so NestJS doesn't treat 'admin' as a param
   */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard)
  async getAllAccounts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.accountService.getAllAccounts(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAccounts(@CurrentUser('sub') userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID could not be identified from authentication');
    }
    const accounts = await this.accountService.getAccountsForUser(userId);
    return { accounts };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getAccount(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.accountService.getAccountById(id, userId);
  }

  @Get(':id/balance')
  @UseGuards(JwtAuthGuard)
  async getAccountBalance(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.accountService.getAccountBalance(id, userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAccountStatusDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.accountService.updateAccountStatus(id, dto.status, userId);
  }

  /**
   * Internal balance mutation endpoint for Transaction Service
   */
  @Post('internal/mutate-balance')
  @HttpCode(HttpStatus.OK)
  async mutateBalance(@Body() dto: MutateBalanceDto) {
    return this.accountService.mutateBalance(dto);
  }
}
