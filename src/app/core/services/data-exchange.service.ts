import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ExportFormat = 'csv' | 'xlsx';
export type ImportTarget = 'holdings' | 'transactions';

export interface ImportResultDto {
  ok: boolean;
  inserted?: number;
  updated?: number;
  skipped?: number;
  failed?: number;
  // 後端若有回錯誤明細，可放這裡
  errors?: Array<{ row?: number; message: string }>;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class DataExchangeService {
  private http = inject(HttpClient);

  // ✅ 依你的環境調整（你如果已有 ApiBaseUrlService/ environment.ts，就改成用它）
  private baseUrl = `${environment.apiUrl}/accounts`;

  // =========================
  // ✅ Export
  // =========================
  exportHoldings(accountId: string, format: ExportFormat): Observable<Blob> {
    const params = new HttpParams().set('format', format);
    return this.http.get(`${this.baseUrl}/${accountId}/export/holdings`, {
      params,
      responseType: 'blob',
    });
  }

  exportTransactions(accountId: string, format: ExportFormat): Observable<Blob> {
    const params = new HttpParams().set('format', format);
    return this.http.get(`${this.baseUrl}/${accountId}/export/transactions`, {
      params,
      responseType: 'blob',
    });
  }

  // =========================
  // ✅ Import (multipart/form-data)
  // =========================
  importHoldings(accountId: string, file: File): Observable<ImportResultDto> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<ImportResultDto>(`${this.baseUrl}/${accountId}/import/holdings`, fd);
  }

  importTransactions(accountId: string, file: File): Observable<ImportResultDto> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<ImportResultDto>(`${this.baseUrl}/${accountId}/import/transactions`, fd);
  }
}
