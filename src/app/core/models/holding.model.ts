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

  // ✅ 未實現損益（不含股利/利息）
  unrealizedPnl: number;

  // ✅ 未實現報酬率（不含股利，%）
  returnRate: number; // 報酬率 %

  // ✅ 累積股利（已實現）
  realizedDividend: number;

  // ✅ ✅ 新增：已實現差價損益（含 fee + tax）
  realizedTradePnl: number;

  // ✅ ✅ 新增：已實現收入（股利 + 利息）
  realizedIncome: number;

  // ✅ ✅ 新增：真實已實現獲利（差價 + 股利 + 利息）
  realizedPnl: number;

  // ✅ 總損益（含已實現全部）
  totalPnl: number;

  // ✅ 總報酬率（含已實現全部，%）
  totalReturnRate: number;
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
