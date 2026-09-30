import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { TransferDto } from './dto/transfer.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, IdempotencyKeyParam } from './decorators/transaction.decorators';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('deposit')
  @HttpCode(HttpStatus.OK)
  async deposit(
    @CurrentUser('sub') userId: string,
    @Body() dto: DepositDto,
    @IdempotencyKeyParam() idempotencyKey?: string,
  ) {
    if (!userId) {
      throw new BadRequestException('User ID could not be identified from authentication');
    }
    return this.transactionService.deposit(userId, dto, idempotencyKey);
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  async withdraw(
    @CurrentUser('sub') userId: string,
    @Body() dto: WithdrawDto,
    @IdempotencyKeyParam() idempotencyKey?: string,
  ) {
    if (!userId) {
      throw new BadRequestException('User ID could not be identified from authentication');
    }
    return this.transactionService.withdraw(userId, dto, idempotencyKey);
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  async transfer(
    @CurrentUser('sub') userId: string,
    @Body() dto: TransferDto,
    @IdempotencyKeyParam() idempotencyKey?: string,
  ) {
    if (!userId) {
      throw new BadRequestException('User ID could not be identified from authentication');
    }
    return this.transactionService.transfer(userId, dto, idempotencyKey);
  }

  @Get()
  async getTransactions(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryTransactionsDto,
  ) {
    if (!userId) {
      throw new BadRequestException('User ID could not be identified from authentication');
    }
    return this.transactionService.getTransactions(userId, query);
  }

  @Get(':id')
  async getTransaction(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.transactionService.getTransactionById(id, userId);
  }
}
