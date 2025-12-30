// src/app/core/services/copilot-context.service.ts
import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CopilotContextService {
  // ✅ 全站 Copilot context：目前選定的 account（global chat 常用）
  readonly activeAccountId = signal<string | null>(null);

  // ✅ 顯示用（你之後也可以加 activeHoldingId / currency…）
  readonly hasActiveAccount = computed(() => !!this.activeAccountId());

  setActiveAccount(accountId: string | null): void {
    this.activeAccountId.set(accountId);
  }
}
