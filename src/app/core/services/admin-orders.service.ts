import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

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
}

@Injectable({
  providedIn: 'root',
})
export class AdminOrdersService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getPendingOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/admin/orders/pending`);
  }

  approveOrder(orderId: number, items: OrderItemApproval[]) {
    return this.http.post(`${this.apiUrl}/admin/orders/${orderId}/approve`, { items });
  }

  rejectOrder(orderId: number) {
    return this.http.post(`${this.apiUrl}/admin/orders/${orderId}/reject`, {});
  }
}
