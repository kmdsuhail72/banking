import { IsString, IsOptional, Length, Matches } from 'class-validator';

export class UpdateBeneficiaryDto {
  @IsString()
  @IsOptional()
  @Length(1, 50)
  nickname?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
    message: 'ifscCode must be a valid IFSC code (e.g. HDFC0001234)',
  })
  ifscCode?: string;
}
