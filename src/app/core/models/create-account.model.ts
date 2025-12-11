export interface CreateAccountDto {
  name: string;
  accountType: string; // 預設 "CASH"
  baseCurrency: string; // 預設 "TWD"
}
