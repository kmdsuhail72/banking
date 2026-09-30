import { IsOptional, IsString } from "class-validator";
import { UpdateCustomerDto, ICustomerAddress } from "@banking/shared-types";

export class UpdateCustomerRequestDto implements UpdateCustomerDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsOptional()
  dateOfBirth?: string;

  @IsOptional()
  address?: ICustomerAddress;
}
