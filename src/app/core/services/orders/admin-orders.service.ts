import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { map, Observable, of } from 'rxjs';

export interface OrderItemApproval {
  orderItemId: number;
  productKey: string;
}

export interface OrderItem {
  id: number;
  gameTitle: string;
  quantity: number;
  unitPrice: number;
  productKey?: string | null;
}

export interface Order {
  id: number;
  username: string;
  email: string;
  totalPrice: number;
  status: number;
  createdAt: string;
  items: OrderItem[];
  showItems?: boolean;
  expanded?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AdminOrdersService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private readonly useMockData = environment.useMockData;
  private readonly mockOrdersStorageKey = 'demo_orders';
  private readonly mockOrderKeysStorageKey = 'demo_order_item_keys';

  getPendingOrders(): Observable<Order[]> {
    if (this.useMockData) {
      const orders = this.readMockOrders();
      return of(orders.map(order => this.toOrderFromMock(order)));
    }

    return this.http.get<unknown[]>(`${this.apiUrl}/admin/orders/pending`).pipe(
      map((rows) => (rows ?? []).map((row) => this.toOrder(row)))
    );
  }

  approveOrder(orderId: number, items: OrderItemApproval[]) {
    if (this.useMockData) {
      const orders = this.readMockOrders();
      const orderIndex = orders.findIndex(order => Number(order['id']) === orderId);

      if (orderIndex < 0) {
        throw new Error('Order not found in mock data.');
      }

      orders[orderIndex] = {
        ...orders[orderIndex],
        status: 1,
      };

      const keys = this.readFromStorage<Record<string, string>>(this.mockOrderKeysStorageKey, {});
      for (const item of items ?? []) {
        keys[`${orderId}:${item.orderItemId}`] = item.productKey;
      }

      this.writeToStorage(this.mockOrderKeysStorageKey, keys);
      this.writeToStorage(this.mockOrdersStorageKey, orders);
      return of({ message: 'Mock order approved.' });
    }

    return this.http.post(`${this.apiUrl}/admin/orders/${orderId}/approve`, { items });
  }

  rejectOrder(orderId: number, reason?: string) {
    if (this.useMockData) {
      const orders = this.readMockOrders();
      const orderIndex = orders.findIndex(order => Number(order['id']) === orderId);

      if (orderIndex < 0) {
        throw new Error('Order not found in mock data.');
      }

      orders[orderIndex] = {
        ...orders[orderIndex],
        status: 2,
      };

      this.writeToStorage(this.mockOrdersStorageKey, orders);
      return of({ message: 'Mock order rejected.' });
    }

    return this.http.post(`${this.apiUrl}/admin/orders/${orderId}/reject`, null);
  }

  private toOrderFromMock(row: Record<string, unknown>): Order {
    const games = (row['items'] as Array<Record<string, unknown>> | undefined) ?? [];
    const grouped = new Map<string, { title: string; quantity: number; unitPrice: number }>();

    for (const game of games) {
      const title = String(game['title'] ?? 'Game');
      const unitPrice = Number(game['price'] ?? 0);
      const key = title.toLowerCase();
      const current = grouped.get(key);
      if (current) {
        current.quantity += 1;
      } else {
        grouped.set(key, { title, quantity: 1, unitPrice });
      }
    }

    const keys = this.readFromStorage<Record<string, string>>(this.mockOrderKeysStorageKey, {});
    const mockOrderId = Number(row['id'] ?? 0);
    const items: OrderItem[] = Array.from(grouped.values()).map((entry, index) => {
      const orderItemId = index + 1;
      return {
        id: orderItemId,
        gameTitle: entry.title,
        quantity: entry.quantity,
        unitPrice: entry.unitPrice,
        productKey: keys[`${mockOrderId}:${orderItemId}`] ?? null,
      };
    });

    return {
      id: mockOrderId,
      username: 'demo_user',
      email: 'demo.user@videogame.local',
      totalPrice: Number(row['totalPrice'] ?? 0),
      status: this.parseStatus(row['status']),
      createdAt: String(row['createdAt'] ?? new Date().toISOString()),
      items,
      showItems: false,
      expanded: false,
    };
  }

  private readMockOrders(): Array<Record<string, unknown>> {
    const orders = this.readFromStorage<Array<Record<string, unknown>>>(this.mockOrdersStorageKey, []);
    return [...orders].sort((a, b) => {
      const dateA = new Date(String(a['createdAt'] ?? '')).getTime();
      const dateB = new Date(String(b['createdAt'] ?? '')).getTime();
      return dateB - dateA;
    });
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

  private writeToStorage<T>(key: string, value: T): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(key, JSON.stringify(value));
  }

  private toOrder(row: unknown): Order {
    const data = (row ?? {}) as Record<string, unknown>;
    const itemsRaw = (data['items'] ?? data['Items']) as unknown[] | undefined;

    return {
      id: Number(data['id'] ?? data['Id'] ?? 0),
      username: String(data['username'] ?? data['Username'] ?? ''),
      email: String(data['email'] ?? data['Email'] ?? ''),
      totalPrice: Number(data['totalPrice'] ?? data['TotalPrice'] ?? 0),
      status: this.parseStatus(data['status'] ?? data['Status']),
      createdAt: String(data['createdAt'] ?? data['CreatedAt'] ?? ''),
      items: (itemsRaw ?? []).map((item) => this.toOrderItem(item)),
      showItems: Boolean(data['showItems'] ?? data['ShowItems'] ?? false),
      expanded: Boolean(data['expanded'] ?? data['Expanded'] ?? false)
    };
  }

  private toOrderItem(row: unknown): OrderItem {
    const data = (row ?? {}) as Record<string, unknown>;
    const productKey = data['productKey'] ?? data['ProductKey'];

    return {
      id: Number(data['id'] ?? data['Id'] ?? 0),
      gameTitle: String(data['gameTitle'] ?? data['GameTitle'] ?? ''),
      quantity: Number(data['quantity'] ?? data['Quantity'] ?? 0),
      unitPrice: Number(data['unitPrice'] ?? data['UnitPrice'] ?? 0),
      productKey: productKey == null ? null : String(productKey)
    };
  }

  private parseStatus(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'approved') return 1;
      if (normalized === 'rejected') return 2;
      if (normalized === 'pending') return 0;

      const numeric = Number(value);
      if (Number.isFinite(numeric)) return numeric;
    }

    return 0;
  }
}
