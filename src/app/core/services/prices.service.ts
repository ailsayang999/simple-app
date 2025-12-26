import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PriceRefreshReason } from '../../core/models/price-refresh-reason';

export type RefreshPricesResponse = {
  accountId: string;
  didUpdate: boolean;

  // ✅ 新增（對齊後端）
  reason: PriceRefreshReason;

  // ✅ Optional（後端可能回 null）
  updatedHoldingsCount?: number | null;
  message?: string | null;
  serverTime?: string;
};

@Injectable({ providedIn: 'root' })
export class PricesService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/prices`;

  /**
   * ✅ On-demand refresh
   * - force=false：後端 stale 判斷（你要的最低成本）
   * - force=true：按鈕手動強制刷新（產品感）
   */
  refreshAccountPrices(accountId: string, force = false) {
    return this.http.post<RefreshPricesResponse>(
      `${this.baseUrl}/refresh?accountId=${accountId}&force=${force}`,
      {}
    );
  }
}
