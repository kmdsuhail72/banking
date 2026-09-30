import { IsOptional, IsString } from "class-validator";
import { RefreshTokenDto } from "@banking/shared-types";

export class RefreshTokenRequestDto implements RefreshTokenDto {
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
