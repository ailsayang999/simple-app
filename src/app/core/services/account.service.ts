// src/app/core/services/account.service.ts
import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import { AccountDto } from '../../core/models/account.model';
import { CreateAccountDto } from '../../core/models/create-account.model';
import { AccountSummaryDto } from '../../core/models/account-summary.model';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  accounts = signal<AccountDto[]>([]);

  // ✅ 可選：如果你想把 summary 也做成 store（更像產品）
  summaries = signal<Record<string, AccountSummaryDto>>({});

  loadAccounts() {
    this.http.get<AccountDto[]>(`${this.baseUrl}/accounts`).subscribe((res) => {
      this.accounts.set(res);
    });
  }

  createAccount(dto: CreateAccountDto) {
    return this.http.post<AccountDto>(`${this.baseUrl}/accounts`, dto);
  }

  // ✅ 強型別，不要 any
  getAccountSummary(accountId: string) {
    return this.http.get<AccountSummaryDto>(`${this.baseUrl}/accounts/${accountId}/summary`);
  }

  // ✅ 可選：直接載入並寫入 store（你 page 想用也可以）
  loadAccountSummary(accountId: string) {
    this.getAccountSummary(accountId).subscribe((summary) => {
      this.summaries.update((prev) => ({ ...prev, [accountId]: summary }));
    });
  }
}
