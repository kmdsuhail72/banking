import { AccountType } from "@banking/shared-types";

export function generateAccountNumber(
  type: AccountType = AccountType.SAVINGS,
): string {
  const prefixMap: Record<AccountType, string> = {
    [AccountType.SAVINGS]: "SB",
    [AccountType.CURRENT]: "CA",
    [AccountType.SALARY]: "SL",
  };

  const prefix = prefixMap[type] || "SB";
  const randomDigits = Math.floor(
    1000000000 + Math.random() * 9000000000,
  ).toString();
  return `${prefix}${randomDigits}`;
}
