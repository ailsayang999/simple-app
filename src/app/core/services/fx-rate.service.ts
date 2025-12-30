import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FxRateDto } from '../models/fx-rate.model';

@Injectable({ providedIn: 'root' })
export class FxRateService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/fx`;

  getLatest() {
    return this.http.get<FxRateDto[]>(`${this.baseUrl}/latest`);
  }

  getHistory(quote: string, take = 30) {
    return this.http.get<Array<{ quoteCurrency: string; rate: number; capturedAt: string }>>(
      `${this.baseUrl}/history`,
      { params: { quote, take } as any }
    );
  }
}
