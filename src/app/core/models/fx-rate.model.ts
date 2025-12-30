export interface FxRateDto {
  baseCurrency: string; // "TWD"
  quoteCurrency: string; // "USD"
  rate: number;
  capturedAt: string; // ISO
}
