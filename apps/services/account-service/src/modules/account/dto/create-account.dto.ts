import { IsEnum, IsOptional, IsString } from "class-validator";
import { AccountType } from "@banking/shared-types";

export class CreateAccountDto {
  @IsEnum(AccountType, {
    message: "type must be one of: SAVINGS, CURRENT, SALARY",
  })
  type: AccountType;

  @IsOptional()
  @IsString()
  currency?: string;
}
