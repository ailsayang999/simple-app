// src/app/core/services/transaction.service.ts
import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TransactionDto, CreateTransactionDto } from '../models/transaction.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/transactions`;

  transactions = signal<TransactionDto[]>([]);

  loadTransactionsByAccount(accountId: string) {
    const params = new HttpParams().set('accountId', accountId);

    this.http
      .get<TransactionDto[]>(this.baseUrl, { params })
      .subscribe((res) => this.transactions.set(res));
  }

  createTransaction(dto: CreateTransactionDto) {
    return this.http.post<TransactionDto>(this.baseUrl, dto);
  }
}
