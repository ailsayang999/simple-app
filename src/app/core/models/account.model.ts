export enum AccountType {
  Cash = 'CASH',
  Brokerage = 'BROKERAGE',
  Crypto = 'CRYPTO',
  Other = 'OTHER',
}

export interface AccountDto {
  id: string; // Guid → string
  name: string;
  accountType: AccountType; // "CASH" | "BROKERAGE" | "CRYPTO"
  baseCurrency: string;
  totalValue: number;
}
