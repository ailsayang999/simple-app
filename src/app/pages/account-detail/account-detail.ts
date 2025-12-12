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
import { ChartModule } from 'primeng/chart';

import { AccountService } from '../../core/services/account.service';
import { HoldingService } from '../../core/services/holding.service';
import { TransactionService } from '../../core/services/transaction.service';
import { ToastService } from '../../core/services/toast.service';

import { AccountDto } from '../../core/models/account.model';
import { HoldingDto, CreateHoldingDto, UpdateHoldingDto } from '../../core/models/holding.model';
import {
  TransactionDto,
  CreateTransactionDto,
  UpdateTransactionDto,
} from '../../core/models/transaction.model';

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

  private accountIdSignal = signal<string | null>(null);

  account = computed<AccountDto | null>(() => {
    const id = this.accountIdSignal();
    if (!id) return null;
    return this.accountService.accounts().find((a) => a.id === id) ?? null;
  });

  activeTab = signal<'holdings' | 'transactions'>('holdings');

  holdings = this.holdingService.holdings;
  transactions = this.transactionService.transactions;

  // dialogs
  displayCreateHoldingDialog = false;
  displayEditHoldingDialog = false;

  displayMarketPriceDialog = false;

  displayTransactionDialog = false;
  displayEditTransactionDialog = false;

  // selected
  selectedHolding = signal<HoldingDto | null>(null);
  selectedTx = signal<TransactionDto | null>(null);

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
    { label: '買進 (BUY) - 現金流出', value: 'BUY' },
    { label: '賣出 (SELL) - 現金流入', value: 'SELL' },
    { label: '存入 (DEPOSIT) - 現金流出', value: 'DEPOSIT' },
    { label: '提領 (WITHDRAW) - 現金流入', value: 'WITHDRAW' },
    { label: '股利 (DIVIDEND) - 現金流入', value: 'DIVIDEND' },
    { label: '利息 (INTEREST) - 現金流入', value: 'INTEREST' },
  ];

  // ====== forms ======

  createHoldingForm = this.fb.nonNullable.group({
    symbol: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    assetType: ['ETF', [Validators.required]],
    currency: ['TWD', [Validators.required]],
    marketPrice: [0, [Validators.required, Validators.min(0)]],
  });

  editHoldingForm = this.fb.nonNullable.group({
    symbol: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    assetType: ['ETF', [Validators.required]],
    currency: ['TWD', [Validators.required]],
  });

  marketPriceForm = this.fb.nonNullable.group({
    marketPrice: [0, [Validators.required, Validators.min(0)]],
  });

  createTransactionForm = this.fb.nonNullable.group({
    holdingId: ['', [Validators.required]],
    tradeDate: [this.todayStr(), [Validators.required]],
    type: ['BUY', [Validators.required]],
    symbol: [{ value: '', disabled: true }],
    currency: [{ value: '', disabled: true }],
    quantity: [0, [Validators.required, Validators.min(0.0001)]],
    price: [0, [Validators.required, Validators.min(0)]],
    fee: [0, [Validators.min(0)]],
    note: [''],
  });

  editTransactionForm = this.fb.nonNullable.group({
    holdingId: ['', [Validators.required]],
    tradeDate: [this.todayStr(), [Validators.required]],
    type: ['BUY', [Validators.required]],
    symbol: [{ value: '', disabled: true }],
    currency: [{ value: '', disabled: true }],
    quantity: [0, [Validators.required, Validators.min(0.0001)]],
    price: [0, [Validators.required, Validators.min(0)]],
    fee: [0, [Validators.min(0)]],
    note: [''],
  });

  // ===== computed =====

  accountTotalValue = computed(() => {
    const holdings = this.holdings();
    if (!holdings.length) return 0;
    return holdings.reduce((sum, h) => sum + (h.marketValue ?? 0), 0);
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

    this.accountArrChartOptions = {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const idx = ctx.dataIndex;
              const meta = this.arrMeta();
              const m = meta[idx];
              return [
                `年化報酬率（XIRR）：${ctx.parsed.y.toFixed(2)} %`,
                `總投入：${(m?.totalInvested ?? 0).toLocaleString()}`,
                `目前市值：${(m?.currentValue ?? 0).toLocaleString()}`,
              ];
            },
          },
        },
      },
      scales: {
        y: {
          ticks: { callback: (v: number) => `${v}%` },
        },
        x: { ticks: { maxRotation: 0, autoSkip: true } },
      },
    };
  }

  private todayStr() {
    const d = new Date();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  // ============ Holding: create/update/delete ============

  openCreateHoldingDialog() {
    this.createHoldingForm.reset({
      symbol: '',
      name: '',
      assetType: 'ETF',
      currency: 'TWD',
      marketPrice: 0,
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
        console.error(err);
        this.toast.error(err?.error?.message ?? '新增失敗');
      },
    });
  }

  openHoldingEdit(h: HoldingDto) {
    this.selectedHolding.set(h);
    this.editHoldingForm.reset({
      symbol: h.symbol,
      name: h.name,
      assetType: h.assetType,
      currency: h.currency,
    });
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
        console.error(err);
        this.toast.error(err?.error?.message ?? '更新失敗');
      },
    });
  }

  openMarketPriceDialog(h: HoldingDto) {
    this.selectedHolding.set(h);
    this.marketPriceForm.reset({ marketPrice: h.marketPrice ?? 0 });
    this.displayMarketPriceDialog = true;
  }

  cancelMarketPrice() {
    this.displayMarketPriceDialog = false;
  }

  submitMarketPrice() {
    const holding = this.selectedHolding();
    const accountId = this.accountIdSignal();
    if (!holding || !accountId) return;

    if (this.marketPriceForm.invalid) {
      this.marketPriceForm.markAllAsTouched();
      return;
    }

    const { marketPrice } = this.marketPriceForm.getRawValue();

    this.holdingService.updateMarketPrice(holding.id, marketPrice).subscribe({
      next: () => {
        this.toast.success('已更新市價');
        this.displayMarketPriceDialog = false;
        this.holdingService.loadHoldings(accountId);
      },
      error: (err) => {
        console.error(err);
        this.toast.error(err?.error?.message ?? '更新市價失敗');
      },
    });
  }

  deleteHolding(h: HoldingDto) {
    const accountId = this.accountIdSignal();
    if (!accountId) return;

    const ok = window.confirm(`刪除 holding 需要先刪交易。確定要刪除 ${h.symbol} 嗎？`);
    if (!ok) return;

    this.holdingService.deleteHolding(h.id).subscribe({
      next: () => {
        this.toast.success('已刪除持有標的');
        this.holdingService.loadHoldings(accountId);
      },
      error: (err) => {
        console.error(err);
        this.toast.error(err?.error?.message ?? '刪除失敗');
      },
    });
  }

  // ============ Transaction: create/update/delete ============

  onTxHoldingChange(holdingId: string | null) {
    if (!holdingId) return;
    const h = this.holdings().find((x) => x.id === holdingId);
    if (!h) return;

    this.createTransactionForm.patchValue({
      symbol: h.symbol,
      currency: h.currency,
    });
  }

  onEditTxHoldingChange(holdingId: string | null) {
    if (!holdingId) return;
    const h = this.holdings().find((x) => x.id === holdingId);
    if (!h) return;

    this.editTransactionForm.patchValue({
      symbol: h.symbol,
      currency: h.currency,
    });
  }

  openTransactionDialog() {
    this.createTransactionForm.reset({
      holdingId: '',
      tradeDate: this.todayStr(),
      type: 'BUY',
      symbol: '',
      currency: '',
      quantity: 0,
      price: 0,
      fee: 0,
      note: '',
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

    const raw = this.createTransactionForm.getRawValue();
    const dto: CreateTransactionDto = {
      accountId,
      holdingId: raw.holdingId,
      tradeDate: new Date(raw.tradeDate).toISOString(),
      type: raw.type,
      quantity: raw.quantity,
      price: raw.price,
      fee: raw.fee,
      note: raw.note || null,
    };

    this.transactionService.createTransaction(dto).subscribe({
      next: () => {
        this.toast.success('已新增交易');
        this.displayTransactionDialog = false;

        this.holdingService.loadHoldings(accountId);
        this.transactionService.loadTransactionsByAccount(accountId);
      },
      error: (err) => {
        console.error(err);
        this.toast.error(err?.error?.message ?? '新增交易失敗');
      },
    });
  }

  openTransactionEdit(t: TransactionDto) {
    this.selectedTx.set(t);

    const yyyyMmDd = new Date(t.tradeDate).toISOString().slice(0, 10);

    this.editTransactionForm.reset({
      holdingId: t.holdingId,
      tradeDate: yyyyMmDd,
      type: t.type,
      symbol: t.symbol,
      currency: t.currency,
      quantity: t.quantity,
      price: t.price,
      fee: t.fee,
      note: t.note ?? '',
    });

    this.displayEditTransactionDialog = true;
  }

  cancelEditTransactionDialog() {
    this.displayEditTransactionDialog = false;
  }

  submitEditTransaction() {
    const tx = this.selectedTx();
    const accountId = this.accountIdSignal();
    if (!tx || !accountId) return;

    if (this.editTransactionForm.invalid) {
      this.editTransactionForm.markAllAsTouched();
      return;
    }

    const raw = this.editTransactionForm.getRawValue();

    const dto: UpdateTransactionDto = {
      accountId,
      holdingId: raw.holdingId,
      tradeDate: new Date(raw.tradeDate).toISOString(),
      type: raw.type,
      quantity: raw.quantity,
      price: raw.price,
      fee: raw.fee,
      note: raw.note || null,
    };

    this.transactionService.updateTransaction(tx.id, dto).subscribe({
      next: () => {
        this.toast.success('已更新交易');
        this.displayEditTransactionDialog = false;

        this.holdingService.loadHoldings(accountId);
        this.transactionService.loadTransactionsByAccount(accountId);
      },
      error: (err) => {
        console.error(err);
        this.toast.error(err?.error?.message ?? '更新交易失敗');
      },
    });
  }

  deleteTransaction(t: TransactionDto) {
    const accountId = this.accountIdSignal();
    if (!accountId) return;

    const ok = window.confirm(`確定要刪除這筆交易嗎？（${t.symbol} ${t.type}）`);
    if (!ok) return;

    this.transactionService.deleteTransaction(t.id).subscribe({
      next: () => {
        this.toast.success('已刪除交易');
        this.holdingService.loadHoldings(accountId);
        this.transactionService.loadTransactionsByAccount(accountId);
      },
      error: (err) => {
        console.error(err);
        this.toast.error(err?.error?.message ?? '刪除交易失敗');
      },
    });
  }

  // ===== validation helpers =====
  hasTxError(controlName: keyof typeof this.createTransactionForm.controls, error: string) {
    const ctrl = this.createTransactionForm.get(controlName);
    return ctrl?.touched && ctrl.hasError(error);
  }

  // ===== ARR chart =====

  // ✅ 修法 #1：先把原始 ARR 計算抽成「純 computed」，讓 chartData / meta 都共用同一份結果
  private arrResults = computed(() => {
    const holdings = this.holdings();
    const txs = this.transactions();
    if (!holdings.length || !txs.length) return [];

    const arrResults = calcArrPerHolding(
      holdings.map((h) => ({
        symbol: h.symbol,
        currency: h.currency,
        marketValue: h.marketValue,
      })),
      txs
    );

    const usable = arrResults.filter((r) => r.years > 0 && r.totalInvested > 0);
    return usable;
  });

  // ✅ 修法 #1：arrMeta 改成 computed（不再在 computed 內 set signal）
  private arrMeta = computed<Array<{ totalInvested: number; currentValue: number }>>(() => {
    const usable = this.arrResults();
    return usable.map((r) => ({
      totalInvested: r.totalInvested,
      currentValue: r.currentValue,
    }));
  });

  accountArrChartData = computed(() => {
    const usable = this.arrResults();
    if (!usable.length) return null;

    // ✅ 顯示全部（你要前五也可在這裡 slice）
    const labels = usable.map((r) => r.symbol);
    const values = usable.map((r) => r.arr * 100);

    const backgroundColor = usable.map((r) =>
      r.arr < 0 ? 'rgb(239, 68, 68)' : 'rgb(80, 69, 229)'
    );

    const hoverBackgroundColor = usable.map((r) =>
      r.arr < 0 ? 'rgba(239, 68, 68, 0.85)' : 'rgba(80, 69, 229, 0.85)'
    );

    return {
      labels,
      datasets: [
        {
          label: 'ARR (XIRR, %)',
          data: values,
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
