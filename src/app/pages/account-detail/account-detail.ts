import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { finalize } from 'rxjs/operators';

import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CardModule } from 'primeng/card';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { FileUploadModule } from 'primeng/fileupload';


import { AccountService } from '../../core/services/account.service';
import { HoldingService } from '../../core/services/holding.service';
import { TransactionService } from '../../core/services/transaction.service';
import { ToastService } from '../../core/services/toast.service';
import {
  DataExchangeService,
  ExportFormat,
  ImportTarget,
} from '../../core/services/data-exchange.service';


import { AccountDto } from '../../core/models/account.model';
import { HoldingDto, CreateHoldingDto, UpdateHoldingDto } from '../../core/models/holding.model';
import {
  TransactionDto,
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionVm,
} from '../../core/models/transaction.model';

import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { calcArrPerHolding } from '../../core/utils/arr.util';

import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { AccountSummaryDto } from '../../core/models/account-summary.model';

// ✅ ✅ NEW：SignalR + Prices service
import { SignalrService } from '../../core/services/signalr.service';
import { PricesService } from '../../core/services/prices.service';

// 定義 PrimeNG 標籤可接受的 severity 類型
type SeverityType = 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast';

// ✅ 交易類型（前端用）
type TxType = 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW' | 'DIVIDEND' | 'INTEREST';

type TxSigInput = { id: string; totalAmount: number; tradeDate: Date };

@Component({
  selector: 'app-account-detail-page',
  standalone: true,
  templateUrl: './account-detail.html',
  styleUrl: './account-detail.scss',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    TabsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    SelectModule,
    ToastModule,
    ChartModule,
    TagModule,
    TooltipModule, // ✅ 讓 p-tag 的 tooltip 正式可用
    ConfirmDialogModule,
    FileUploadModule,
  ],
  providers: [ConfirmationService],
})
export class AccountDetailPage implements OnInit {
  @ViewChild('dt') dt!: Table; // 獲取 p-table 實例 (如果還沒加的話)

  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private accountService = inject(AccountService);
  private holdingService = inject(HoldingService);
  private transactionService = inject(TransactionService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private confirmService = inject(ConfirmationService);

  // ✅ NEW：匯入/匯出 service
  private dataExchange = inject(DataExchangeService);

  // ✅ ✅ NEW
  private signalr = inject(SignalrService);
  private pricesService = inject(PricesService);

  accountIdSignal = signal<string | null>(null);

  // ✅ Summary（後端算好最乾淨）
  accountSummary = signal<AccountSummaryDto | null>(null);

  // ✅ ✅ 小保護：避免 holdings 先更新、summary 還沒更新造成畫面閃一下
  // 我們會在「更新市價 / 新增交易 / 更新交易 / 刪除交易」後啟動 refresh guard
  // 等 holdings + summary 都「更新過」再解除 isRefreshing
  isRefreshing = signal(false);

  // ✅ ✅ refresh guard：記錄刷新前的 baseline signature
  private refreshNeed = signal<{ holdings: boolean; summary: boolean; txs: boolean } | null>(null);
  private baselineHoldingsSig = signal<string>('');
  private baselineSummarySig = signal<string>('');
  private baselineTxsSig = signal<string>('');

  // ✅ ✅ NEW：用「載入時間戳」當 guard 完成條件（避免資料值一樣卡死）
  private baselineHoldingsLoadedAt = signal<number>(0);
  private baselineTxsLoadedAt = signal<number>(0);
  private baselineSummaryLoadedAt = signal<number>(0);

  // ✅ ✅ NEW：Summary 的 loadedAt 由 page 自己記（因為 summary load 在 page）
  private summaryLoadedAt = signal<number>(0);

  // ✅ ✅ NEW：避免「同一波 server 推播」造成你連續 refresh 多次
  private lastAutoRefreshAt = 0;

  // ✅ ✅ NEW：紀錄 SignalR 是否準備好（用於 on-demand fallback）
  private signalrReady = signal(false);

  // ✅ ✅ NEW：紀錄「本分頁手動觸發刷新」的時間（用來判斷 push 是否自己造成）
  private lastManualRefreshAt = 0;

  constructor() {
    // ✅ ✅ 監聽：當 refreshNeed 存在時，等所需資料都「變更」才解除刷新狀態
    effect(() => {
      const need = this.refreshNeed();
      if (!need) return;

      // ✅ ✅ NEW：用 loadedAt 來判斷「是否完成一次 load」
      const holdingsLoadedAtNow = this.holdingService.holdingsLoadedAt();
      const txsLoadedAtNow = this.transactionService.txsLoadedAt();
      const summaryLoadedAtNow = this.summaryLoadedAt();

      const holdingsOk = !need.holdings || holdingsLoadedAtNow > this.baselineHoldingsLoadedAt();

      const txsOk = !need.txs || txsLoadedAtNow > this.baselineTxsLoadedAt();

      const summaryOk = !need.summary || summaryLoadedAtNow > this.baselineSummaryLoadedAt();

      if (holdingsOk && summaryOk && txsOk) {
        this.isRefreshing.set(false);
        this.refreshNeed.set(null);
      }
    });

    this.destroyRef.onDestroy(() => {
      // ✅ 解除本頁 listener（不影響其他頁）
      this.offAccountUpdated?.();
      this.offAccountUpdated = undefined;

      // ✅ 離開 account group（不斷線）
      const id = this.joinedAccountId;
      if (id) {
        void this.signalr.leaveAccount(id); // 不 await，避免 onDestroy async
        this.joinedAccountId = undefined;
      }

      // ❌ 不要 stop()
    });
  }

  // ✅ ✅ 產生 signature（用於判斷資料是否已更新過）
  private makeHoldingsSignature(list: HoldingDto[] | null | undefined): string {
    if (!list?.length) return '';
    // 只抓會影響摘要/未實現的關鍵欄位：id/qty/avgCost/marketPrice/marketValue/unrealized
    return list
      .map((h) =>
        [
          h.id,
          h.quantity ?? 0,
          h.avgCost ?? 0,
          h.marketPrice ?? 0,
          h.marketValue ?? 0,
          h.unrealizedPnl ?? 0,
        ].join('|')
      )
      .join('~');
  }

  private makeSummarySignature(s: AccountSummaryDto | null): string {
    if (!s) return '';
    return [
      s.totalMarketValue ?? 0,
      s.totalInvested ?? 0,
      s.netInvested ?? 0,
      s.realizedProfit ?? 0,
      s.unrealizedProfit ?? 0,
      s.totalProfit ?? 0,
      s.realizedReturnRate ?? 0,
    ].join('|');
  }

  private makeTxsSignature(list: TxSigInput[] | null | undefined): string {
    if (!list?.length) return '';
    // 交易列表只需要判斷是否更新過：取 id + totalAmount（即可）
    return list.map((t) => `${t.id}|${t.totalAmount ?? 0}|${t.tradeDate.getTime()}`).join('~');
  }

  // ✅ ✅ 啟動 refresh guard（記錄 baseline，然後觸發 load）
  private beginRefreshGuard(opt: { holdings?: boolean; summary?: boolean; txs?: boolean }) {
    const need = {
      holdings: !!opt.holdings,
      summary: !!opt.summary,
      txs: !!opt.txs,
    };

    // ✅ ✅ NEW：baseline 用 loadedAt（更可靠）
    this.baselineHoldingsLoadedAt.set(this.holdingService.holdingsLoadedAt());
    this.baselineTxsLoadedAt.set(this.transactionService.txsLoadedAt());
    this.baselineSummaryLoadedAt.set(this.summaryLoadedAt());

    this.baselineHoldingsSig.set(this.makeHoldingsSignature(this.holdings()));
    this.baselineSummarySig.set(this.makeSummarySignature(this.accountSummary()));
    this.baselineTxsSig.set(this.makeTxsSignature(this.transactions()));

    this.isRefreshing.set(true);
    this.refreshNeed.set(need);
  }

  // ✅ ✅ 統一刷新：你要等哪幾個，就在這裡指定
  private refreshAccountData(
    accountId: string,
    opt: { holdings?: boolean; summary?: boolean; txs?: boolean }
  ) {
    console.log('Refreshing data for account:', accountId);
    this.beginRefreshGuard(opt);
    if (opt.holdings) {
      console.log('Refreshing holdings...');
      this.holdingService.loadHoldings(accountId);
    }
    if (opt.txs) {
      console.log('Refreshing transactions...');
      this.transactionService.loadTransactionsByAccount(accountId);
    }
    if (opt.summary) {
      console.log('Refreshing summary...');
      this.loadAccountSummary(accountId);
    }
  }

  // ==============================
  // ✅ ✅ NEW：Realtime（SignalR）+ On-demand refresh
  // ==============================
  private getAccessToken(): string | null {
    // ✅ 這裡請改成你真正存 token 的 key（若不是 'token'）
    // 常見：localStorage.getItem('access_token') / 'jwt' / AuthService.getToken()
    return localStorage.getItem('demo_token');
  }

  // （記住 unsubscribe function）
  private offAccountUpdated?: () => void;
  private joinedAccountId?: string;

  private async setupRealtime(accountId: string) {
    try {
      console.log('Setting up SignalR connection...');
      await this.signalr.ensureConnected(() => this.getAccessToken()); // 有成功

      // ✅ 記住這次 join 的 accountId（供 onDestroy leave 用）
      this.joinedAccountId = accountId;
      // ✅ 先註冊 listener，並保留 off function
      this.offAccountUpdated?.(); // 防止 setupRealtime 被重跑造成累積

      this.offAccountUpdated = this.signalr.onAccountUpdated((updatedAccountId) => {
        console.log(`Received SignalR update for account: ${updatedAccountId}`);
        // 只處理目前頁面的 account
        if (updatedAccountId !== accountId) return;

        // ✅ ✅ 簡單去抖（避免短時間連續推播造成多次 refresh）
        const now = Date.now();
        if (now - this.lastAutoRefreshAt < 800) return;
        this.lastAutoRefreshAt = now;

        console.log('SignalR: Account updated, refreshing data...');

        // ✅ ✅ NEW：成功收到 SignalR 推播 → 提示使用者

        // ✅ ✅ NEW：判斷這個 push 是不是「自己手動刷新」造成的
        const fromSelf = now - this.lastManualRefreshAt < 1500; // 1.5 秒你可調
        if (!fromSelf) {
          this.toast.success('成功收到 SignalR 推播，已更新（即時同步）');
        } else {
          // ✅ 可選：你也可以不要顯示任何 toast（最安靜）
          // this.toast.success('市價已更新 ✅');
        }

        // ✅ 收到「更新完成」→ 自動刷新（你既有 refresh guard）
        this.refreshAccountData(accountId, { holdings: true, txs: true, summary: true });
      });
      // // ✅ 註冊推播事件（只註冊一次 handler，service 會自動 off 舊 handler）
      // this.signalr.onAccountUpdated((updatedAccountId) => {});

      // ✅ Join group：讓 server 用 group 推播更新完成
      await this.signalr.joinAccount(accountId);
      console.log(`SignalR: Successfully joined account group for account ID: ${accountId}`);

      // ✅ ✅ 設定為 ready（讓 on-demand fallback 有判斷依據）
      this.signalrReady.set(true);

      // ✅ ✅ NEW：On-demand refresh（stale 才更新，成本最低）
      // ✅ 放在 SignalR ready + join group 後，避免 fallback 先刷造成你誤判「沒收到 push」
      this.triggerOnDemandRefresh(accountId);
    } catch (err) {
      console.error('setupRealtime error', err);
      this.signalrReady.set(false);
      // ✅ ✅ NEW：On-demand refresh（stale 才更新，成本最低）
      // ✅ 放在 SignalR ready + join group 後，避免 fallback 先刷造成你誤判「沒收到 push」
      this.triggerOnDemandRefresh(accountId);
    }
  }

  // 進頁面自動 stale-only 更新
  private triggerOnDemandRefresh(accountId: string) {
    // ✅ On-demand：讓後端判斷 stale 才更新（成本最低）
    this.pricesService
      .refreshAccountPrices(accountId, false)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          console.log(
            'refresh result',
            res.didUpdate,
            res.reason,
            res.updatedHoldingsCount,
            res.message
          );
          // res.didUpdate=true 表示後端真的更新了
          // 正常情況：server 會推播 accountUpdated → 由 push 觸發 refreshAccountData
          // ✅ fallback：若 SignalR 沒 ready（或掛了），則在 didUpdate=true 時自己 refresh 一次
          if (res?.didUpdate && !this.signalrReady()) {
            this.refreshAccountData(accountId, { holdings: true, txs: true, summary: true });
          }
        },
        error: (err) => console.error('refreshAccountPrices error', err),
      });
  }

  // ✅ 手動按鈕入口：stale-only 或 force
  refreshPrices(force: boolean) {
    const accountId = this.accountIdSignal();
    if (!accountId) return;

    // ✅ ✅ NEW：標記「這是本分頁手動按下去的刷新」
    this.lastManualRefreshAt = Date.now();

    // ✅ ✅ NEW：force=true 一定會更新 → 直接開 guard（讓 loading 完全交給 guard 收掉）
    // ✅ ✅ NEW：force=false 不一定更新 → 不要先開 guard，等 didUpdate=true 再開
    if (force) {
      // ⭐ 市價刷新：只需要 holdings + summary（交易不會變）
      this.refreshAccountData(accountId, { holdings: true, txs: false, summary: true });
    }

    this.pricesService
      .refreshAccountPrices(accountId, force)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          console.log(
            'refresh result',
            res.didUpdate,
            res.reason,
            res.updatedHoldingsCount,
            res.message
          );

          // ✅ ✅ NEW：force=false 且 didUpdate=false → 不開 guard，也不會卡 loading（因為根本沒開）
          if (!force && !res.didUpdate) {
            // 你想提示就提示，不想就保持安靜
            if (res.reason === 'NOT_STALE') this.toast.info('目前市價仍新，不需更新');
            if (res.reason === 'NO_HOLDINGS') this.toast.info('此帳戶目前沒有持倉，不需要更新市價');
            return;
          }

          // ✅ ✅ NEW：force=false 但 didUpdate=true → 這時才開 guard（產品級：只在真的更新時轉圈圈）
          if (!force && res.didUpdate) {
            this.refreshAccountData(accountId, { holdings: true, txs: false, summary: true });
          }

          // ✅ ✅ 注意：正常情況 server 會推播 accountUpdated
          // 但如果 SignalR 沒 ready，就 fallback 自己刷一次
          if (res.didUpdate && !this.signalrReady()) {
            // ⭐ fallback 也只要 holdings + summary
            this.refreshAccountData(accountId, { holdings: true, txs: false, summary: true });
          }

          if (res.didUpdate) this.toast.success('市價已更新 ✅');
        },
        error: (err) => {
          console.error('refreshAccountPrices error', err);

          // ✅ ✅ NEW：如果你是 force=true，你一開始就開了 guard → 失敗要把 guard 收掉避免卡住
          // ✅ ✅ NEW：如果 force=false，你可能根本沒開 guard → 這段也安全
          this.isRefreshing.set(false);
          this.refreshNeed.set(null);

          this.toast.error('更新市價失敗，請稍後再試');
        },
        // ✅ ✅ NEW：不再在 complete 裡收 isRefreshing（完全交給 guard）
        // complete: () => {}
      });
  }

  // ✅ 強制刷新：先 confirm（避免誤按）
  confirmForceRefresh() {
    this.confirmService.confirm({
      header: '強制刷新市價',
      icon: 'pi pi-exclamation-triangle',
      message: '將忽略 stale 規則直接重抓市價（可能較耗資源）。確定要執行嗎？',
      acceptLabel: '強制刷新',
      rejectLabel: '取消',
      acceptButtonStyleClass: 'p-button-warning',
      accept: () => this.refreshPrices(true),
    });
  }

  // ==============================
  // ✅ ✅ NEW：CSV / Excel 匯入匯出（產品級）
  // ==============================

  // 匯入 dialog
  displayImportDialog = false;

  // 匯入目標：holdings / transactions
  importTarget = signal<ImportTarget>('transactions');

  // 目前選到的檔案
  importFile = signal<File | null>(null);

  // 上傳中
  isImporting = signal(false);

  // 你要限制副檔名（CSV/Excel）
  readonly importAccept = '.csv,.xlsx,.xls';

  openImportDialog(target: ImportTarget) {
    this.importTarget.set(target);
    this.importFile.set(null);
    this.displayImportDialog = true;
  }

  cancelImportDialog() {
    this.displayImportDialog = false;
    this.importFile.set(null);
    this.isImporting.set(false);
  }

  onPickImportFile(file: File | null) {
    this.importFile.set(file);
  }

  // ✅ 下載 Blob
  private downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // ✅ 匯出：holdings
  exportHoldings(format: ExportFormat) {
    const accountId = this.accountIdSignal();
    if (!accountId) return;

    const ts = new Date();
    const y = ts.getFullYear();
    const m = String(ts.getMonth() + 1).padStart(2, '0');
    const d = String(ts.getDate()).padStart(2, '0');

    const ext = format === 'csv' ? 'csv' : 'xlsx';
    const filename = `holdings_${accountId}_${y}${m}${d}.${ext}`;

    this.dataExchange.exportHoldings(accountId, format).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, filename);
        this.toast.success(`已匯出持有標的（${format.toUpperCase()}）`);
      },
      error: (err) => {
        console.error(err);
        this.toast.error('匯出持有標的失敗');
      },
    });
  }

  // ✅ 匯出：transactions
  exportTransactions(format: ExportFormat) {
    const accountId = this.accountIdSignal();
    if (!accountId) return;

    const ts = new Date();
    const y = ts.getFullYear();
    const m = String(ts.getMonth() + 1).padStart(2, '0');
    const d = String(ts.getDate()).padStart(2, '0');

    const ext = format === 'csv' ? 'csv' : 'xlsx';
    const filename = `transactions_${accountId}_${y}${m}${d}.${ext}`;

    this.dataExchange.exportTransactions(accountId, format).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, filename);
        this.toast.success(`已匯出交易紀錄（${format.toUpperCase()}）`);
      },
      error: (err) => {
        console.error(err);
        this.toast.error('匯出交易紀錄失敗');
      },
    });
  }

  // ✅ 匯入（依 target 呼叫不同 API）
  submitImport2() {
    const accountId = this.accountIdSignal();
    if (!accountId) return;

    const file = this.importFile();
    if (!file) {
      this.toast.error('請先選擇要匯入的檔案（CSV 或 Excel）');
      return;
    }

    this.isImporting.set(true);

    const target = this.importTarget();

    const req$ =
      target === 'holdings'
        ? this.dataExchange.importHoldings(accountId, file)
        : this.dataExchange.importTransactions(accountId, file);

    req$.subscribe({
      next: (res) => {
        // 後端回傳格式你可微調；這裡先用通用欄位
        if (res?.ok) {
          const inserted = res.inserted ?? 0;
          const updated = res.updated ?? 0;
          const skipped = res.skipped ?? 0;
          const failed = res.failed ?? 0;

          this.toast.success(
            `匯入成功 ✅ inserted:${inserted}, updated:${updated}, skipped:${skipped}, failed:${failed}`
          );

          this.displayImportDialog = false;

          // ✅ 匯入後刷新
          // 匯入 holdings：通常會影響 holdings + summary（若你匯入含 marketPrice，也會影響）
          // 匯入 transactions：一定影響 holdings + txs + summary
          if (target === 'holdings') {
            this.refreshAccountData(accountId, { holdings: true, summary: true });
          } else {
            this.refreshAccountData(accountId, { holdings: true, txs: true, summary: true });
          }

          // 若後端有 errors，想顯示也可以：
          if (res.errors?.length) {
            console.warn('Import errors:', res.errors);
            // 你也可以另外做一個 dialog 顯示錯誤清單（產品級）
          }
        } else {
          this.toast.error(res?.message ?? '匯入失敗（後端回傳 ok=false）');
        }
      },
      error: (err) => {
        console.error(err);
        const msg = err?.error?.message ?? '匯入失敗，請檢查檔案格式';
        this.toast.error(msg);
      },
      complete: () => {
        this.isImporting.set(false);
      },
    });
  }
  submitImport() {
    const accountId = this.accountIdSignal();
    if (!accountId) return;

    const file = this.importFile();
    if (!file) {
      this.toast.error('請先選擇要匯入的檔案（CSV 或 Excel）');
      return;
    }

    this.isImporting.set(true);

    const target = this.importTarget();
    const req$ =
      target === 'holdings'
        ? this.dataExchange.importHoldings(accountId, file)
        : this.dataExchange.importTransactions(accountId, file);

    req$
      .pipe(finalize(() => this.isImporting.set(false))) // ✅ 保證收掉 loading
      .subscribe({
        next: (res) => {
          if (res?.ok) {
            this.toast.success(
              `匯入成功 ✅ inserted:${res.inserted ?? 0}, updated:${res.updated ?? 0}, skipped:${
                res.skipped ?? 0
              }, failed:${res.failed ?? 0}`
            );

            this.displayImportDialog = false;

            if (target === 'holdings') {
              this.refreshAccountData(accountId, { holdings: true, summary: true });
            } else {
              this.refreshAccountData(accountId, { holdings: true, txs: true, summary: true });
            }
          } else {
            this.toast.error(res?.message ?? '匯入失敗（ok=false）');
          }
        },
        error: (err) => {
          console.error(err);
          const msg =
            err?.error?.message ??
            (target === 'holdings'
              ? '匯入持倉失敗，請確認檔案有 Holdings 工作表與正確欄位'
              : '匯入交易失敗，請確認檔案格式');
          this.toast.error(msg);
        },
      });
  }

  // ==============================

  account = computed<AccountDto | null>(() => {
    const id = this.accountIdSignal();
    if (!id) return null;
    return this.accountService.accounts().find((a) => a.id === id) ?? null;
  });

  activeTab = signal<'holdings' | 'transactions'>('holdings');

  holdings = this.holdingService.holdings;
  transactions = this.transactionService.transactions; // 本來就會是 TransactionVm[]

  // dialogs
  displayCreateHoldingDialog = false;
  displayEditHoldingDialog = false;
  displayMarketPriceDialog = false;
  displayTransactionDialog = false;
  displayEditTransactionDialog = false;

  // selected
  selectedHolding = signal<HoldingDto | null>(null);
  selectedTx = signal<TransactionVm | null>(null);

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

  // ==============================
  // ✅ ✅ 小工具：自動計算手續費 / 交易稅（產品級）
  // ==============================
  // 台股常用：手續費 0.1425%（券商可折扣），交易稅 0.3%（賣出）
  private readonly STOCK_FEE_RATE = 0.001425;
  private readonly STOCK_TAX_RATE = 0.003;

  // 你的券商折扣（例：5折 = 0.5、65折 = 0.65；不知道就先用 1）
  // ✅ 你未來可把這個搬到 AccountSetting / Profile 裡
  private readonly FEE_DISCOUNT = 1;

  // 台股手續費最低通常 20（多數券商規則），這裡只對 TWD 套用
  private readonly MIN_FEE_TWD = 20;

  // ✅ 自動寫入欄位，但「如果使用者手動改過（dirty）就不覆蓋」
  private setAutoNumber(control: { setValue: Function; markAsPristine: Function }, value: number) {
    control.setValue(value, { emitEvent: false });
    control.markAsPristine();
  }

  private roundMoney(v: number): number {
    // 台股帳務常用四捨五入到整數元
    if (!Number.isFinite(v)) return 0;
    return Math.round(v);
  }

  private getHoldingById(holdingId: string | null | undefined): HoldingDto | null {
    if (!holdingId) return null;
    return this.holdings().find((h) => h.id === holdingId) ?? null;
  }

  // ✅ 判斷是否台股：TWD + (STOCK/ETF) → SELL 才要算交易稅
  private isTaiwanStockOrEtf(h: HoldingDto | null): boolean {
    if (!h) return false;
    return h.currency === 'TWD' && (h.assetType === 'STOCK' || h.assetType === 'ETF');
  }

  private calcFee(gross: number, currency: string): number {
    const raw = gross * this.STOCK_FEE_RATE * this.FEE_DISCOUNT;
    const rounded = this.roundMoney(raw);

    // 台股（TWD）常見最低手續費 20
    if (currency === 'TWD') return Math.max(rounded, this.MIN_FEE_TWD);
    return Math.max(rounded, 0);
  }

  private calcTax(gross: number): number {
    return Math.max(this.roundMoney(gross * this.STOCK_TAX_RATE), 0);
  }

  // ✅ 在表單中自動計算 fee/tax（BUY: fee；SELL: fee+tax）
  private wireAutoFeeTax(form: typeof this.createTransactionForm) {
    const typeCtrl = form.controls.type;
    const holdingIdCtrl = form.controls.holdingId;
    const qtyCtrl = form.controls.quantity;
    const priceCtrl = form.controls.price;

    // fee/tax
    const feeCtrl = form.controls.fee;
    const taxCtrl = form.controls.tax;

    // 只要這四個欄位任一變動就嘗試重算（產品級：即時）
    const recalc = () => {
      const raw = form.getRawValue();
      const type = raw.type as TxType;

      // 只有 BUY/SELL 才用 qty*price
      if (!(type === 'BUY' || type === 'SELL')) return;

      const h = this.getHoldingById(raw.holdingId);
      const currency = h?.currency ?? (raw as any).currency ?? 'TWD';

      const qty = Number(raw.quantity ?? 0);
      const price = Number(raw.price ?? 0);
      if (!Number.isFinite(qty) || !Number.isFinite(price) || qty <= 0 || price < 0) return;

      const gross = qty * price; // 成交金額（未含費稅）

      // ✅ fee：如果使用者沒手改（pristine）才自動覆蓋
      if (feeCtrl.pristine) {
        const fee = this.calcFee(gross, currency);
        this.setAutoNumber(feeCtrl, fee);
      }

      // ✅ tax：只在 SELL + 台股/ETF（TWD）自動算；其他自動 0
      if (type === 'SELL') {
        const shouldTax = this.isTaiwanStockOrEtf(h);
        const tax = shouldTax ? this.calcTax(gross) : 0;

        if (taxCtrl.pristine) {
          this.setAutoNumber(taxCtrl, tax);
        }
      } else {
        // BUY：通常 0
        if (taxCtrl.pristine) {
          this.setAutoNumber(taxCtrl, 0);
        }
      }
    };

    // ✅ 訂閱：任何相關欄位變動就 recalculation
    typeCtrl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => recalc());
    holdingIdCtrl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => recalc());
    qtyCtrl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => recalc());
    priceCtrl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => recalc());
  }

  // 必須加入的方法 3：用於 p-tag 顏色顯示
  getSeverity(type: string): SeverityType {
    // ⬅️ 將回傳類型從 string 更改為 SeverityType
    switch (type) {
      case 'BUY':
        return 'success';
      case 'SELL':
        return 'danger';
      case 'DIVIDEND':
        return 'info';
      case 'INTEREST':
        return 'info';
      case 'DEPOSIT':
        return 'secondary';
      case 'WITHDRAW':
        return 'contrast';
      default:
        return 'secondary';
    }
  }

  // ✅ 讓「股利」更明顯：交易列表的 Tag 文字顯示
  getFriendlyTypeLabel(type: string): string {
    // ✅ 特例：股利（已實現）
    if (type === 'DIVIDEND') return '股利（已實現）';
    if (type === 'INTEREST') return '利息（已實現）';

    const option = this.transactionTypeOptions.find((opt) => opt.value === type);
    if (option) {
      const match = option.label.match(/([^\s]+)\s*\(/);
      return match ? match[1] : option.label;
    }
    return type; // 如果找不到，則返回原始代碼
  }

  // ✅ 讓「股利」更明顯：交易列表的 Tag tooltip（已實現說明）
  // 你只要在 HTML 的 <p-tag> 加上 [pTooltip]="getTxTagTooltip(t.type)" 就會生效
  getTxTagTooltip(type: string): string {
    switch (type) {
      case 'DIVIDEND':
        return '已實現：股利入帳（現金流入）。不影響持倉數量，但會影響「已實現獲利/總獲利」。';
      case 'INTEREST':
        return '已實現：利息入帳（現金流入）。不影響持倉數量，但會影響「已實現獲利/總獲利」。';
      case 'BUY':
        return '買進：現金流出，會增加持倉數量，並影響均價/未實現損益。';
      case 'SELL':
        return '賣出：現金流入，會減少持倉數量，並影響「已實現獲利」。';
      case 'DEPOSIT':
        return '存入：現金流出（投資人視角），通常用於現金帳戶資金投入。';
      case 'WITHDRAW':
        return '提領：現金流入（投資人視角），通常用於現金帳戶資金抽回。';
      default:
        return '';
    }
  }

  // ✅ 給 HTML 判斷用：BUY/SELL
  isBuySell(type: string | null | undefined): boolean {
    return type === 'BUY' || type === 'SELL';
  }

  // ✅ 給 HTML 判斷用：SELL（解你 template 的 isSell 報錯）
  isSell(type: string | null | undefined): boolean {
    return type === 'SELL';
  }

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

  // ✅ 交易表單：新增 tax（產品級：cash-in/out 要準）
  createTransactionForm = this.fb.nonNullable.group({
    holdingId: ['', [Validators.required]],
    tradeDate: [this.todayStr(), [Validators.required]],
    type: ['BUY' as TxType, [Validators.required]],
    symbol: [{ value: '', disabled: true }],
    currency: [{ value: '', disabled: true }],
    // BUY/SELL 用
    quantity: [0, []],
    price: [0, []],
    // ✅ 其他類型用
    amount: [0, []],

    fee: [0, [Validators.min(0)]],

    // ✅ NEW
    tax: [0, [Validators.min(0)]],

    note: [''],
  });

  editTransactionForm = this.fb.nonNullable.group({
    holdingId: ['', [Validators.required]],
    tradeDate: [this.todayStr(), [Validators.required]],
    type: ['BUY' as TxType, [Validators.required]],
    symbol: [{ value: '', disabled: true }],
    currency: [{ value: '', disabled: true }],

    quantity: [0, []],
    price: [0, []],
    amount: [0, []],

    fee: [0, [Validators.min(0)]],

    // ✅ NEW
    tax: [0, [Validators.min(0)]],

    note: [''],
  });

  // ===== computed =====

  // ✅ 這裡你的「總資產 / 投入 / 淨投入」你已經能用交易與 holdings 算出來
  // 但「已實現/未實現/總獲利」我們改成直接吃後端 summary（最乾淨）
  //
  // ✅ ✅ 改：摘要區全部吃 summary（避免 holdings 與 summary 混用打架）
  accountTotalValue = computed(() => this.accountSummary()?.totalMarketValue ?? 0);

  // ✅ 總投入（投資人視角）：把所有「現金流出」加總（totalAmount < 0）
  // 這會包含 BUY / DEPOSIT 等（你後端 totalAmount 已算好最乾淨）
  //
  // ✅ ✅ 改：直接吃 summary
  accountTotalInvested = computed(() => this.accountSummary()?.totalInvested ?? 0);

  // ✅ 淨投入：總投入 - 提領（WITHDRAW 為現金流入）
  //
  // ✅ ✅ 改：直接吃 summary
  accountNetInvested = computed(() => this.accountSummary()?.netInvested ?? 0);

  // ✅ 三段式：已實現 / 未實現 / 總獲利（顯示用，直接讀 Summary）
  accountRealizedProfit = computed(() => this.accountSummary()?.realizedProfit ?? 0);
  accountRealizedReturnRate = computed(() => this.accountSummary()?.realizedReturnRate ?? 0);

  accountUnrealizedProfit = computed(() => this.accountSummary()?.unrealizedProfit ?? 0);

  accountTotalProfit = computed(() => this.accountSummary()?.totalProfit ?? 0);

  // ✅ 你後端目前 DTO 沒有 totalReturnRate，我們用「總獲利 ÷ 總投入」前端即時計（不會跟後端衝突）
  //
  // ✅ ✅ 改：分母也用 summary 的 totalInvested（摘要全套一致）
  accountTotalReturnRate = computed(() => {
    const invested = this.accountTotalInvested();
    if (!invested) return 0;
    return (this.accountTotalProfit() / invested) * 100;
  });

  // ✅ Tooltip：你要「介紹 accountRealizedReturnRate 怎麼算」
  getRealizedTooltip(): string {
    return [
      '✅ 已實現獲利（Realized Profit）',
      '把「已結束的現金成果」算進來：',
      '＝ 賣出收入 + 股利/利息',
      '－ 買進成本（平均成本法）',
      '－ 手續費（fee）',
      '－ 交易稅（tax）',
      '',
      '✅  已實現報酬率（Realized Return Rate, %）',
      '＝ 已實現獲利 ÷ 總投入 × 100%',
      '(總投入：所有現金流出加總，例如 BUY/DEPOSIT)',
    ].join('\n');
  }

  getUnrealizedTooltip(): string {
    return [
      '✅ 未實現損益（Unrealized Profit）',
      '只看「目前還持有的部位」：',
      '＝ 目前市值（市價×數量）－ 持倉成本（均價×數量）',
      '（不含股利/利息，因為那是已實現現金流入）',
      '📌  (還沒計算賣出時的手續費和交易稅，只是預估，實際會更少)',
    ].join('\n');
  }

  getTotalProfitTooltip(): string {
    return [
      '✅ 總獲利（Total Profit）',
      '＝ 已實現獲利 + 未實現損益',
      '',
      '✅ 總報酬率（Total Return Rate, %）',
      '＝ 總獲利 ÷ 總投入 × 100%',
      '📌已實現獲利：你「真的落袋」的損益（含賣出差價、股利、利息，扣 fee/tax）',
      '📌未實現獲利：你「帳面」的損益（目前市價 - 成本，不含股利/利息，也不含未來賣出成本如手續費和交易稅）',
      '📌總獲利：上述兩個加總',
    ].join('\n');
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id'); // 帳戶 account id
    if (!id) return;

    this.accountIdSignal.set(id);

    if (this.accountService.accounts().length === 0) {
      this.accountService.loadAccounts();
    }

    this.holdingService.loadHoldings(id);
    this.transactionService.loadTransactionsByAccount(id);

    // ✅ 初始化：載入 Summary（後端算好最乾淨）
    this.loadAccountSummary(id);

    // ✅ ✅ NEW：先建立 SignalR（更新完成自動刷新）
    // 不要擋 UI，所以不 await；錯誤在 setupRealtime 裡處理
    this.setupRealtime(id);

    // ✅ ✅ NEW：On-demand refresh（stale 才更新，成本最低）
    // 若更新成功，server 會推播 accountUpdated
    //this.triggerOnDemandRefresh(id);

    // ✅ 初始化：先依預設 type 套 validator（避免第一次開 dialog 就亂）
    this.applyTxValidators(
      this.createTransactionForm,
      this.createTransactionForm.getRawValue().type
    );
    this.applyTxValidators(this.editTransactionForm, this.editTransactionForm.getRawValue().type);

    // ✅ type 變更自動套 validator（產品級：表單永遠一致）
    this.createTransactionForm.controls.type.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((t) => this.applyTxValidators(this.createTransactionForm, t as TxType));

    this.editTransactionForm.controls.type.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((t) => this.applyTxValidators(this.editTransactionForm, t as TxType));

    // ✅ ✅ NEW：自動算 fee/tax（買：fee；賣：fee+tax）
    this.wireAutoFeeTax(this.createTransactionForm);
    this.wireAutoFeeTax(this.editTransactionForm);

    // ARR options（你原本保留）
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
        y: { ticks: { callback: (v: number) => `${v}%` } },
        x: { ticks: { maxRotation: 0, autoSkip: true } },
      },
    };
  }

  private loadAccountSummary(accountId: string) {
    this.accountService.getAccountSummary(accountId).subscribe({
      next: (res) => {
        this.accountSummary.set(res);
        // ✅ ✅ NEW：就算內容一樣，也代表「summary load 完成」
        this.summaryLoadedAt.set(Date.now());
      },
      error: (err) => console.error(err),
    });
  }

  private todayStr() {
    const d = new Date();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  // ==============================
  // ✅ 交易表單：動態 Validators（你要的 applyTxValidators）
  // ==============================
  // ✅ 動態 Validators（含 tax：只在 SELL 必填）
  private applyTxValidators(form: typeof this.createTransactionForm, type: TxType) {
    const qty = form.controls.quantity;
    const price = form.controls.price;
    const amount = form.controls.amount;
    const tax = form.controls.tax;

    qty.clearValidators();
    price.clearValidators();
    amount.clearValidators();
    tax.clearValidators();

    // tax 永遠 >=0，但「SELL 必填」才有意義
    tax.setValidators([Validators.min(0)]);

    if (type === 'BUY' || type === 'SELL') {
      // BUY/SELL：quantity + price 必填
      qty.setValidators([Validators.required, Validators.min(0.0001)]);
      price.setValidators([Validators.required, Validators.min(0)]);

      // ✅ amount 不用 → 直接 reset 成 0（避免你送出去是舊值）
      amount.setValue(0, { emitEvent: false });

      // ✅ SELL：tax 也必填（讓真實獲利計算更準）
      if (type === 'SELL') {
        tax.addValidators([Validators.required]);
      } else {
        // BUY 預設 0（台股通常買進沒交易稅）
        tax.setValue(0, { emitEvent: false });
      }
    } else {
      // 其他：amount 必填
      amount.setValidators([Validators.required, Validators.min(0.01)]);
      qty.setValue(0, { emitEvent: false });
      price.setValue(0, { emitEvent: false });
      tax.setValue(0, { emitEvent: false }); // 非買賣：通常 0（股利扣繳你也可用 tax 欄位記）
    }

    // 讓表單立刻更新 valid 狀態
    qty.updateValueAndValidity({ emitEvent: false });
    price.updateValueAndValidity({ emitEvent: false });
    amount.updateValueAndValidity({ emitEvent: false });
    tax.updateValueAndValidity({ emitEvent: false });
  }

  // ==============================
  // ✅ HTML 的 onChange（讓 UI 切換當下就同步）
  // （即使 valueChanges 會觸發，我也保留，這樣體感更即時）
  // ==============================
  onCreateTxTypeChange(type: TxType) {
    this.applyTxValidators(this.createTransactionForm, type);
  }

  onEditTxTypeChange(type: TxType) {
    this.applyTxValidators(this.editTransactionForm, type);
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

        // ✅ ✅ 小保護：等 holdings + summary 都更新過再穩定渲染
        this.refreshAccountData(accountId, { holdings: true, summary: true });
      },
      error: (err) => console.error(err),
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

        // ✅ ✅ 小保護：等 holdings + summary 都更新過再穩定渲染
        this.refreshAccountData(accountId, { holdings: true, summary: true });
      },
      error: (err) => console.error(err),
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

        // ✅ ✅ 你指定的：更新市價後，等 holdings + summary 都更新再渲染
        this.refreshAccountData(accountId, { holdings: true, summary: true });
      },
      error: (err) => console.error(err),
    });
  }

  deleteHolding(h: HoldingDto) {
    const accountId = this.accountIdSignal();
    if (!accountId) return;

    this.confirmService.confirm({
      message: `此持有標的仍有交易紀錄，請先刪除交易後，才能刪除。\n\n確定要刪除「${h.symbol}」嗎？`,
      header: '刪除持有標的',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: '刪除',
      rejectLabel: '取消',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.holdingService.deleteHolding(h.id).subscribe({
          next: () => {
            this.toast.success('已刪除持有標的');

            // ✅ ✅ 小保護：等 holdings + summary 都更新過再穩定渲染
            this.refreshAccountData(accountId, { holdings: true, summary: true });
          },
          error: (err) => {
            const msg = err?.error?.message ?? '此持有標的仍有交易紀錄，請先刪除交易後再嘗試。';
            this.toast.error(msg);
            console.error(err);
          },
        });
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
      amount: 0,
      fee: 0,
      tax: 0, // ✅
      note: '',
    });

    this.applyTxValidators(
      this.createTransactionForm,
      this.createTransactionForm.getRawValue().type
    );
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
    const type = raw.type as TxType;

    const dto: CreateTransactionDto = {
      accountId,
      holdingId: raw.holdingId,
      tradeDate: this.localDateStringToIso(raw.tradeDate),
      type,
      quantity: this.isBuySell(type) ? raw.quantity : 0,
      price: this.isBuySell(type) ? raw.price : 0,
      amount: this.isBuySell(type) ? null : raw.amount,
      fee: raw.fee,
      tax: raw.tax, // ✅
      note: raw.note || null,
    };

    this.transactionService.createTransaction(dto).subscribe({
      next: () => {
        this.toast.success('已新增交易');
        this.displayTransactionDialog = false;

        // ✅ ✅ 你指定的：新增交易後，等 holdings + txs + summary 都更新再渲染
        this.refreshAccountData(accountId, { holdings: true, txs: true, summary: true });
      },
      error: (err) => console.error(err),
    });
  }

  private toYyyyMmDd(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private localDateStringToIso(dateStr: string): string {
    // dateStr: 'YYYY-MM-DD' → 當地 00:00 → ISO（固定到 UTC，不會跑一天）
    // const [y, m, d] = dateStr.split('-').map(Number);
    // const dt = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
    // return dt.toISOString();
    // ⭐ 交易日是「純日期」，不要轉 Date，不要轉 UTC
    // ⭐ 直接傳給後端 yyyy-MM-dd
    return dateStr;
  }

  openTransactionEdit(t: TransactionVm) {
    this.selectedTx.set(t);

    const yyyyMmDd = this.toYyyyMmDd(t.tradeDate); // ✅ 用統一 helper

    this.editTransactionForm.reset({
      holdingId: t.holdingId,
      tradeDate: yyyyMmDd,
      type: t.type as TxType,
      symbol: t.symbol,
      currency: t.currency,
      quantity: t.quantity ?? 0,
      price: t.price ?? 0,
      amount: t.amount ?? 0,
      fee: t.fee,
      tax: t.tax,
      note: t.note ?? '',
    });

    this.applyTxValidators(this.editTransactionForm, this.editTransactionForm.getRawValue().type);
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
    const type = raw.type as TxType;

    const dto: UpdateTransactionDto = {
      accountId,
      holdingId: raw.holdingId,
      tradeDate: this.localDateStringToIso(raw.tradeDate),
      type,
      quantity: this.isBuySell(type) ? raw.quantity : 0,
      price: this.isBuySell(type) ? raw.price : 0,
      amount: this.isBuySell(type) ? null : raw.amount,
      fee: raw.fee,
      tax: raw.tax, // ✅
      note: raw.note || null,
    };

    this.transactionService.updateTransaction(tx.id, dto).subscribe({
      next: () => {
        this.toast.success('已更新交易');
        this.displayEditTransactionDialog = false;

        // ✅ ✅ 更新交易後，同樣等 holdings + txs + summary 都更新再渲染
        this.refreshAccountData(accountId, { holdings: true, txs: true, summary: true });
      },
      error: (err) => console.error(err),
    });
  }

  deleteTransaction(t: TransactionVm) {
    const accountId = this.accountIdSignal();
    if (!accountId) return;

    const typeLabel = this.getFriendlyTypeLabel(t.type);
    const realizedHint = t.type === 'DIVIDEND' || t.type === 'INTEREST' ? '（已實現）' : '';

    this.confirmService.confirm({
      header: '刪除交易確認',
      icon: 'pi pi-exclamation-triangle',
      message: `確定要刪除這筆交易嗎？\n\n標的：${t.symbol}\n類型：${typeLabel} ${realizedHint}`,
      acceptLabel: '刪除',
      rejectLabel: '取消',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.transactionService.deleteTransaction(t.id).subscribe({
          next: () => {
            this.toast.success('已刪除交易');

            // ✅ ✅ 刪除交易後，同樣等 holdings + txs + summary 都更新再渲染
            this.refreshAccountData(accountId, { holdings: true, txs: true, summary: true });
          },
          error: (err) => {
            const msg = err?.error?.message ?? '刪除失敗，請稍後再試。';
            this.toast.error(msg);
            console.error(err);
          },
        });
      },
    });
  }

  // ===== validation helpers =====
  hasTxError(controlName: keyof typeof this.createTransactionForm.controls, error: string) {
    const ctrl = this.createTransactionForm.get(controlName);
    return ctrl?.touched && ctrl.hasError(error);
  }

  // ✅ 新增：讓 HTML 可以檢查 create/edit 特定欄位錯誤（不動你原本 hasTxError）
  hasCreateTxError(controlName: keyof typeof this.createTransactionForm.controls, error: string) {
    const ctrl = this.createTransactionForm.get(controlName);
    return ctrl?.touched && ctrl.hasError(error);
  }

  hasEditTxError(controlName: keyof typeof this.editTransactionForm.controls, error: string) {
    const ctrl = this.editTransactionForm.get(controlName);
    return ctrl?.touched && ctrl.hasError(error);
  }

  // ===== ARR chart =====

  // ✅ 修法 #1：先把原始 ARR 計算抽成「純 computed」，讓 chartData / meta 都共用同一份結果
  private arrResults = computed(() => {
    const holdings = this.holdings();
    const txs = this.transactions(); // ✅ 這裡會是 TransactionVm[]
    if (!holdings.length || !txs.length) return [];

    const arrResults = calcArrPerHolding(
      holdings.map((h) => ({
        symbol: h.symbol,
        currency: h.currency,
        marketValue: h.marketValue,
      })),
      txs // ✅ 直接丟（tradeDate: Date）
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

    const backgroundColor = usable.map((r) => (r.arr < 0 ? '#e0c2d6' : '#e1edd2'));
    const hoverBackgroundColor = usable.map((r) => (r.arr < 0 ? '#e0c2d6' : '#e1edd2'));

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
