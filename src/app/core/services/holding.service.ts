import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { HoldingDto, CreateHoldingDto, UpdateHoldingDto } from '../models/holding.model';

@Injectable({ providedIn: 'root' })
export class HoldingService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/holdings`;

  holdings = signal<HoldingDto[]>([]);

  loadHoldings(accountId: string) {
    this.http.get<HoldingDto[]>(`${this.baseUrl}?accountId=${accountId}`).subscribe({
      next: (res) => this.holdings.set(res),
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
