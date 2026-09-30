import { IsInt, IsNotEmpty, IsPositive, IsIn, IsOptional, IsString } from 'class-validator';

export class MutateBalanceDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsInt()
  @IsPositive()
  amountMinor: number;

  @IsIn(['CREDIT', 'DEBIT'], {
    message: 'operation must be either CREDIT or DEBIT',
  })
  operation: 'CREDIT' | 'DEBIT';

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;
}
