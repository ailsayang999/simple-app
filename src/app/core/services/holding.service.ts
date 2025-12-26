import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { HoldingDto, CreateHoldingDto, UpdateHoldingDto } from '../models/holding.model';

@Injectable({ providedIn: 'root' })
export class HoldingService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/holdings`;

  holdings = signal<HoldingDto[]>([]);
  // ✅ NEW：用來判斷「loadHoldings 這次有沒有完成」
  holdingsLoadedAt = signal<number>(0);

  loadHoldings(accountId: string) {
    this.http.get<HoldingDto[]>(`${this.baseUrl}?accountId=${accountId}`).subscribe({
      next: (res) => {
        this.holdings.set(res);
        // ✅ NEW：每次成功回來都更新（就算 res 一模一樣也會變）
        this.holdingsLoadedAt.set(Date.now());
      },
      error: (err) => console.error('loadHoldings error', err),
    });
  }

  createHolding(accountId: string, dto: CreateHoldingDto) {
    return this.http.post<HoldingDto>(`${this.baseUrl}?accountId=${accountId}`, dto);
  }

  updateHolding(id: string, dto: UpdateHoldingDto) {
    return this.http.put<HoldingDto>(`${this.baseUrl}/${id}`, dto);
  }

  updateMarketPrice(id: string, marketPrice: number) {
    return this.http.put<HoldingDto>(`${this.baseUrl}/${id}/market-price`, { marketPrice });
  }

  deleteHolding(id: string) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
