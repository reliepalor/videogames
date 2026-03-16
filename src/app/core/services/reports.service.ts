import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DigitalProductSales } from 'src/app/core/models/analytics/digital-product-sales';
import { DashboardSummary } from 'src/app/core/models/analytics/dashboard-summary';
import { MonthlyRevenue } from 'src/app/core/models/analytics/monthly-revenue';
import { TopProduct } from 'src/app/core/models/analytics/top-product';
import { VideoGameSales } from 'src/app/shared/models/videogame-sales';

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
  private readonly useMockData = environment.useMockData;

  private readonly mockGameOrdersKey = 'demo_orders';
  private readonly mockDigitalOrdersKey = 'mock_digital_orders';

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
    if (this.useMockData) {
      const gameOrders = this.readMockGameOrders(startDate, endDate);
      const digitalOrders = this.readMockDigitalOrders(startDate, endDate);

      const totalVideoGameRevenue = gameOrders.reduce((sum, order) => sum + order.totalPrice, 0);
      const totalDigitalRevenue = digitalOrders.reduce((sum, order) => sum + order.totalPrice, 0);

      const summary: DashboardSummary = {
        totalVideoGameRevenue,
        totalDigitalRevenue,
        totalRevenue: totalVideoGameRevenue + totalDigitalRevenue,
        totalVideoGameOrders: gameOrders.length,
        totalDigitalOrders: digitalOrders.length,
        totalUsers: this.countDistinctMockUsers(gameOrders, digitalOrders),
      };

      return of(summary);
    }

    let url = `${this.base}/reports/dashboard-summary`;
    const params: string[] = [];
    if (startDate) params.push(`startDate=${startDate.toISOString()}`);
    if (endDate) params.push(`endDate=${endDate.toISOString()}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.http.get<DashboardSummary>(url);
  }

  /** Monthly revenue breakdown for both categories (public) */
  getMonthlyRevenue(): Observable<MonthlyRevenue[]> {
    if (this.useMockData) {
      const gameOrders = this.readMockGameOrders();
      const digitalOrders = this.readMockDigitalOrders();
      const monthMap = new Map<string, MonthlyRevenue>();

      for (const order of gameOrders) {
        const date = this.parseDate(order.createdAt);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        const existing = monthMap.get(key) ?? {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          videoGameRevenue: 0,
          digitalRevenue: 0,
          totalRevenue: 0,
        };

        existing.videoGameRevenue += order.totalPrice;
        existing.totalRevenue += order.totalPrice;
        monthMap.set(key, existing);
      }

      for (const order of digitalOrders) {
        const date = this.parseDate(order.createdAt);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        const existing = monthMap.get(key) ?? {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          videoGameRevenue: 0,
          digitalRevenue: 0,
          totalRevenue: 0,
        };

        existing.digitalRevenue += order.totalPrice;
        existing.totalRevenue += order.totalPrice;
        monthMap.set(key, existing);
      }

      const rows = Array.from(monthMap.values()).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      return of(rows);
    }

    return this.http.get<MonthlyRevenue[]>(`${this.base}/reports/monthly-revenue`);
  }

  /** Top 5 products across all categories (public) */
  getTopProducts(): Observable<TopProduct[]> {
    if (this.useMockData) {
      const videoSales = this.computeVideoGameSales();
      const digitalSales = this.computeDigitalProductSales();

      const combined: TopProduct[] = [
        ...videoSales.map((item) => ({
          productName: item.title,
          productType: 'VideoGame',
          totalQuantity: item.totalQuantity,
          totalRevenue: item.totalRevenue,
        })),
        ...digitalSales.map((item) => ({
          productName: item.name,
          productType: 'DigitalProduct',
          totalQuantity: item.totalQuantity,
          totalRevenue: item.totalRevenue,
        })),
      ];

      combined.sort((a, b) => b.totalRevenue - a.totalRevenue);
      return of(combined.slice(0, 5));
    }

    return this.http.get<TopProduct[]>(`${this.base}/reports/top-products`);
  }

  // ── Admin endpoints ─────────────────────────────────────────────────

  /** Admin: detailed video game sales report */
  getVideoGameSales(): Observable<any[]> {
    if (this.useMockData) {
      return of(this.computeVideoGameSales());
    }

    return this.http.get<any[]>(`${this.base}/admin/reports/videogame-sales`);
  }

  /** Admin: detailed digital product sales report */
  getDigitalProductSales(): Observable<DigitalProductSales[]> {
    if (this.useMockData) {
      return of(this.computeDigitalProductSales());
    }

    return this.http.get<DigitalProductSales[]>(`${this.base}/admin/reports/digital-product-sales`);
  }

  private computeVideoGameSales(): VideoGameSales[] {
    const orders = this.readMockGameOrders();
    const mapById = new Map<number, VideoGameSales>();

    for (const order of orders) {
      const groupedPerOrder = new Map<number, { title: string; quantity: number; revenue: number }>();

      for (const item of order.items) {
        const current = groupedPerOrder.get(item.id);
        if (current) {
          current.quantity += 1;
          current.revenue += item.price;
        } else {
          groupedPerOrder.set(item.id, {
            title: item.title,
            quantity: 1,
            revenue: item.price,
          });
        }
      }

      for (const [gameId, grouped] of groupedPerOrder.entries()) {
        const existing = mapById.get(gameId);
        if (existing) {
          existing.totalNumbers += 1;
          existing.totalQuantity += grouped.quantity;
          existing.totalRevenue += grouped.revenue;
        } else {
          mapById.set(gameId, {
            videoGameId: gameId,
            title: grouped.title,
            totalNumbers: 1,
            totalQuantity: grouped.quantity,
            totalRevenue: grouped.revenue,
          });
        }
      }
    }

    return Array.from(mapById.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  private computeDigitalProductSales(): DigitalProductSales[] {
    const orders = this.readMockDigitalOrders();
    const mapById = new Map<number, DigitalProductSales>();

    for (const order of orders) {
      const existing = mapById.get(order.digitalProductId);
      if (existing) {
        existing.totalOrders += 1;
        existing.totalQuantity += order.quantity;
        existing.totalRevenue += order.totalPrice;
      } else {
        mapById.set(order.digitalProductId, {
          digitalProductId: order.digitalProductId,
          name: order.digitalProductName,
          totalOrders: 1,
          totalQuantity: order.quantity,
          totalRevenue: order.totalPrice,
        });
      }
    }

    return Array.from(mapById.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  private readMockGameOrders(startDate?: Date, endDate?: Date): MockGameOrder[] {
    const orders = this.readFromStorage<MockGameOrder[]>(this.mockGameOrdersKey, []);
    return orders.filter(order => this.isWithinDateRange(order.createdAt, startDate, endDate));
  }

  private readMockDigitalOrders(startDate?: Date, endDate?: Date): MockDigitalOrder[] {
    const orders = this.readFromStorage<MockDigitalOrder[]>(this.mockDigitalOrdersKey, []);
    return orders.filter(order => this.isWithinDateRange(order.createdAt, startDate, endDate));
  }

  private isWithinDateRange(createdAt: string, startDate?: Date, endDate?: Date): boolean {
    const time = this.parseDate(createdAt).getTime();
    if (startDate && time < startDate.getTime()) {
      return false;
    }

    if (endDate && time > endDate.getTime()) {
      return false;
    }

    return true;
  }

  private parseDate(value: string | null | undefined): Date {
    if (!value) {
      return new Date();
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }

    return parsed;
  }

  private countDistinctMockUsers(gameOrders: MockGameOrder[], digitalOrders: MockDigitalOrder[]): number {
    const users = new Set<string>();

    if (gameOrders.length > 0) {
      users.add('demo_user');
    }

    for (const order of digitalOrders) {
      users.add(String(order.userId));
    }

    return users.size;
  }

  private readFromStorage<T>(key: string, fallback: T): T {
    if (typeof localStorage === 'undefined') {
      return fallback;
    }

    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
}

interface MockGameOrderItem {
  id: number;
  title: string;
  price: number;
}

interface MockGameOrder {
  id: number;
  items: MockGameOrderItem[];
  totalPrice: number;
  status: number;
  createdAt: string;
}

interface MockDigitalOrder {
  id: number;
  userId: number;
  digitalProductId: number;
  digitalProductName: string;
  quantity: number;
  totalPrice: number;
  status: string;
  createdAt: string;
}