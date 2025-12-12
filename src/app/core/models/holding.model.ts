export interface HoldingDto {
  id: string;
  accountId: string;

  symbol: string;
  name: string;
  assetType: string; // "ETF" | "STOCK" | "FUND" | "CASH" ...
  currency: string;

  // ✅ 正式版：由交易重建出來的部位
  quantity: number;
  avgCost: number;

  // ✅ 正式版：市價由使用者更新（或未來串行情）
  marketPrice: number;

  // ✅ 可存可算：我們後端已算好回傳（dashboard 快）
  marketValue: number;
  unrealizedPnl: number;
  returnRate: number; // 報酬率 %
}

export interface CreateHoldingDto {
  symbol: string;
  name: string;
  assetType: string;
  currency: string;

  // ✅ 建立時允許給初始市價（可為 0）
  marketPrice: number;
}

export interface UpdateHoldingDto {
  symbol: string;
  name: string;
  assetType: string;
  currency: string;
}

export interface UpdateMarketPriceDto {
  marketPrice: number;
}
