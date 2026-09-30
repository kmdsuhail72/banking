import { IsEnum } from "class-validator";
import { AccountStatus } from "@banking/shared-types";

export class UpdateAccountStatusDto {
  @IsEnum(AccountStatus, {
    message: "status must be one of: ACTIVE, BLOCKED, CLOSED, PENDING",
  })
  status: AccountStatus;
}
