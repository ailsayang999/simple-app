// src/app/core/services/holding.service.ts
import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HoldingDto, CreateHoldingDto, UpdateHoldingDto } from '../models/holding.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HoldingService {
  private http = inject(HttpClient);

  // 跟帳戶路由相關的 API
  private accountsBaseUrl = `${environment.apiUrl}/accounts`;
  // 單一 holding 相關（更新 / 刪除）
  private holdingsBaseUrl = `${environment.apiUrl}/holdings`;

  // 目前帳戶的 holdings
  holdings = signal<HoldingDto[]>([]);

  loadHoldings(accountId: string) {
    this.http
      .get<HoldingDto[]>(`${this.accountsBaseUrl}/${accountId}/holdings`)
      .subscribe((res) => this.holdings.set(res));
  }

  createHolding(accountId: string, dto: CreateHoldingDto) {
    return this.http.post<HoldingDto>(`${this.accountsBaseUrl}/${accountId}/holdings`, dto);
  }

  updateHolding(holdingId: string, dto: UpdateHoldingDto) {
    return this.http.put<HoldingDto>(`${this.holdingsBaseUrl}/${holdingId}`, dto);
  }

  deleteHolding(holdingId: string) {
    return this.http.delete<void>(`${this.holdingsBaseUrl}/${holdingId}`);
  }
}
