import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class DepositDto {
  @IsString()
  @IsNotEmpty({ message: 'accountId is required' })
  accountId: string;

  @IsInt({ message: 'amountMinor must be an integer (in paise)' })
  @IsPositive({ message: 'amountMinor must be greater than 0' })
  amountMinor: number;

  @IsOptional()
  @IsString()
  description?: string;
}
