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

interface HoldingMarketSnapshot {
  symbol: string;
  currency: string;
  marketValue: number;
}

/** 把時間只取「日期」，避免同一天造成 years 超小的小數 */
function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * 簡化版每檔標的 ARR：
 *
 * - 只看 BUY 交易（視為投入現金）
 * - startDate = 第一筆 BUY 的日期（只取日，不取時間）
 * - years = (現在日期 - 第一筆 BUY 日期) / 365.25
 * - 持有未滿 3 個月的標的：年化時採用最少 0.25 年，避免誇張爆衝
 * - ARR = (currentValue / totalInvested)^(1/annualizeYears) - 1
 */
export function calcArrPerHolding(
  holdingsMarket: HoldingMarketSnapshot[],
  allTransactions: TransactionDto[],
  now = new Date()
): ArrResult[] {
  const today = toDateOnly(now);
  const msPerDay = 1000 * 60 * 60 * 24;
  const MIN_YEARS_FOR_ANNUALIZE = 0.25; // 至少用 0.25 年來年化（約 3 個月）
  const MAX_ARR = 10; // 安全上限：1000%/year

  return holdingsMarket.map((h) => {
    const relatedBuys = allTransactions.filter(
      (t) => t.symbol === h.symbol && t.currency === h.currency && t.type === 'BUY'
    );

    // 沒有任何 BUY / 市值 <= 0 → ARR 視為 0
    if (relatedBuys.length === 0 || h.marketValue <= 0) {
      return {
        symbol: h.symbol,
        currency: h.currency,
        years: 0,
        totalInvested: 0,
        currentValue: h.marketValue,
        arr: 0,
      };
    }

    // 總投入金額（只看 BUY）
    const totalInvested = relatedBuys.reduce((sum, t) => sum + Math.abs(t.totalAmount), 0);

    const firstDate = relatedBuys
      .map((t) => toDateOnly(new Date(t.tradeDate)))
      .sort((a, b) => a.getTime() - b.getTime())[0];

    const days = (today.getTime() - firstDate.getTime()) / msPerDay;
    const years = days / 365.25;

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
    if (!Number.isFinite(ratio) || ratio <= 0) {
      return {
        symbol: h.symbol,
        currency: h.currency,
        years,
        totalInvested,
        currentValue: h.marketValue,
        arr: 0,
      };
    }

    // 年化時至少當成持有 0.25 年，避免剛買就爆衝
    const annualizeYears = Math.max(years, MIN_YEARS_FOR_ANNUALIZE);
    let rawArr = Math.pow(ratio, 1 / annualizeYears) - 1;

    if (!Number.isFinite(rawArr)) {
      rawArr = 0;
    }

    // 安全 clamp，避免 chart 出現 1e+200 這種鬼東西
    if (rawArr > MAX_ARR) rawArr = MAX_ARR;
    if (rawArr < -0.9999) rawArr = -0.9999;

    return {
      symbol: h.symbol,
      currency: h.currency,
      years,
      totalInvested,
      currentValue: h.marketValue,
      arr: rawArr,
    };
  });
}
