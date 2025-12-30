import { Component, inject, Signal, computed, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { HasRoleDirective } from '../../shared/directives/has-role.directive';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { Permission } from '../../auth/rbac';
import { Role } from '../../auth/rbac';
// ⭐ 新增：拿 routerOutletData 用
import { ROUTER_OUTLET_DATA } from '@angular/router';
// ⭐ 新增：把 ShellContext 型別拿進來用
import type { ShellContext } from '../../layout/layout-shell';

import { HoldingService } from '../../core/services/holding.service';
import { TransactionService } from '../../core/services/transaction.service';
import { AccountService } from '../../core/services/account.service';
import { calcArrPerHolding } from '../../core/utils/arr.util';

import { SignalrService } from '../../core/services/signalr.service';
import { FxRateService } from '../../core/services/fx-rate.service';

import { DestroyRef } from '@angular/core';

// ✅ NEW：Summary DTO
import { AccountSummaryDto } from '../../core/models/account-summary.model';

type FxCcy = 'USD' | 'EUR' | 'JPY' | 'CNY';

type FxRatePoint = {
  quoteCurrency?: string;
  baseCurrency?: string;
  rate: number;
  capturedAt?: string;
};

type FxHistoryPoint = {
  rate: number;
  capturedAt: string;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule, ChartModule, HasRoleDirective, HasPermissionDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  Role = Role; // ⭐⭐ 這行超重要，讓 HTML 可以用 Role.Admin
  Permission = Permission; // ✅ 給 template 使用 enum

  // ⭐ 新增：從 router-outlet 拿到 context（user + collapsed）
  private readonly _ctx = inject(ROUTER_OUTLET_DATA) as Signal<ShellContext | null>;

  // ⭐ 避免 template 一直 ?. ?. ?.：包成 computed 方便使用
  readonly user = computed(() => this._ctx()?.user ?? null);
  readonly collapsed = computed(() => this._ctx()?.collapsed ?? true);

  ///////////////////////////////////////////////////////////// 加一張「各標的 ARR %」的 bar chart /////////////////////////////////////////////////////////////
  private accountService = inject(AccountService);
  private holdingService = inject(HoldingService);
  private transactionService = inject(TransactionService);

  // Signal R
  private signalr = inject(SignalrService);
  private fxRateService = inject(FxRateService);
  // 各幣別的 fx rate  匯率（最新數字）
  usdRate = signal<number>(0);
  eurRate = signal<number>(0);
  jpyRate = signal<number>(0);
  cnyRate = signal<number>(0);
  private lastFxPushAt = 0;

  // ✅ 匯率圖表 data / options（用 signal 存 data：推播來就更新）
  usdRateData = signal<any>(null);
  eurRateData = signal<any>(null);
  jpyRateData = signal<any>(null);
  cnyRateData = signal<any>(null);

  //先定義幣別 enum/常數 + 集中管理 config
  FX_CCY = ['USD', 'EUR', 'JPY', 'CNY'] as const;

  fxMaxPointsByCcy = {
    USD: 10,
    EUR: 5,
    JPY: 20,
    CNY: 20,
  };

  // 做一個「幣別 → 對應 chart signal」的 getter（關鍵）
  private fxChartSignal(ccy: FxCcy) {
    switch (ccy) {
      case 'USD':
        return this.usdRateData;
      case 'EUR':
        return this.eurRateData;
      case 'JPY':
        return this.jpyRateData;
      case 'CNY':
        return this.cnyRateData;
    }
  }

  private applyFxHistory(ccy: FxCcy, rows: FxHistoryPoint[]) {
    const maxPoints = this.fxMaxPointsByCcy[ccy];
    const labelMap: Record<FxCcy, string> = {
      USD: '美元匯率',
      EUR: '歐元匯率',
      JPY: '日幣匯率',
      CNY: '人民幣匯率',
    };

    const chart = this.buildLineChartData(labelMap[ccy], rows, maxPoints);
    this.fxChartSignal(ccy).set(chart);

    const last = rows.at(-1);
    if (last) this.setLatestFxRate(ccy, last.rate);
  }

  private applyFxPush(list: FxRatePoint[]) {
    for (const item of list) {
      const ccy = (item.quoteCurrency ?? '').toUpperCase() as FxCcy;
      if (!this.FX_CCY.includes(ccy)) continue;

      const t = item.capturedAt ? new Date(item.capturedAt) : new Date();
      this.setLatestFxRate(ccy, item.rate);

      const maxPoints = this.fxMaxPointsByCcy[ccy];
      const sig = this.fxChartSignal(ccy);
      sig.set(this.appendPoint(sig(), item.rate, t, maxPoints));
    }
  }

  private setLatestFxRate(ccy: FxCcy, rate: number) {
    switch (ccy) {
      case 'USD':
        this.usdRate.set(rate);
        break;
      case 'EUR':
        this.eurRate.set(rate);
        break;
      case 'JPY':
        this.jpyRate.set(rate);
        break;
      case 'CNY':
        this.cnyRate.set(rate);
        break;
    }
  }

  usdRateOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { display: false } },
  };

  eurRateOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { display: false } },
  };

  jpyRateOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { display: false } },
  };

  cnyRateOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { display: false } },
  };

  // 主帳戶（這邊簡單用第一個）
  mainAccountName = signal<string>('');
  private mainAccountId = signal<string | null>(null);

  // ✅ NEW：主帳戶 Summary（後端算好最乾淨）
  accountSummary = signal<AccountSummaryDto | null>(null);

  // ✅ 總資產（主帳戶）—— 改成吃 summary（避免 holdings 跟 summary 打架）
  totalNetWorth = computed(() => this.accountSummary()?.totalMarketValue ?? 0);

  // ✅ NEW：左側卡片要顯示的四個數字（全部吃 summary）
  totalInvested = computed(() => this.accountSummary()?.totalInvested ?? 0);
  unrealizedProfit = computed(() => this.accountSummary()?.unrealizedProfit ?? 0);
  realizedProfit = computed(() => this.accountSummary()?.realizedProfit ?? 0);
  totalProfit = computed(() => this.accountSummary()?.totalProfit ?? 0);

  // 共有的 ARR 計算結果（先算完，再切 top/bottom）
  private arrResults = computed(() => {
    const holdings = this.holdingService.holdings();
    const txs = this.transactionService.transactions();

    if (!holdings.length || !txs.length) return [];

    return calcArrPerHolding(
      holdings.map((h) => ({
        symbol: h.symbol,
        currency: h.currency,
        marketValue: h.marketValue,
      })),
      txs
    );
  });

  // 前 5 名 ARR
  // 前 5 名 ARR（其實是 XIRR）
  bestArrChartData = computed(() => {
    const results = [...this.arrResults()]
      .filter((r) => r.years > 0 && r.totalInvested > 0)
      .sort((a, b) => b.arr - a.arr)
      .slice(0, 5);

    if (!results.length) return null;

    const data = results.map((r) => ({
      x: r.symbol,
      y: r.arr * 100,
      totalInvested: r.totalInvested,
      currentValue: r.currentValue,
      isNegative: r.arr < 0,
    }));

    const backgroundColor = data.map((d) =>
      d.isNegative ? 'rgb(239, 68, 68)' : 'rgb(80, 69, 229)'
    );
    const hoverBackgroundColor = data.map((d) =>
      d.isNegative ? 'rgba(239, 68, 68, 0.85)' : 'rgba(80, 69, 229, 0.85)'
    );

    return {
      labels: results.map((r) => r.symbol),
      datasets: [
        {
          label: 'Best 5 XIRR (%)', // ⭐ 這行改名
          data,
          backgroundColor,
          hoverBackgroundColor,
          borderRadius: 10,
          maxBarThickness: 40,
        },
      ],
    };
  });

  // ARR 最低 5 名（其實是 XIRR 最低） 不限定一定是負報酬
  worstArrChartData = computed(() => {
    const all = [...this.arrResults()].filter((r) => r.years > 0 && r.totalInvested > 0);

    if (!all.length) return null;

    const results = all.sort((a, b) => a.arr - b.arr).slice(0, 5);

    const data = results.map((r) => ({
      x: r.symbol,
      y: r.arr * 100,
      totalInvested: r.totalInvested,
      currentValue: r.currentValue,
      isNegative: r.arr < 0,
    }));

    const backgroundColor = data.map((d) =>
      d.isNegative ? 'rgb(239, 68, 68)' : 'rgb(80, 69, 229)'
    );
    const hoverBackgroundColor = data.map((d) =>
      d.isNegative ? 'rgba(239, 68, 68, 0.85)' : 'rgba(80, 69, 229, 0.85)'
    );

    return {
      labels: results.map((r) => r.symbol),
      datasets: [
        {
          label: 'XIRR 最低 5 名 (%)', // ⭐ 這行改名
          data,
          backgroundColor,
          hoverBackgroundColor,
          borderRadius: 10,
          maxBarThickness: 40,
        },
      ],
    };
  });

  arrChartOptions: any;

  private destroyRef = inject(DestroyRef);
  constructor() {
    // ✅ ✅ 取代 setTimeout：等 accounts 真的載到資料後，再決定主帳戶並載入 holdings/txs/summary
    effect(() => {
      const accounts = this.accountService.accounts();
      if (!accounts.length) return;

      // 避免重複設定（第一次設定後就不再跑）
      if (this.mainAccountId()) return;

      const main = accounts[0]; // 第一個account假設為主帳號
      this.mainAccountId.set(main.id);
      this.mainAccountName.set(main.name);

      // 主帳戶的 holdings & transactions
      this.holdingService.loadHoldings(main.id);
      this.transactionService.loadTransactionsByAccount(main.id);

      // ✅ NEW：載入 Summary
      this.loadAccountSummary(main.id);
    });

    this.destroyRef.onDestroy(() => {
      this.offFxUpdated?.();
      this.offFxUpdated = undefined;
      void this.signalr.leaveDashboard();
    });
  }

  ngOnInit(): void {
    // 1. 先把帳戶載入
    this.accountService.loadAccounts();

    // 3. Chart options（共用給 best / worst）
    this.arrChartOptions = {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const raw = ctx.raw as any;
              const arrPercent = ctx.parsed.y ?? 0;
              const invested = raw?.totalInvested ?? 0;
              const current = raw?.currentValue ?? 0;

              return [
                `年化報酬率（XIRR）：${arrPercent.toFixed(2)} %`,
                `總投入：${invested.toLocaleString()}`,
                `目前市值：${current.toLocaleString()}`,
              ];
            },
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (value: number) => `${value}%`,
          },
        },
        x: {
          ticks: {
            maxRotation: 0,
            autoSkip: true,
          },
        },
      },
    };

    // Signal R
    this.setupFxRealtime();
    this.loadFxInitial();
  }

  // ✅ NEW：載入主帳戶 Summary
  private loadAccountSummary(accountId: string) {
    this.accountService.getAccountSummary(accountId).subscribe({
      next: (res) => this.accountSummary.set(res),
      error: (err) => console.error(err),
    });
  }

  private getAccessToken(): string | null {
    // ✅ 這裡請改成你真正存 token 的 key（若不是 'token'）
    // 常見：localStorage.getItem('access_token') / 'jwt' / AuthService.getToken()
    return localStorage.getItem('demo_token');
  }

  /** ✅ 小工具：建折線圖資料（PrimeNG/Chart.js data 物件） */
  private buildLineChartData(
    label: string,
    rows: Array<{ rate: number; capturedAt: string }>,
    maxPoints: number
  ) {
    const latestRows = rows.slice(-maxPoints); // ✅ 取最新 maxPoints 筆

    const labels = latestRows.map((r) => this.formatFxLabel(r.capturedAt));
    const data = latestRows.map((r) => r.rate);

    // ⚠️ 不指定顏色也能跑；但你原本有品牌色，我保留你原本顏色更一致
    const styleByLabel: Record<string, { borderColor: string; backgroundColor: string }> = {
      美元匯率: { borderColor: 'rgb(4, 167, 196)', backgroundColor: 'rgba(4, 167, 196, 0.18)' },
      歐元匯率: { borderColor: 'rgb(132, 204, 23)', backgroundColor: 'rgba(132, 204, 23, 0.18)' },
      日幣匯率: { borderColor: 'rgb(244, 62, 94)', backgroundColor: 'rgba(244, 62, 95, 0.18)' },
      人民幣匯率: { borderColor: 'rgb(249, 115, 21)', backgroundColor: 'rgba(249, 116, 21, 0.18)' },
    };

    const style = styleByLabel[label] ?? {
      borderColor: 'rgb(80, 69, 229)',
      backgroundColor: 'rgba(80, 69, 229, 0.18)',
    };



    return {
      labels,
      datasets: [
        {
          label,
          data,
          fill: true,
          tension: 0.4,
          borderColor: style.borderColor,
          backgroundColor: style.backgroundColor,
        },
      ],
    };
  }

  /** ✅ 小工具：把新點 append 到 chart data（回傳「新物件」，讓 PrimeNG 觸發重畫） */
  private appendPoint(chartData: any, rate: number, capturedAt: Date, maxPoints: number) {
    if (!chartData) return chartData;

    const next = structuredClone(chartData); // ✅ 乾淨：避免 mutate 原物件造成 PrimeNG 不重繪
    const label = this.formatFxLabel(capturedAt.toISOString());

    next.labels = [...(next.labels ?? []), label].slice(-maxPoints);

    if (next.datasets?.length) {
      const ds = next.datasets[0];
      ds.data = [...(ds.data ?? []), rate].slice(-maxPoints);
    }

    return next;
  }

  /** ✅ 小工具：顯示成 HH:mm 或 MM/dd（你可以依喜好調） */
  private formatFxLabel(iso: string) {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${mm}/${dd} ${hh}:${mi}`;
  }

  // SignalR
  // 註冊 Signal R
  private offFxUpdated?: () => void;
  private async setupFxRealtime() {
    await this.signalr.ensureConnected(() => this.getAccessToken());

    // ✅ 防止重複註冊（dashboard 重建、hot reload 會發生）
    this.offFxUpdated?.();
    this.offFxUpdated = this.signalr.onFxUpdated((rates) => {
      const now = Date.now();
      if (now - this.lastFxPushAt < 800) return; // ✅ 防爆
      this.lastFxPushAt = now;

      this.applyFxPush(rates); // ✅ 一行搞定：更新數字 + append chart
    });

    await this.signalr.joinDashboard();
  }
  private loadFxInitial() {
    // ✅ 最新數字：其實可省略，因為 history 的最後一筆會 setLatestFxRate
    this.fxRateService.getLatest().subscribe({
      next: (list) => this.applyFxPush(list), // 直接重用 push 處理器
      error: console.error,
    });

    // ✅ 初始 history：統一走 applyFxHistory
    for (const ccy of this.FX_CCY) {
      this.fxRateService.getHistory(ccy, 30).subscribe({
        next: (rows) => this.applyFxHistory(ccy, rows),
        error: console.error,
      });
    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // info legend
  fundLegend = [
    { label: '銀行活存餘額', color: 'rgb(80, 69, 229)', amount: 'NT$ 261,971,440,339' },
    { label: '銀行借款', color: 'rgb(185, 94, 255)', amount: 'NT$ 349,673,868,558' },
    {
      label: '集團資金集團資金淨額',
      color: 'rgb(54, 47, 170)',
      amount: 'NT$ -58,659,110,001',
    },
    {
      label: '近一個月資金交易總額',
      color: 'rgb(52, 211, 153)',
      amount: 'NT$ 267,302,304,426',
    },
  ];

  // ① 銀行活存幣別餘額 - Donut
  bankBalanceByCurrencyData = {
    labels: ['USD', 'EUR', 'TWD', 'JPY', 'CNY', 'Other'],
    datasets: [
      {
        data: [54, 28, 2, 4, 5, 22],
        // 顏色可用預設，也可以自己指定
        backgroundColor: [
          'rgb(4, 167, 196)',
          'rgb(132, 204, 23)',
          'rgb(168, 85, 247)',
          'rgb(244, 62, 94)',
          'rgb(249, 115, 21)',
          'rgb(107, 114, 128)',
        ],
      },
    ],
  };

  bankBalanceByCurrencyOptions = {
    //cutout: '60%', // 讓它變成 donut
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle', // 圓形 icon

          padding: 14, // item 之間距離
          font: {
            weight: 600,
          },
        },
      },
    },
  };

  // ② 匯率折線圖（示意）
  // 美元
  // usdRateData = {
  //   labels: [
  //     '10/01',
  //     '10/05',
  //     '10/10',
  //     '10/15',
  //     '10/20',
  //     '11/01',
  //     '11/05',
  //     '11/10',
  //     '11/15',
  //     '11/20',
  //   ],
  //   datasets: [
  //     {
  //       label: '美元匯率',
  //       data: [30.2, 30.4, 30.3, 30.4, 30.47, 30.5, 30.6, 30.4, 30.3, 30.34],
  //       fill: true,
  //       tension: 0.4,
  //       borderColor: 'rgb(4, 167, 196)',
  //       backgroundColor: 'rgba(4, 167, 196, 0.18)', // 👈 透明填滿
  //     },
  //   ],
  // };
  // usdRateOptions = {
  //   responsive: true,
  //   maintainAspectRatio: false,
  //   plugins: { legend: { display: false } },
  //   scales: {
  //     x: { display: false },
  //     y: { display: false },
  //   },
  // };

  // 歐元
  // eurRateData = {
  //   labels: [
  //     '10/01',
  //     '10/05',
  //     '10/10',
  //     '10/15',
  //     '10/20',
  //     '11/01',
  //     '11/05',
  //     '11/10',
  //     '11/15',
  //     '11/20',
  //   ],
  //   datasets: [
  //     {
  //       label: '歐元匯率',
  //       data: [30.3, 30.35, 30.32, 30.4, 30.34, 30.4, 30.5, 30.43, 30.34, 30.34],
  //       fill: true,
  //       tension: 0.4,
  //       borderColor: 'rgb(132, 204, 23)',
  //       backgroundColor: 'rgba(132, 204, 23, 0.18)', // 👈 透明填滿
  //     },
  //   ],
  // };

  // eurRateOptions = {
  //   responsive: true,
  //   maintainAspectRatio: false,
  //   plugins: { legend: { display: false } },
  //   scales: {
  //     x: { display: false },
  //     y: { display: false },
  //   },
  // };

  // 日幣
  // jpyRateData = {
  //   labels: [
  //     '10/01',
  //     '10/05',
  //     '10/10',
  //     '10/15',
  //     '10/20',
  //     '11/01',
  //     '11/05',
  //     '11/10',
  //     '11/15',
  //     '11/20',
  //   ],
  //   datasets: [
  //     {
  //       label: '日幣匯率',
  //       data: [0.2046, 0.2043, 0.2044, 0.2042, 0.2043, 0.2045, 0.2043, 0.2044, 0.2043, 0.2045],
  //       fill: true,
  //       tension: 0.4,
  //       borderColor: 'rgb(244, 62, 94)',
  //       backgroundColor: 'rgba(244, 62, 95, 0.18)', // 👈 透明填滿
  //     },
  //   ],
  // };

  // jpyRateOptions = {
  //   responsive: true,
  //   maintainAspectRatio: false,
  //   plugins: { legend: { display: false } },
  //   scales: {
  //     x: { display: false },
  //     y: { display: false },
  //   },
  // };

  // 人民幣
  // cnyRateData = {
  //   labels: [
  //     '10/01',
  //     '10/05',
  //     '10/10',
  //     '10/15',
  //     '10/20',
  //     '11/01',
  //     '11/05',
  //     '11/10',
  //     '11/15',
  //     '11/20',
  //   ],
  //   datasets: [
  //     {
  //       label: '人民幣匯率',
  //       data: [4.264, 4.265, 4.264, 4.267, 4.263, 4.264, 4.263, 4.264, 4.264, 4.263],
  //       fill: true,
  //       tension: 0.4,
  //       borderColor: 'rgb(249, 115, 21)',
  //       backgroundColor: 'rgba(249, 116, 21, 0.18)', // 👈 透明填滿
  //     },
  //   ],
  // };

  // cnyRateOptions = {
  //   responsive: true,
  //   maintainAspectRatio: false,
  //   plugins: { legend: { display: false } },
  //   scales: {
  //     x: { display: false },
  //     y: { display: false },
  //   },
  // };

  // 集團資金總額
  totalGroupFundsData = {
    labels: ['銀行活存 & 現金', '銀行定存', '金融資產'],
    datasets: [
      {
        data: [34.56, 36.61, 28.84],
        // 顏色可用預設，也可以自己指定
        backgroundColor: ['rgb(185, 94, 255)', 'rgb(80, 69, 229)', 'rgb(52, 211, 153)'],
        hoverBackgroundColor: [
          'rgba(21, 118, 255, 0.58)',
          'rgba(80, 69, 229, 0.48)',
          'rgba(26, 194, 241, 0.44)',
        ],
      },
    ],
  };

  totalGroupFundsOptions = {
    responsive: true, // ✅ 讓圖表跟著容器寬度調整
    maintainAspectRatio: false, // ✅ 讓你可以自己決定高度（很常用在 dashboard）
    plugins: {
      legend: {
        position: 'left',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle', // 圓形 icon
          boxWidth: 14, // 圓點與文字間距
          padding: 30, // item 之間距離
          font: {
            weight: 600,
          },
        },
      },
    },
  };

  groupFundByMonthData = {
    labels: ['2025/09', '2025/10', '2025/11'],
    datasets: [
      {
        label: '銀行活存 & 現金',
        data: [50341, 69616, 61536],
        backgroundColor: 'rgb(185, 94, 255)',
        borderRadius: 16, // 群組柱狀圖不需要指定每個角，16 即可
        maxBarThickness: 22,
        barPercentage: 0.8, // 讓三根更靠近
        categoryPercentage: 0.5, // 讓整組變窄
      },
      {
        label: '銀行定存',
        data: [89187, 58297, 56717],
        backgroundColor: 'rgb(80, 69, 229)',
        borderRadius: 16,
        maxBarThickness: 22,
        barPercentage: 0.8,
        categoryPercentage: 0.5,
      },
      {
        label: '金融資產',
        data: [98943, 43018, 25547],
        backgroundColor: 'rgb(52, 211, 153)',
        borderRadius: 16,
        maxBarThickness: 22,
        barPercentage: 0.8,
        categoryPercentage: 0.5,
      },
    ],
  };

  groupFundByMonthOptions = {
    responsive: true,
    maintainAspectRatio: false,
    aspectRatio: 0.8,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 30, // 兩個 legend item 之間距離加大  ⬅ 設定每個 legend item 的間距（預設大約 10）
          font: {
            weight: 600,
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          display: true, // 顯示文字
          color: '#666', // 字體顏色
          font: {
            weight: 500,
          },
        },
        grid: {
          color: 'rgba(226, 240, 30, 0)',
          drawBorder: false,
        },
      },
      y: {
        ticks: {
          display: true, // 顯示文字
          color: '#666', // 字體顏色
          font: {
            weight: 500,
          },
          callback: function (value: number) {
            return value / 1000 + 'K';
          },
        },
        grid: {
          color: 'rgb(228, 229, 231)',
          drawBorder: false,
        },
      },
    },
  };

  // ④ 近三個月集團銀行借款- 柱狀圖
  groupBankBorrowingsData = {
    labels: ['2025/09', '2025/10', '2025/11'],
    datasets: [
      {
        label: '銀行活存 & 現金',
        data: [153256, 136656, 154576],
        stack: 'a',
        backgroundColor: 'rgb(185, 94, 255)',
        borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
        maxBarThickness: 50,
      },
      {
        label: '銀行定存',
        data: [80000, 60000, 70000],
        stack: 'a',
        backgroundColor: 'rgb(80, 69, 229)',
        borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
        maxBarThickness: 50,
      },
      {
        label: '金融資產',
        data: [20000, 15000, 30000],
        stack: 'a',
        backgroundColor: 'rgb(52, 211, 153)',
        borderRadius: { topLeft: 16, topRight: 16, bottomLeft: 0, bottomRight: 0 },
        maxBarThickness: 50,
      },
    ],
  };

  groupBankBorrowingsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    aspectRatio: 0.8,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 30,
          font: {
            weight: 600,
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          display: true,
          color: '#666',
          font: {
            weight: 500,
          },
        },
        grid: {
          color: 'rgba(226, 240, 30, 0)',
          drawBorder: false,
        },
      },
      y: {
        ticks: {
          display: true,
          color: '#666',
          font: {
            weight: 500,
          },
          callback: function (value: number) {
            return (value / 1000).toFixed(1) + 'K';
          },
        },
        grid: {
          color: 'rgb(228, 229, 231)',
          drawBorder: false,
        },
      },
    },
  };

  // ⑤ 近三個月集團未實現資產- 柱狀圖
  groupUnrealizedAssetsData = {
    labels: ['2025/09', '2025/10', '2025/11'],
    datasets: [
      {
        label: '',
        data: [25639, 71996, 49190],
        stack: 'a',
        backgroundColor: 'rgb(54, 47, 170)',
        borderRadius: { topLeft: 16, topRight: 16, bottomLeft: 0, bottomRight: 0 },
        maxBarThickness: 20,
      },
    ],
  };

  groupUnrealizedAssetsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    aspectRatio: 0.8,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: {
          display: true,
          color: '#666',
          font: {
            weight: 500,
          },
        },
        grid: {
          color: 'rgba(226, 240, 30, 0)',
          drawBorder: false,
        },
      },
      y: {
        ticks: {
          display: true,
          color: '#666',
          font: {
            weight: 500,
          },
          callback: function (value: number) {
            return value / 1000 + 'K';
          },
        },
        grid: {
          color: 'rgb(228, 229, 231)',
          drawBorder: false,
        },
      },
    },
  };

  // ⑥ 近一個月資金交易 - donut
  lastOneMonthFundTransactionsData = {
    labels: ['支出總額', '收入總額'],
    datasets: [
      {
        data: [55.14, 44.86],
        // 顏色可用預設，也可以自己指定
        backgroundColor: ['rgb(185, 94, 255)', 'rgb(80, 69, 229)'],
      },
    ],
  };

  lastOneMonthFundTransactionsOptions = {
    //cutout: '60%', // 讓它變成 donut
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
  };
}
