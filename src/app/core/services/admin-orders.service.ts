import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { map, Observable } from 'rxjs';

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

  getPendingOrders(): Observable<Order[]> {
    return this.http.get<unknown[]>(`${this.apiUrl}/admin/orders/pending`).pipe(
      map((rows) => (rows ?? []).map((row) => this.toOrder(row)))
    );
  }

  approveOrder(orderId: number, items: OrderItemApproval[]) {
    return this.http.post(`${this.apiUrl}/admin/orders/${orderId}/approve`, { items });
  }

  rejectOrder(orderId: number, reason?: string) {
    return this.http.post(`${this.apiUrl}/admin/orders/${orderId}/reject`, null);
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
