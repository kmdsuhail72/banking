import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { LoginDto } from "@banking/shared-types";

export class LoginUserDto implements LoginDto {
  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;

  @IsString()
  @IsNotEmpty({ message: "Password is required" })
  password: string;
}
