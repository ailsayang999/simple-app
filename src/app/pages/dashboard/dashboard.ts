import { Component, inject, Signal, computed, OnInit, signal } from '@angular/core';
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

  // 主帳戶（這邊簡單用第一個）
  mainAccountName = signal<string>('');

  // 總資產（主帳戶）
  totalNetWorth = computed(() =>
    this.holdingService.holdings().reduce((sum, h) => sum + (h.marketValue ?? 0), 0)
  );

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

  // 後 5 名（最慘 5 名）ARR – 只看 arr < 0
  // worstArrChartData = computed(() => {
  //   const results = [...this.arrResults()]
  //     .filter((r) => r.arr < 0 && r.years > 0 && r.totalInvested > 0)
  //     .sort((a, b) => a.arr - b.arr) // 由低到高（最爛在前）
  //     .slice(0, 5);

  //   if (!results.length) return null;

  //   return {
  //     labels: results.map((r) => r.symbol),
  //     datasets: [
  //       {
  //         label: 'Worst 5 ARR (%)',
  //         data: results.map((r) => r.arr * 100),
  //       },
  //     ],
  //   };
  // });

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

  ngOnInit(): void {
    // 1. 先把帳戶載入
    this.accountService.loadAccounts();

    // 2. 用 setTimeout 確保 accounts signal 已更新再讀取
    setTimeout(() => {
      const accounts = this.accountService.accounts();
      if (!accounts.length) return;

      const main = accounts[0];
      this.mainAccountName.set(main.name);

      // 主帳戶的 holdings & transactions
      this.holdingService.loadHoldings(main.id);
      this.transactionService.loadTransactionsByAccount(main.id);
    }, 0);

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
  usdRateData = {
    labels: [
      '10/01',
      '10/05',
      '10/10',
      '10/15',
      '10/20',
      '11/01',
      '11/05',
      '11/10',
      '11/15',
      '11/20',
    ],
    datasets: [
      {
        label: '美元匯率',
        data: [30.2, 30.4, 30.3, 30.4, 30.47, 30.5, 30.6, 30.4, 30.3, 30.34],
        fill: true,
        tension: 0.4,
        borderColor: 'rgb(4, 167, 196)',
        backgroundColor: 'rgba(4, 167, 196, 0.18)', // 👈 透明填滿
      },
    ],
  };
  usdRateOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    // plugins: {
    //   legend: {
    //     labels: {
    //       color: 'rgb(4, 167, 196)',
    //     },
    //   },
    // },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    // scales: {
    //   x: {
    //     ticks: {
    //       color: 'rgba(10, 118, 137, 1)',
    //     },
    //     grid: {
    //       color: 'rgba(8, 201, 235, 1)',
    //     },
    //   },
    //   y: {
    //     ticks: {
    //       color: 'rgba(97, 196, 4, 1)',
    //     },
    //     grid: {
    //       color: 'rgba(3, 143, 19, 1)',
    //     },
    //   },
    // },
  };

  // 歐元
  eurRateData = {
    labels: [
      '10/01',
      '10/05',
      '10/10',
      '10/15',
      '10/20',
      '11/01',
      '11/05',
      '11/10',
      '11/15',
      '11/20',
    ],
    datasets: [
      {
        label: '歐元匯率',
        data: [30.3, 30.35, 30.32, 30.4, 30.34, 30.4, 30.5, 30.43, 30.34, 30.34],
        fill: true,
        tension: 0.4,
        borderColor: 'rgb(132, 204, 23)',
        backgroundColor: 'rgba(132, 204, 23, 0.18)', // 👈 透明填滿
      },
    ],
  };

  eurRateOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  };

  // 日幣
  jpyRateData = {
    labels: [
      '10/01',
      '10/05',
      '10/10',
      '10/15',
      '10/20',
      '11/01',
      '11/05',
      '11/10',
      '11/15',
      '11/20',
    ],
    datasets: [
      {
        label: '日幣匯率',
        data: [0.2046, 0.2043, 0.2044, 0.2042, 0.2043, 0.2045, 0.2043, 0.2044, 0.2043, 0.2045],
        fill: true,
        tension: 0.4,
        borderColor: 'rgb(244, 62, 94)',
        backgroundColor: 'rgba(244, 62, 95, 0.18)', // 👈 透明填滿
      },
    ],
  };

  jpyRateOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  };

  // 人民幣
  cnyRateData = {
    labels: [
      '10/01',
      '10/05',
      '10/10',
      '10/15',
      '10/20',
      '11/01',
      '11/05',
      '11/10',
      '11/15',
      '11/20',
    ],
    datasets: [
      {
        label: '人民幣匯率',
        data: [4.264, 4.265, 4.264, 4.267, 4.263, 4.264, 4.263, 4.264, 4.264, 4.263],
        fill: true,
        tension: 0.4,
        borderColor: 'rgb(249, 115, 21)',
        backgroundColor: 'rgba(249, 116, 21, 0.18)', // 👈 透明填滿
      },
    ],
  };

  cnyRateOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  };

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

  // ③ 近三個月集團資金總額 - 柱狀圖
  // groupFundByMonthData = {
  //   labels: ['2025/09', '2025/10', '2025/11'],
  //   datasets: [
  //     {
  //       label: '銀行活存 & 現金',
  //       data: [153256, 136656, 154576],
  //       stack: 'a',
  //       backgroundColor: 'rgb(185, 94, 255)',
  //       borderRadius: { topLeft: 16, topRight: 16, bottomLeft: 0, bottomRight: 0 },
  //       maxBarThickness: 20,
  //     },
  //     {
  //       label: '銀行定存',
  //       data: [80000, 60000, 70000],
  //       stack: 'b',
  //       backgroundColor: 'rgb(80, 69, 229)',
  //       borderRadius: { topLeft: 16, topRight: 16, bottomLeft: 0, bottomRight: 0 },
  //       maxBarThickness: 20,
  //     },
  //     {
  //       label: '金融資產',
  //       data: [20000, 15000, 30000],
  //       stack: 'c',
  //       backgroundColor: 'rgb(52, 211, 153)',
  //       borderRadius: { topLeft: 16, topRight: 16, bottomLeft: 0, bottomRight: 0 },
  //       maxBarThickness: 20,
  //     },
  //   ],
  // };
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
          //boxWidth: 14, // 圓點與文字間距變寬
          padding: 30, // 兩個 legend item 之間距離加大  ⬅ 設定每個 legend item 的間距（預設大約 10）
          font: {
            weight: 600,
          },
        },
      },
    },
    // scales: {
    //   x: {
    //     stacked: false,
    //   },
    //   y: {
    //     stacked: true,
    //   },
    // },
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
          //boxWidth: 14, // 圓點與文字間距變寬
          padding: 30, // 兩個 legend item 之間距離加大  ⬅ 設定每個 legend item 的間距（預設大約 10）
          font: {
            weight: 600,
          },
        },
      },
    },

    // scales: {
    //   x: {
    //     stacked: false,
    //   },
    //   y: {
    //     stacked: true,
    //   },
    // },
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
    // scales: {
    //   x: {
    //     stacked: false,
    //   },
    //   y: {
    //     stacked: true,
    //   },
    // },
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
