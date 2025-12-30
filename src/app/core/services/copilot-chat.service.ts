// src/app/core/services/copilot-chat.service.ts
import { Injectable } from '@angular/core';
import { ChatStoreService } from './chat-store.service';
import { SignalrService } from './signalr.service';
import { AuthService } from './auth.service';
import { CopilotContextService } from './copilot-context.service';
import { ChatCommandParserService } from './chat-command-parser.service';
import { CopilotApiService } from './copilot-api.service';

@Injectable({ providedIn: 'root' })
export class CopilotChatService {
  private initialized = false;

  // ✅ 用 unsubscribe 集中管理（避免 layout 重建時重複註冊）
  private unsubscribers: Array<() => void> = [];

  // ✅ Debounce buffers（避免 SignalR 洗版）
  private accountUpdatedBuffer = new Set<string>();
  private accountUpdatedTimer: any = null;

  private fxUpdatedLastPayload: any[] | null = null;
  private fxUpdatedTimer: any = null;

  constructor(
    private chatStore: ChatStoreService,
    private signalr: SignalrService,
    private auth: AuthService,
    private ctx: CopilotContextService,
    private parser: ChatCommandParserService,
    private api: CopilotApiService
  ) {}

  /**
   * ✅ 全站初始化（只做一次）
   * - ensureConnected（帶 token）
   * - joinDashboard（全站共用聊天室）
   * - 註冊 SignalR 事件 → ChatMessage
   */
  async initGlobal(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // ✅ 確保 SignalR 已連線（token 由 AuthService 提供）
    await this.signalr.ensureConnected(() => this.auth.getAccessToken());

    // ✅ 全站共用 → join dashboard group
    await this.signalr.joinDashboard();

    // ✅ 把 SignalR event 轉成聊天訊息（Phase 1 + Phase 2：debounce）
    // accountUpdated（debounce 合併成「人類可讀」摘要）
    const offAccountUpdated = this.signalr.onAccountUpdated((accountId) => {
      this.bufferAccountUpdated(accountId);
    });
    this.unsubscribers.push(offAccountUpdated);

    // fxUpdated（debounce：只吐最後一筆）
    const offFxUpdated = this.signalr.onFxUpdated((rates) => {
      this.bufferFxUpdated(rates);
    });
    this.unsubscribers.push(offFxUpdated);

    // ✅ 你後面加 priceUpdated / jobCompleted
    // 做法一樣：SignalRService 新增 onXxxUpdated → 這裡做 debounce → addSystemMessage
  }

  /**
   * ✅ Chat 入口：由 UI 呼叫（Phase 2：指令 / AI / fallback）
   */
  async handleUserInput(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;

    // ✅ 先把 user message 放進聊天室
    this.chatStore.addUserMessage(trimmed);

    // ✅ 指令：/buy /sell /use /summary /help
    if (trimmed.startsWith('/')) {
      await this.handleCommand(trimmed);
      return;
    }

    // ✅ 非指令：視為 AI 問題（Phase 2 最小可用版）
    await this.handleAiQuestion(trimmed);
  }

  private async handleCommand(raw: string): Promise<void> {
    const cmd = this.parser.parse(raw);

    if (cmd.type === 'help') {
      this.chatStore.addAssistantMessage(
        [
          '可用指令：',
          '• /use account <accountId>  → 設定目前操作帳戶',
          '• ex. /use account 9f25c3c8-7c72-4a6b-9355-ae6f9d9cc607',
          '• /buy <symbol> <qty> <price> [yyyy-mm-dd] [fee=] [tax=] [note="..."]',
          '• ex. /buy 0050 1 64.4 2025-12-30 fee=1 tax=0 note="first buy"',
          '• /sell <symbol> <qty> <price> [yyyy-mm-dd] [fee=] [tax=] [note="..."]',
          '• ex. /sell TSM 100 56 2025-12-30 fee=20 tax=30 note="take profit"',
          '• /summary  → 讀取目前帳戶的 AccountSummary',
          '• 我現在總獲利多少？  → 讀取目前帳戶的總獲利',
          '• /help',
        ].join('\n')
      );
      return;
    }

    if (cmd.type === 'useAccount') {
      const accountId = cmd.args.accountId.trim();
      this.ctx.setActiveAccount(accountId || null);
      this.chatStore.addAssistantMessage(`✅ Copilot 已切換帳戶：${accountId}`);
      return;
    }

    if (cmd.type === 'summary') {
      const accountId = this.ctx.activeAccountId();
      if (!accountId) {
        this.chatStore.addAssistantMessage('⚠️ 你還沒指定帳戶。請先用：/use account <accountId>');
        return;
      }

      try {
        const dto = await this.api.getAccountSummary(accountId).toPromise();
        if (!dto) {
          this.chatStore.addAssistantMessage('⚠️ 取得帳戶摘要失敗（回傳為空）');
          return;
        }

        // ✅ human-readable summary（像產品）
        const money = (v: number) => {
          const ccy = dto.baseCurrency ?? 'TWD';
          // ✅ 這裡先用數字格式；你之後也可以用 Intl + currency style
          const s = new Intl.NumberFormat('zh-TW', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(v);
          return `${s} ${ccy}`;
        };

        const sign = (v: number) =>
          v > 0 ? `+${money(v)}` : v < 0 ? `-${money(Math.abs(v))}` : money(0);

        this.chatStore.addAssistantMessage(
          [
            `📊 Account Summary（${dto.baseCurrency}）`,
            `• 市值：${money(Number(dto.totalMarketValue))}`,
            `• 投入：${money(Number(dto.totalInvested))}`,
            `• 淨投入：${money(Number(dto.netInvested))}`,
            `• 已實現：${sign(Number(dto.realizedProfit))}`,
            `• 未實現：${sign(Number(dto.unrealizedProfit))}`,
            `• 總獲利：${sign(Number(dto.totalProfit))}`,
            `• 已實現報酬率：${Number(dto.realizedReturnRate).toFixed(2)}%`,
          ].join('\n'),
          { eventType: 'unknown', payload: dto }
        );
      } catch (e) {
        this.chatStore.addAssistantMessage(
          '⚠️ 取得帳戶摘要失敗（請確認 API /api/accounts/{id}/summary 是否存在）'
        );
      }
      return;
    }

    if (cmd.type === 'buy' || cmd.type === 'sell') {
      const accountId = this.ctx.activeAccountId();
      if (!accountId) {
        this.chatStore.addAssistantMessage('⚠️ 你還沒指定帳戶。請先用：/use account <accountId>');
        return;
      }

      const { symbol, quantity, price, tradeDate, fee, tax, note } = cmd.args;

      if (!symbol || !quantity || !price || Number.isNaN(quantity) || Number.isNaN(price)) {
        this.chatStore.addAssistantMessage('⚠️ 指令參數不完整。輸入 /help 查看格式');
        return;
      }

      try {
        const res = await this.api
          .trade({
            accountId,
            type: cmd.type === 'buy' ? 'BUY' : 'SELL',
            symbol: String(symbol).toUpperCase(),
            quantity: Number(quantity),
            price: Number(price),
            tradeDate: tradeDate ?? null,
            fee: Number(fee ?? 0),
            tax: Number(tax ?? 0),
            note: note ?? null,
          })
          .toPromise();

        this.chatStore.addAssistantMessage(
          `🧾 已建立交易：${cmd.type === 'buy' ? 'BUY' : 'SELL'} ${String(
            symbol
          ).toUpperCase()} x${quantity} @ ${price}`
        );

        // ✅ 交易成功後通常後端會推 accountUpdated → chat 會再收到一則 debounce 後的 system message
        // 如果你想要更即時，也可以直接在這裡提示「已觸發帳戶刷新」
      } catch (e) {
        this.chatStore.addAssistantMessage(
          '❌ 建立交易失敗：請確認後端是否有 POST /copilot/trade（並且後端能用 symbol 找/建 holding）'
        );
      }
      return;
    }

    // unknown
    this.chatStore.addAssistantMessage('⚠️ 不認識的指令，輸入 /help 查看可用指令');
  }

  private async handleAiQuestion(question: string): Promise<void> {
    const accountId = this.ctx.activeAccountId();

    try {
      // ✅ Phase 2：先走後端 /copilot/ask（你可以先做 rule-based，Phase 3 再換 LLM）
      const answer = await this.api.ask(question, accountId).toPromise();
      this.chatStore.addAssistantMessage(answer ?? '（沒有回覆）');
    } catch (e) {
      // ✅ fallback：如果你還沒做 /copilot/ask，就先回一個引導訊息
      this.chatStore.addAssistantMessage(
        '（AI 尚未接上）你可以先用 /summary 看帳戶摘要，或先實作後端 POST /copilot/ask'
      );
    }
  }

  // ========================
  // ✅ SignalR debounce helpers
  // ========================

  private bufferAccountUpdated(accountId: string): void {
    if (accountId) this.accountUpdatedBuffer.add(accountId);

    // ✅ 1.2s 內多次更新合併成一則
    if (this.accountUpdatedTimer) clearTimeout(this.accountUpdatedTimer);
    this.accountUpdatedTimer = setTimeout(() => {
      const ids = Array.from(this.accountUpdatedBuffer);
      this.accountUpdatedBuffer.clear();
      this.accountUpdatedTimer = null;

      if (ids.length === 1) {
        this.chatStore.addSystemMessage(`✅ 帳戶已更新：${ids[0]}`, {
          eventType: 'accountUpdated',
          accountId: ids[0],
        });
      } else if (ids.length > 1) {
        this.chatStore.addSystemMessage(`✅ 帳戶已更新：${ids.length} 個`, {
          eventType: 'accountUpdated',
          payload: ids,
        });
      }
    }, 1200);
  }

  private bufferFxUpdated(rates: any[]): void {
    this.fxUpdatedLastPayload = rates;

    // ✅ 2s debounce：只吐最後一筆，避免匯率多次刷新洗版
    if (this.fxUpdatedTimer) clearTimeout(this.fxUpdatedTimer);
    this.fxUpdatedTimer = setTimeout(() => {
      const payload = this.fxUpdatedLastPayload;
      this.fxUpdatedLastPayload = null;
      this.fxUpdatedTimer = null;

      const count = Array.isArray(payload) ? payload.length : 0;
      this.chatStore.addSystemMessage(`💱 匯率已更新（${count} 筆）`, {
        eventType: 'fxUpdated',
        payload,
      });
    }, 2000);
  }

  /**
   * ✅ 若你有 logout / 切換帳號：可以清 chat
   * 目前先保留，Phase 2 我們會接 DB persist
   */
  reset(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers = [];
    this.initialized = false;

    // ✅ 清掉 debounce timer
    if (this.accountUpdatedTimer) clearTimeout(this.accountUpdatedTimer);
    if (this.fxUpdatedTimer) clearTimeout(this.fxUpdatedTimer);
    this.accountUpdatedTimer = null;
    this.fxUpdatedTimer = null;
    this.accountUpdatedBuffer.clear();
    this.fxUpdatedLastPayload = null;

    this.chatStore.clear();
    this.ctx.setActiveAccount(null);
  }
}
