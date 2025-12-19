import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ViewChild } from '@angular/core';
import { Table } from 'primeng/table';

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

import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { calcArrPerHolding } from '../../core/utils/arr.util';

import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { AccountSummaryDto } from '../../core/models/account-summary.model';

// 定義 PrimeNG 標籤可接受的 severity 類型
type SeverityType = 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast';

// ✅ 交易類型（前端用）
type TxType = 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW' | 'DIVIDEND' | 'INTEREST';

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

  private accountIdSignal = signal<string | null>(null);

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

  constructor() {
    // ✅ ✅ 監聽：當 refreshNeed 存在時，等所需資料都「變更」才解除刷新狀態
    effect(() => {
      const need = this.refreshNeed();
      if (!need) return;

      const holdingsNow = this.holdings();
      const summaryNow = this.accountSummary();
      const txsNow = this.transactions();

      const holdingsSigNow = this.makeHoldingsSignature(holdingsNow);
      const summarySigNow = this.makeSummarySignature(summaryNow);
      const txsSigNow = this.makeTxsSignature(txsNow);

      const holdingsOk =
        !need.holdings || (holdingsSigNow && holdingsSigNow !== this.baselineHoldingsSig());
      const summaryOk =
        !need.summary || (summarySigNow && summarySigNow !== this.baselineSummarySig());
      const txsOk = !need.txs || (txsSigNow && txsSigNow !== this.baselineTxsSig());

      if (holdingsOk && summaryOk && txsOk) {
        this.isRefreshing.set(false);
        this.refreshNeed.set(null);
      }
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

  private makeTxsSignature(list: TransactionDto[] | null | undefined): string {
    if (!list?.length) return '';
    // 交易列表只需要判斷是否更新過：取 id + totalAmount（即可）
    return list.map((t) => `${t.id}|${t.totalAmount ?? 0}`).join('~');
  }

  // ✅ ✅ 啟動 refresh guard（記錄 baseline，然後觸發 load）
  private beginRefreshGuard(opt: { holdings?: boolean; summary?: boolean; txs?: boolean }) {
    const need = {
      holdings: !!opt.holdings,
      summary: !!opt.summary,
      txs: !!opt.txs,
    };

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
    this.beginRefreshGuard(opt);

    if (opt.holdings) this.holdingService.loadHoldings(accountId);
    if (opt.txs) this.transactionService.loadTransactionsByAccount(accountId);
    if (opt.summary) this.loadAccountSummary(accountId);
  }

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
      const currency = h?.currency ?? raw.currency ?? 'TWD';

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
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.accountIdSignal.set(id);

    if (this.accountService.accounts().length === 0) {
      this.accountService.loadAccounts();
    }

    this.holdingService.loadHoldings(id);
    this.transactionService.loadTransactionsByAccount(id);

    // ✅ 初始化：載入 Summary（後端算好最乾淨）
    this.loadAccountSummary(id);

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
      next: (res) => this.accountSummary.set(res),
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
      tradeDate: new Date(raw.tradeDate).toISOString(),
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

  openTransactionEdit(t: TransactionDto) {
    this.selectedTx.set(t);
    const yyyyMmDd = new Date(t.tradeDate).toISOString().slice(0, 10);

    this.editTransactionForm.reset({
      holdingId: t.holdingId,
      tradeDate: yyyyMmDd,
      type: t.type as TxType,
      symbol: t.symbol,
      currency: t.currency,
      quantity: t.quantity ?? 0,
      price: t.price ?? 0,
      amount: (t as any).amount ?? 0,
      fee: t.fee,
      tax: (t as any).tax ?? 0, // ✅
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
      tradeDate: new Date(raw.tradeDate).toISOString(),
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

  deleteTransaction(t: TransactionDto) {
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
