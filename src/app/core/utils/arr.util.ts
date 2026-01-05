// src/app/core/utils/arr.util.ts
//import { TransactionDto } from '../models/transaction.model';

export type ArrTxInput = {
  tradeDate: Date | string;
  totalAmount: number;
  type: string;
  symbol: string;
  currency: string;
};

export interface ArrResult {
  symbol: string;
  currency: string;
  years: number;
  totalInvested: number;
  currentValue: number;
  arr: number; // 0.12 = 12% (XIRR)
}

interface HoldingMarketSnapshot {
  symbol: string;
  currency: string;
  marketValue: number;
}

function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

interface CashFlow {
  tYears: number;
  amount: number; // ✅ 正：流入（投資人收回錢），負：流出（投資人投入）
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_PER_YEAR = 365.25;
const MS_PER_YEAR = MS_PER_DAY * DAYS_PER_YEAR;

function npv(rate: number, cashflows: CashFlow[]): number {
  return cashflows.reduce((sum, cf) => {
    const denom = Math.pow(1 + rate, cf.tYears);
    if (!Number.isFinite(denom) || denom === 0) return sum;
    return sum + cf.amount / denom;
  }, 0);
}

/**
 * ✅ 產品級 XIRR：用「區間掃描」找 root（避免你之前 fLow*fHigh > 0 直接回 0）
 */
function solveXirr(cashflows: CashFlow[]): number {
  const hasPos = cashflows.some((c) => c.amount > 0);
  const hasNeg = cashflows.some((c) => c.amount < 0);
  if (!hasPos || !hasNeg) return 0;

  // 掃描區間
  const candidates: Array<[number, number]> = [
    [-0.9999, -0.9],
    [-0.9, -0.5],
    [-0.5, -0.1],
    [-0.1, 0.0],
    [0.0, 0.1],
    [0.1, 0.3],
    [0.3, 0.6],
    [0.6, 1.0],
    [1.0, 2.0],
    [2.0, 5.0],
    [5.0, 10.0],
  ];

  let bracket: [number, number] | null = null;

  for (const [low, high] of candidates) {
    const fLow = npv(low, cashflows);
    const fHigh = npv(high, cashflows);
    if (!Number.isFinite(fLow) || !Number.isFinite(fHigh)) continue;

    if (fLow === 0) return low;
    if (fHigh === 0) return high;

    if (fLow * fHigh < 0) {
      bracket = [low, high];
      break;
    }
  }

  if (!bracket) return 0;

  let [low, high] = bracket;
  let fLow = npv(low, cashflows);
  let fHigh = npv(high, cashflows);

  const MAX_ITER = 120;
  const TOL = 1e-7;

  for (let i = 0; i < MAX_ITER; i++) {
    const mid = (low + high) / 2;
    const fMid = npv(mid, cashflows);

    if (!Number.isFinite(fMid)) return 0;
    if (Math.abs(fMid) < TOL) return mid;

    if (fLow * fMid <= 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }

  return (low + high) / 2;
}

// -- helper --
function parseToDate(d: Date | string): Date | null {
  const dt = d instanceof Date ? d : new Date(d);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

function toDateOnlySafe(d: Date | null): Date | null {
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function calcArrPerHolding(
  holdingsMarket: HoldingMarketSnapshot[],
  allTransactions: ArrTxInput[], // 日期轉換改成「同時支援 Date/string + 防呆」
  now = new Date()
): ArrResult[] {
  const today = toDateOnly(now);

  return holdingsMarket.map((h) => {
    // ✅ 只抓同一標的 + 幣別（用 symbol/currency）
    const related = allTransactions.filter(
      (t) =>
        t.symbol === h.symbol &&
        t.currency === h.currency &&
        (t.type === 'BUY' ||
          t.type === 'SELL' ||
          t.type === 'DIVIDEND' ||
          t.type === 'INTEREST' ||
          t.type === 'DEPOSIT' ||
          t.type === 'WITHDRAW')
    );

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

    const rawFlows = related
      .map((t) => {
        const dt = toDateOnlySafe(parseToDate(t.tradeDate));
        if (!dt) return null;

        return {
          date: dt,
          amount: Number(t.totalAmount), // ✅ 投資人現金流方向
        };
      })
      .filter((x): x is { date: Date; amount: number } => !!x);

    // ✅ 期末：把目前市值當作「如果今天全部賣出會拿回來的錢」→ 流入
    if (h.marketValue !== 0) rawFlows.push({ date: today, amount: h.marketValue });

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
    const years = (today.getTime() - firstDate.getTime()) / MS_PER_YEAR;

    const cashflows: CashFlow[] = rawFlows.map((f) => ({
      tYears: (f.date.getTime() - firstDate.getTime()) / MS_PER_YEAR,
      amount: f.amount,
    }));

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
