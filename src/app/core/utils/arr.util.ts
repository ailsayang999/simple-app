// src/app/core/utils/arr.util.ts
import { TransactionDto } from '../models/transaction.model';

export interface ArrResult {
  symbol: string;
  currency: string;
  years: number;
  totalInvested: number;
  currentValue: number;
  arr: number; // 0.1234 表示 12.34%（這裡就是 XIRR）
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

interface CashFlow {
  tYears: number; // 與第一筆現金流相差幾年
  amount: number; // 正 = 流入，負 = 流出
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_PER_YEAR = 365.25;
const MS_PER_YEAR = MS_PER_DAY * DAYS_PER_YEAR;

/** 給定利率 r，計算 NPV */
function npv(rate: number, cashflows: CashFlow[]): number {
  return cashflows.reduce((sum, cf) => {
    const denom = Math.pow(1 + rate, cf.tYears);
    if (!Number.isFinite(denom) || denom === 0) return sum;
    return sum + cf.amount / denom;
  }, 0);
}

/**
 * 用二分法求解 XIRR
 * 回傳 annual rate（例如 0.12 = 12%）
 */
function solveXirr(cashflows: CashFlow[]): number {
  if (!cashflows.length) return 0;

  const hasPositive = cashflows.some((c) => c.amount > 0);
  const hasNegative = cashflows.some((c) => c.amount < 0);
  if (!hasPositive || !hasNegative) {
    // 如果全部同號，其實沒有 IRR 意義
    return 0;
  }

  let low = -0.9999; // -99.99%/year
  let high = 10; // 1000%/year
  let fLow = npv(low, cashflows);
  let fHigh = npv(high, cashflows);

  if (!Number.isFinite(fLow) || !Number.isFinite(fHigh)) return 0;
  // 如果兩端同號，無法保證有根，直接放棄
  if (fLow * fHigh > 0) return 0;

  const MAX_ITER = 100;
  const TOL = 1e-6;

  for (let i = 0; i < MAX_ITER; i++) {
    const mid = (low + high) / 2;
    const fMid = npv(mid, cashflows);

    if (!Number.isFinite(fMid)) return 0;
    if (Math.abs(fMid) < TOL) {
      return mid;
    }

    if (fLow * fMid <= 0) {
      // 根在 [low, mid]
      high = mid;
      fHigh = fMid;
    } else {
      // 根在 [mid, high]
      low = mid;
      fLow = fMid;
    }
  }

  return (low + high) / 2;
}

/**
 * 真正的 XIRR 版每檔標的年化報酬率：
 *
 * - BUY：視為現金流出（負數）
 * - SELL：視為現金流入（正數）
 * - DIVIDEND / INTEREST：視為現金流入（正數）
 * - 最後在 today 加上一筆「目前市值」的現金流
 *
 * 然後用 XIRR（不等期現金流 IRR）算年化報酬率
 */
export function calcArrPerHolding(
  holdingsMarket: HoldingMarketSnapshot[],
  allTransactions: TransactionDto[],
  now = new Date()
): ArrResult[] {
  const today = toDateOnly(now);

  return holdingsMarket.map((h) => {
    // 只抓同一檔標的 + 幣別的相關交易
    const related = allTransactions.filter(
      (t) =>
        t.symbol === h.symbol &&
        t.currency === h.currency &&
        (t.type === 'BUY' || t.type === 'SELL' || t.type === 'DIVIDEND' || t.type === 'INTEREST')
    );

    // 沒有任何交易 & 沒市值 → 直接 0
    if (related.length === 0 && h.marketValue <= 0) {
      return {
        symbol: h.symbol,
        currency: h.currency,
        years: 0,
        totalInvested: 0,
        currentValue: h.marketValue,
        arr: 0,
      };
    }

    // 先組出「日期 + 金額」的 raw 現金流
    const rawFlows = related.map((t) => {
      const d = toDateOnly(new Date(t.tradeDate));
      let amount = 0;

      // 注意：你的 totalAmount 現在是：
      // BUY / DEPOSIT / DIVIDEND / INTEREST: 正
      // SELL / WITHDRAW: 負
      // 我們在這邊全部用「投資人角度」重新定義正負號
      switch (t.type) {
        case 'BUY':
          // 投資人掏錢買入 → 現金流出
          amount = -Math.abs(t.totalAmount);
          break;
        case 'SELL':
          // 賣出拿回現金 → 流入
          amount = Math.abs(t.totalAmount);
          break;
        case 'DIVIDEND':
        case 'INTEREST':
          // 股利 / 利息 → 流入
          amount = Math.abs(t.totalAmount);
          break;
        default:
          amount = 0;
      }

      return { date: d, amount };
    });

    // 加上「今天的市值」當成期末現金流（流入）
    if (h.marketValue !== 0) {
      rawFlows.push({ date: today, amount: h.marketValue });
    }

    // 把日期轉成「跟第一天相比的年數」
    if (!rawFlows.length) {
      return {
        symbol: h.symbol,
        currency: h.currency,
        years: 0,
        totalInvested: 0,
        currentValue: h.marketValue,
        arr: 0,
      };
    }

    const firstDate = rawFlows.map((f) => f.date).sort((a, b) => a.getTime() - b.getTime())[0];

    const cashflows: CashFlow[] = rawFlows.map((f) => ({
      tYears: (f.date.getTime() - firstDate.getTime()) / MS_PER_YEAR,
      amount: f.amount,
    }));

    const years = (today.getTime() - firstDate.getTime()) / MS_PER_YEAR;

    const totalInvested = cashflows
      .filter((c) => c.amount < 0)
      .reduce((sum, c) => sum + Math.abs(c.amount), 0);

    const currentValue = h.marketValue;

    if (!Number.isFinite(years) || years <= 0 || totalInvested <= 0) {
      return {
        symbol: h.symbol,
        currency: h.currency,
        years: Math.max(years, 0),
        totalInvested,
        currentValue,
        arr: 0,
      };
    }

    let irr = solveXirr(cashflows);

    if (!Number.isFinite(irr)) irr = 0;

    // 安全 clamp：[-99.99%, 1000%]
    if (irr < -0.9999) irr = -0.9999;
    if (irr > 10) irr = 10;

    return {
      symbol: h.symbol,
      currency: h.currency,
      years,
      totalInvested,
      currentValue,
      arr: irr,
    };
  });
}
