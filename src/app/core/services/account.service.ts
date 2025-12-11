import { inject } from '@angular/core';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { AccountDto } from '../../core/models/account.model';
import { CreateAccountDto } from '../../core/models/create-account.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  accounts = signal<AccountDto[]>([]);

  loadAccounts() {
    this.http.get<AccountDto[]>(`${this.baseUrl}/accounts`).subscribe((res) => {
      this.accounts.set(res);
    });
  }

  createAccount(dto: CreateAccountDto) {
    return this.http.post<AccountDto>(`${this.baseUrl}/accounts`, dto);
  }
}
