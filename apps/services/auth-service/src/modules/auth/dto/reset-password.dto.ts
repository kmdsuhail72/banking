import { IsString, MinLength, MaxLength, Matches } from "class-validator";

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @MaxLength(100, { message: "Password cannot exceed 100 characters" })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message:
      "Password must contain uppercase, lowercase, number and special character",
  })
  newPassword: string;
}
