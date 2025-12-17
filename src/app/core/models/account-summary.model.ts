// src/app/core/models/account-summary.model.ts
export interface AccountSummaryDto {
  accountId: string;
  baseCurrency: string;

  totalMarketValue: number;
  totalInvested: number;
  netInvested: number;

  realizedProfit: number;
  unrealizedProfit: number;
  totalProfit: number;

  realizedReturnRate: number;
}
