// src/app/core/models/holding.model.ts

export interface HoldingDto {
  id: string;
  symbol: string;
  name: string;
  assetType: string; // "ETF" | "STOCK" | "FUND" | "CASH" ...
  quantity: number;
  avgCost: number;
  currency: string;
  marketValue: number;
  unrealizedPnl: number;
  returnRate: number; // 報酬率 %
}

export interface CreateHoldingDto {
  symbol: string;
  name: string;
  assetType: string;
  currency: string;
  quantity: number;
  avgCost: number;
}

export interface UpdateHoldingDto {
  symbol: string;
  name: string;
  assetType: string;
  currency: string;
  quantity: number;
  avgCost: number;
}
