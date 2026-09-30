import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class TransferDto {
  @IsString()
  @IsNotEmpty({ message: 'sourceAccountId is required' })
  sourceAccountId: string;

  @IsString()
  @IsNotEmpty({ message: 'destinationAccountId is required' })
  destinationAccountId: string;

  @IsInt({ message: 'amountMinor must be an integer (in paise)' })
  @IsPositive({ message: 'amountMinor must be greater than 0' })
  amountMinor: number;

  @IsOptional()
  @IsString()
  description?: string;
}
