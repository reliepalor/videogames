import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DigitalProductSales } from 'src/app/core/models/analytics/digital-product-sales';
import { DashboardSummary } from 'src/app/core/models/analytics/dashboard-summary';
import { MonthlyRevenue } from 'src/app/core/models/analytics/monthly-revenue';
import { TopProduct } from 'src/app/core/models/analytics/top-product';

export interface BestSeller {
  videoGameId: number;
  title: string;
  totalQuantity: number;
  totalRevenue: number;
  imagePath?: string;
  price?: number;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  // ── Existing endpoints ──────────────────────────────────────────────

  /** Video game best sellers (public) */
  getBestSellers(): Observable<BestSeller[]> {
    return this.http.get<BestSeller[]>(`${this.base}/reports/best-sellers`);
  }

  // ── New endpoints ───────────────────────────────────────────────────

  /** Digital product best sellers (public) */
  getDigitalBestSellers(): Observable<DigitalProductSales[]> {
    return this.http.get<DigitalProductSales[]>(`${this.base}/reports/digital-best-sellers`);
  }

  /** Dashboard summary with optional date range (public) */
  getDashboardSummary(startDate?: Date, endDate?: Date): Observable<DashboardSummary> {
    let url = `${this.base}/reports/dashboard-summary`;
    const params: string[] = [];
    if (startDate) params.push(`startDate=${startDate.toISOString()}`);
    if (endDate) params.push(`endDate=${endDate.toISOString()}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.http.get<DashboardSummary>(url);
  }

  /** Monthly revenue breakdown for both categories (public) */
  getMonthlyRevenue(): Observable<MonthlyRevenue[]> {
    return this.http.get<MonthlyRevenue[]>(`${this.base}/reports/monthly-revenue`);
  }

  /** Top 5 products across all categories (public) */
  getTopProducts(): Observable<TopProduct[]> {
    return this.http.get<TopProduct[]>(`${this.base}/reports/top-products`);
  }

  // ── Admin endpoints ─────────────────────────────────────────────────

  /** Admin: detailed video game sales report */
  getVideoGameSales(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/admin/reports/videogame-sales`);
  }

  /** Admin: detailed digital product sales report */
  getDigitalProductSales(): Observable<DigitalProductSales[]> {
    return this.http.get<DigitalProductSales[]>(`${this.base}/admin/reports/digital-product-sales`);
  }
}