// src/app/pages/accounts/account-detail.page.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { CardModule } from 'primeng/card';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';

import { AccountService } from '../../core/services/account.service';
import { HoldingService } from '../../core/services/holding.service';
import { TransactionService } from '../../core/services/transaction.service';
import { AccountDto } from '../../core/models/account.model';
import { HoldingDto, CreateHoldingDto, UpdateHoldingDto } from '../../core/models/holding.model';
import { TransactionDto, CreateTransactionDto } from '../../core/models/transaction.model';
import { ToastService } from '../../core/services/toast.service';

import { ChartModule } from 'primeng/chart';
import { calcArrPerHolding } from '../../core/utils/arr.util';

@Component({
  selector: 'app-account-detail-page',
  standalone: true,
  templateUrl: './account-detail.html',
  styleUrl: './account-detail.scss',
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    CardModule,
    TabsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    ChartModule,
  ],
})
export class AccountDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private accountService = inject(AccountService);
  private holdingService = inject(HoldingService);
  private transactionService = inject(TransactionService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  // route param
  private accountIdSignal = signal<string | null>(null);

  // 目前帳戶
  account = computed<AccountDto | null>(() => {
    const id = this.accountIdSignal();
    if (!id) return null;
    return this.accountService.accounts().find((a) => a.id === id) ?? null;
  });

  // ✅ 就加在這邊，跟上面一樣是 class 的屬性
  // 依照目前 holdings 動態計算此帳戶總資產
  accountTotalValue = computed(() => {
    const holdings = this.holdings();
    if (!holdings.length) return 0;

    return holdings.reduce((sum, h) => {
      const mv = h.marketValue ?? h.quantity * h.avgCost;
      return sum + (mv || 0);
    }, 0);
  });

  // Tabs
  activeTab = signal<'holdings' | 'transactions'>('holdings');

  // signals from services
  holdings = this.holdingService.holdings;
  transactions = this.transactionService.transactions;

  // Dialog 控制
  displayCreateHoldingDialog = false;
  displayEditHoldingDialog = false;
  displayTransactionDialog = false;

  // Holding 操作用
  selectedHolding = signal<HoldingDto | null>(null);
  isViewHoldingMode = signal<boolean>(false);

  // 下拉選項
  assetTypeOptions = [
    { label: 'ETF / 指數型', value: 'ETF' },
    { label: '股票', value: 'STOCK' },
    { label: '基金', value: 'FUND' },
    { label: '現金', value: 'CASH' },
    { label: '債券', value: 'BOND' },
  ];

  currencyOptions = [
    { label: '新台幣 (TWD)', value: 'TWD' },
    { label: '美金 (USD)', value: 'USD' },
    { label: '日圓 (JPY)', value: 'JPY' },
    { label: '歐元 (EUR)', value: 'EUR' },
  ];

  transactionTypeOptions = [
    { label: '買進 (BUY)', value: 'BUY' },
    { label: '賣出 (SELL)', value: 'SELL' },
    { label: '存入 (DEPOSIT)', value: 'DEPOSIT' },
    { label: '提領 (WITHDRAW)', value: 'WITHDRAW' },
    { label: '股利 (DIVIDEND)', value: 'DIVIDEND' },
    { label: '利息 (INTEREST)', value: 'INTEREST' },
  ];

  // 建立 Holding 表單
  createHoldingForm = this.fb.nonNullable.group({
    symbol: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    assetType: ['ETF', [Validators.required]],
    currency: ['TWD', [Validators.required]],
    quantity: [0, [Validators.required, Validators.min(0)]],
    avgCost: [0, [Validators.required, Validators.min(0)]],
  });

  // 編輯 Holding 表單（查看明細 / 調整數量 共用）
  editHoldingForm = this.fb.nonNullable.group({
    symbol: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    assetType: ['ETF', [Validators.required]],
    currency: ['TWD', [Validators.required]],
    quantity: [0, [Validators.required, Validators.min(0)]],
    avgCost: [0, [Validators.required, Validators.min(0)]],
  });

  // 新增交易表單
  createTransactionForm = this.fb.nonNullable.group({
    holdingId: [''], // ⭐ 新增：關聯哪一個 holding（可空）
    tradeDate: [this.todayStr(), [Validators.required]],
    type: ['BUY', [Validators.required]],
    symbol: ['', [Validators.required]],
    quantity: [0, [Validators.required, Validators.min(0.0001)]],
    price: [0, [Validators.required, Validators.min(0)]],
    fee: [0, [Validators.min(0)]],
    currency: ['TWD', [Validators.required]],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.accountIdSignal.set(id);

    if (this.accountService.accounts().length === 0) {
      this.accountService.loadAccounts();
    }

    this.holdingService.loadHoldings(id);
    this.transactionService.loadTransactionsByAccount(id);

    // ARR
    // mini ARR chart options
    this.accountArrChartOptions = {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const raw = ctx.raw as any; // 我們在 data 裡塞的物件
              const arrPercent = ctx.parsed.y ?? 0;
              const invested = raw?.totalInvested ?? 0;
              const current = raw?.currentValue ?? 0;

              return [
                `年化報酬率：${arrPercent.toFixed(2)} %`,
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

  // 工具：今天的 yyyy-MM-dd 字串
  private todayStr() {
    const d = new Date();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  // ---------- Holdings：新增 ----------

  openCreateHoldingDialog() {
    this.createHoldingForm.reset({
      symbol: '',
      name: '',
      assetType: 'ETF',
      currency: 'TWD',
      quantity: 0,
      avgCost: 0,
    });
    this.displayCreateHoldingDialog = true;
  }

  cancelCreateHolding() {
    this.displayCreateHoldingDialog = false;
  }

  submitCreateHolding() {
    if (this.createHoldingForm.invalid) {
      this.createHoldingForm.markAllAsTouched();
      return;
    }

    const accountId = this.accountIdSignal();
    if (!accountId) return;

    const dto: CreateHoldingDto = this.createHoldingForm.getRawValue();

    this.holdingService.createHolding(accountId, dto).subscribe({
      next: () => {
        this.toast.success('已新增持有標的');
        this.displayCreateHoldingDialog = false;
        this.holdingService.loadHoldings(accountId);
      },
      error: (err) => {
        console.error('create holding error', err);
        this.toast.error('新增失敗，請稍後再試');
      },
    });
  }

  // ---------- Holdings：查看 / 編輯 / 刪除 ----------

  openHoldingView(h: HoldingDto) {
    this.selectedHolding.set(h);
    this.isViewHoldingMode.set(true);

    this.editHoldingForm.reset({
      symbol: h.symbol,
      name: h.name,
      assetType: h.assetType,
      currency: h.currency,
      quantity: h.quantity,
      avgCost: h.avgCost,
    });

    this.editHoldingForm.disable(); // 純查看
    this.displayEditHoldingDialog = true;
  }

  onTxHoldingChange(holdingId: string | null) {
    if (!holdingId) return;
    const h = this.holdings().find((x) => x.id === holdingId);
    if (!h) return;

    // 自動帶入 symbol + 幣別
    this.createTransactionForm.patchValue({
      symbol: h.symbol,
      currency: h.currency,
    });
  }

  openHoldingEdit(h: HoldingDto) {
    this.selectedHolding.set(h);
    this.isViewHoldingMode.set(false);

    this.editHoldingForm.reset({
      symbol: h.symbol,
      name: h.name,
      assetType: h.assetType,
      currency: h.currency,
      quantity: h.quantity,
      avgCost: h.avgCost,
    });

    this.editHoldingForm.enable(); // 可編輯
    this.displayEditHoldingDialog = true;
  }

  cancelEditHolding() {
    this.displayEditHoldingDialog = false;
  }

  submitEditHolding() {
    const holding = this.selectedHolding();
    const accountId = this.accountIdSignal();
    if (!holding || !accountId) return;

    if (this.editHoldingForm.invalid) {
      this.editHoldingForm.markAllAsTouched();
      return;
    }

    const dto: UpdateHoldingDto = this.editHoldingForm.getRawValue();

    this.holdingService.updateHolding(holding.id, dto).subscribe({
      next: () => {
        this.toast.success('已更新持有標的');
        this.displayEditHoldingDialog = false;
        this.holdingService.loadHoldings(accountId);
      },
      error: (err) => {
        console.error('update holding error', err);
        this.toast.error('更新失敗，請稍後再試');
      },
    });
  }

  deleteHolding(h: HoldingDto) {
    const accountId = this.accountIdSignal();
    if (!accountId) return;

    const ok = window.confirm(`確定要刪除「${h.symbol} / ${h.name}」這筆持有標的嗎？`);
    if (!ok) return;

    this.holdingService.deleteHolding(h.id).subscribe({
      next: () => {
        this.toast.success('已刪除持有標的');
        this.holdingService.loadHoldings(accountId);
      },
      error: (err) => {
        console.error('delete holding error', err);
        this.toast.error('刪除失敗，請稍後再試');
      },
    });
  }

  // ---------- 交易：新增 ----------

  openTransactionDialog() {
    const account = this.account();

    this.createTransactionForm.reset({
      holdingId: '', // ⭐ 清空關聯標的
      tradeDate: this.todayStr(),
      type: 'BUY',
      symbol: '',
      quantity: 0,
      price: 0,
      fee: 0,
      currency: account?.baseCurrency ?? 'TWD',
    });

    this.displayTransactionDialog = true;
  }

  cancelTransactionDialog() {
    this.displayTransactionDialog = false;
  }

  submitTransaction() {
    if (this.createTransactionForm.invalid) {
      this.createTransactionForm.markAllAsTouched();
      return;
    }

    const accountId = this.accountIdSignal();
    if (!accountId) return;

    const value = this.createTransactionForm.getRawValue();
    const {
      holdingId, // ⭐ 取出
      tradeDate,
      type,
      symbol,
      quantity,
      price,
      fee,
      currency,
    } = value;

    const gross = quantity * price;
    const totalAmount = type === 'SELL' || type === 'WITHDRAW' ? -gross - fee : gross - fee;

    const dto: CreateTransactionDto = {
      accountId,
      holdingId: holdingId || null, // ⭐ 帶進去（可 null）
      tradeDate: new Date(tradeDate).toISOString(),
      type,
      symbol,
      quantity,
      price,
      fee,
      totalAmount,
      currency,
    };

    this.transactionService.createTransaction(dto).subscribe({
      next: () => {
        this.toast.success('已新增交易');
        this.displayTransactionDialog = false;
        this.holdingService.loadHoldings(accountId);
        this.transactionService.loadTransactionsByAccount(accountId);
      },
      error: (err) => {
        console.error('create transaction error', err);
        this.toast.error('新增交易失敗，請稍後再試');
      },
    });
  }

  // ---------- 共用：驗證錯誤 ----------

  hasCreateHoldingError(controlName: keyof typeof this.createHoldingForm.controls, error: string) {
    const ctrl = this.createHoldingForm.get(controlName);
    return ctrl?.touched && ctrl.hasError(error);
  }

  hasEditHoldingError(controlName: keyof typeof this.editHoldingForm.controls, error: string) {
    const ctrl = this.editHoldingForm.get(controlName);
    return ctrl?.touched && ctrl.hasError(error);
  }

  hasTxError(controlName: keyof typeof this.createTransactionForm.controls, error: string) {
    const ctrl = this.createTransactionForm.get(controlName);
    return ctrl?.touched && ctrl.hasError(error);
  }

  // 迷你 ARR 圖用
  // 迷你 ARR 圖用
  accountArrChartData = computed(() => {
    const holdings = this.holdings();
    const txs = this.transactions();

    // 沒有持有或沒有交易，就不畫
    if (!holdings.length || !txs.length) return null;

    // 用 util 算 ARR
    const arrResults = calcArrPerHolding(
      holdings.map((h) => ({
        symbol: h.symbol,
        currency: h.currency,
        marketValue: h.marketValue,
      })),
      txs
    );

    // 只取有投入 & 有時間長度的標的
    const usable = arrResults.filter((r) => r.years > 0 && r.totalInvested > 0);

    if (!usable.length) return null;

    // 排名前 5 名（由高到低）
    const top5 = usable.sort((a, b) => b.arr - a.arr).slice(0, 5);

    // 給 chart.js 的 data：塞進額外欄位給 tooltip 用
    const data = top5.map((r) => ({
      x: r.symbol,
      y: r.arr * 100, // 轉成 %
      totalInvested: r.totalInvested,
      currentValue: r.currentValue,
      isNegative: r.arr < 0,
    }));

    const labels = data.map((d) => d.x);
    const backgroundColor = data.map(
      (d) => (d.isNegative ? 'rgb(239, 68, 68)' : 'rgb(80, 69, 229)') // 🔴 負 / 🔵 正
    );
    const hoverBackgroundColor = data.map((d) =>
      d.isNegative ? 'rgba(239, 68, 68, 0.85)' : 'rgba(80, 69, 229, 0.85)'
    );

    return {
      labels,
      datasets: [
        {
          label: 'ARR (%)',
          data, // ⬅ 這裡是整個物件，而不是單純 number
          backgroundColor,
          hoverBackgroundColor,
          borderRadius: 10,
          maxBarThickness: 40,
        },
      ],
    };
  });

  accountArrChartOptions: any;
}
