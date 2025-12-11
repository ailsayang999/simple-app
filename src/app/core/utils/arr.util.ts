// src/app/core/utils/arr.util.ts
import { TransactionDto } from '../models/transaction.model';

export interface ArrResult {
  symbol: string;
  currency: string;
  years: number;
  totalInvested: number;
  currentValue: number;
  arr: number; // 0.1234 表示 12.34%
}

/**
 * 以「簡化版」方式計算每個標的的年化報酬率 ARR。
 * 假設：
 * - 只看 BUY 交易（持有成本）
 * - startDate = 第一筆 BUY 日期
 * - ARR = (currentValue / totalInvested)^(1/years) - 1
 */
export function calcArrPerHolding(
  holdingsMarket: { symbol: string; currency: string; marketValue: number }[],
  allTransactions: TransactionDto[],
  now = new Date()
): ArrResult[] {
  return holdingsMarket.map((h) => {
    const txs = allTransactions.filter(
      (t) => t.symbol === h.symbol && t.currency === h.currency && t.type === 'BUY'
    );

    if (txs.length === 0 || h.marketValue <= 0) {
      return {
        symbol: h.symbol,
        currency: h.currency,
        years: 0,
        totalInvested: 0,
        currentValue: h.marketValue,
        arr: 0,
      };
    }

    const totalInvested = txs.reduce((sum, t) => sum + Math.abs(t.totalAmount), 0);

    const firstDate = txs
      .map((t) => new Date(t.tradeDate))
      .sort((a, b) => a.getTime() - b.getTime())[0];

    const years = (now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

    if (years <= 0 || totalInvested <= 0) {
      return {
        symbol: h.symbol,
        currency: h.currency,
        years: Math.max(years, 0),
        totalInvested,
        currentValue: h.marketValue,
        arr: 0,
      };
    }

    const ratio = h.marketValue / totalInvested;
    const arr = Math.pow(ratio, 1 / years) - 1;

    return {
      symbol: h.symbol,
      currency: h.currency,
      years,
      totalInvested,
      currentValue: h.marketValue,
      arr,
    };
  });
}
