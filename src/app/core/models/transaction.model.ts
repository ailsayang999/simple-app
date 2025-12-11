// src/app/core/models/transaction.model.ts

export interface TransactionDto {
  id: string;
  accountId: string;
  holdingId?: string | null;
  tradeDate: string; // ISO string
  type: string; // "BUY" | "SELL" | "DEPOSIT" | "WITHDRAW" | "DIVIDEND" | "INTEREST"
  symbol: string;
  quantity: number;
  price: number;
  fee: number;
  totalAmount: number;
  currency: string;
}

export interface CreateTransactionDto {
  accountId: string;
  holdingId?: string | null;
  tradeDate: string; // ISO string (只用日期也可以)
  type: string;
  symbol: string;
  quantity: number;
  price: number;
  fee: number;
  totalAmount: number;
  currency: string;
}
