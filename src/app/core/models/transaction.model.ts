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
  fee: number;
  totalAmount: number;
  note?: string | null;
}

export interface CreateTransactionDto {
  accountId: string;
  holdingId: string;
  tradeDate: string; // ISO string (只用日期也可以)
  type: string;
  quantity: number;
  price: number;
  fee: number;
  note?: string | null;
}

export interface UpdateTransactionDto {
  accountId: string;
  holdingId: string;
  tradeDate: string;
  type: string;
  quantity: number;
  price: number;
  fee: number;
  note?: string | null;
}
