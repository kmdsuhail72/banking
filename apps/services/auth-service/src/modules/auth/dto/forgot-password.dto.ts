import { IsEmail } from "class-validator";

export class ForgotPasswordDto {
  @IsEmail({}, { message: "Invalid email address format" })
  email: string;
}
