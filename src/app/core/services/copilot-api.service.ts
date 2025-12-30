// src/app/core/services/copilot-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs';

// ✅ 你的前端 model 路徑請對應你實際放的位置
// 你之前有 AccountSummaryDto.cs，前端通常會有對應的 account-summary.model.ts
import { AccountSummaryDto } from '../models/account-summary.model';

export interface CopilotTradeCommand {
  accountId: string;
  type: 'BUY' | 'SELL';
  symbol: string;
  tradeDate?: string | null; // yyyy-mm-dd
  quantity: number;
  price: number;
  fee?: number;
  tax?: number;
  note?: string | null;
}

export interface CopilotTradeResult {
  transactionId: string;
  accountId: string;
  holdingId: string;
}

@Injectable({ providedIn: 'root' })
export class CopilotApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ✅ /buy /sell：後端 command endpoint（最佳實務：後端自己找/建 holding）
  trade(cmd: CopilotTradeCommand) {
    // ⭐ 注意：我們走 /api/coplay 這條線（下面 B 會給你後端 Controller）
    return this.http.post<CopilotTradeResult>(`${this.baseUrl}/copilot/trade`, cmd);
  }

  // ✅ 讀取你現有的 /api/accounts/{id}/summary
  getAccountSummary(accountId: string) {
    return this.http.get<AccountSummaryDto>(`${this.baseUrl}/accounts/${accountId}/summary`);
  }

  // ✅ AI 入口（Phase 2：後端 rule-based + 讀 summary；Phase 3 再換 LLM）
  ask(question: string, accountId?: string | null) {
    return this.http
      .post<{ answer: string }>(`${this.baseUrl}/copilot/ask`, {
        question,
        accountId: accountId ?? null,
      })
      .pipe(map((x) => x.answer));
  }
}
