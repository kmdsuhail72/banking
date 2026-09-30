import { IsString, IsNotEmpty, IsOptional, Length, Matches } from 'class-validator';

export class CreateBeneficiaryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9]+$/, { message: 'accountNumber must be alphanumeric' })
  accountNumber: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
    message: 'ifscCode must be a valid IFSC code (e.g. HDFC0001234)',
  })
  ifscCode?: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  nickname?: string;
}
