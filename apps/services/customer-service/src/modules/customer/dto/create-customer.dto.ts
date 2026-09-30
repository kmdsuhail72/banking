import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { CreateCustomerDto, ICustomerAddress } from "@banking/shared-types";

export class CreateCustomerRequestDto implements CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsOptional()
  dateOfBirth?: string;

  @IsOptional()
  address?: ICustomerAddress;
}
