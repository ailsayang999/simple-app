export interface TransactionDto {
  id: string;
  accountId: string;
  holdingId: string;
  tradeDate: string;
  type: string; // "BUY" | "SELL" | "DEPOSIT" | "WITHDRAW" | "DIVIDEND" | "INTEREST"
  symbol: string;
  currency: string;

  quantity: number;
  price: number;

  // ✅ 新增：只在 DEPOSIT/WITHDRAW/DIVIDEND/INTEREST 有意義
  amount?: number | null;

  fee: number;

  // ✅ ✅ 新增：交易稅（正式版）
  tax: number;

  totalAmount: number;
  note?: string | null;
}

// ✅ ✅ UI 專用：把 tradeDate 轉成 Date（PrimeNG date filter 需要）
// ✅ UI/PrimeNG/計算用：tradeDate 變成 Date
export type TransactionVm = Omit<TransactionDto, 'tradeDate'> & {
  tradeDate: Date;
};


export interface CreateTransactionDto {
  accountId: string;
  holdingId: string;
  tradeDate: string; // ISO string (只用日期也可以)
  type: string;

  quantity: number;
  price: number;

  // ✅ 新增：只在 DEPOSIT/WITHDRAW/DIVIDEND/INTEREST 必填（由後端驗證）
  amount?: number | null;

  fee: number;

  // ✅ ✅ 新增：交易稅（正式版）
  tax: number;

  note?: string | null;
}

export interface UpdateTransactionDto {
  accountId: string;
  holdingId: string;
  tradeDate: string;
  type: string;

  quantity: number;
  price: number;

  amount?: number | null;

  fee: number;

  // ✅ ✅ 新增：交易稅（正式版）
  tax: number;

  note?: string | null;
}
