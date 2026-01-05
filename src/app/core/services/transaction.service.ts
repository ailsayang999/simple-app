import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  TransactionDto,
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionVm,
} from '../models/transaction.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/transactions`;

  transactions = signal<TransactionVm[]>([]);
  txsLoadedAt = signal<number>(0);

  loadTransactionsByAccount(accountId: string) {
    this.http.get<TransactionDto[]>(`${this.baseUrl}?accountId=${accountId}`).subscribe({
      next: (res) => {
        const vms: TransactionVm[] = res
          .map((t) => ({
            ...t,
            tradeDate: new Date(t.tradeDate), // ✅ PrimeNG date filter 必須 Date
          }))
          .filter((t) => Number.isFinite(t.tradeDate.getTime())); // ✅ 防呆：無效日期丟掉

        this.transactions.set(vms);
        this.txsLoadedAt.set(Date.now());
      },
      error: (err) => console.error('loadTransactions error', err),
    });
  }

  createTransaction(dto: CreateTransactionDto) {
    return this.http.post<TransactionDto>(this.baseUrl, dto);
  }

  updateTransaction(id: string, dto: UpdateTransactionDto) {
    return this.http.put<TransactionDto>(`${this.baseUrl}/${id}`, dto);
  }

  deleteTransaction(id: string) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

