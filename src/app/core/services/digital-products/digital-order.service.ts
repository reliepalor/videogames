import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, of, throwError } from "rxjs";

import { DigitalOrder } from "../../models/digital-orders/digital-order.model";
import { DigitalProduct } from "../../models/digital-products/digital-product.model";
import { DigitalProductKey } from "../../models/digital-products/digital-product-key.model";
import { environment } from "src/environments/environment";

@Injectable({
    providedIn: 'root'
})

export class DigitalOrderService {
  private readonly API_URL = `${environment.apiUrl}/api`;
  private readonly useMockData = environment.useMockData;

  private readonly mockOrdersKey = 'mock_digital_orders';
  private readonly mockProductsKey = 'mock_digital_products';
  private readonly mockProductKeysKey = 'mock_digital_product_keys';
  private readonly mockUserId = 1;
  private readonly mockUserName = 'Demo User';
  private readonly mockUserEmail = 'demo.user@videogame.local';

  constructor(private http: HttpClient) {}


  //-------POST------user purchase digital product
  purchase(payload: {
    digitalProductId: number;
    quantity: number
  }): Observable<any> {
    if (this.useMockData) {
      const products = this.readFromStorage<DigitalProduct[]>(this.mockProductsKey, []);
      const product = products.find(item => item.id === payload.digitalProductId && item.isActive);
      if (!product) {
        return throwError(() => new Error('Digital product is unavailable.'));
      }

      if (payload.quantity < 1) {
        return throwError(() => new Error('Quantity must be at least 1.'));
      }

      if (product.availableKeys < payload.quantity) {
        return throwError(() => new Error('Not enough product keys available.'));
      }

      const orders = this.readFromStorage<DigitalOrder[]>(this.mockOrdersKey, []);
      const nextOrderId = orders.length
        ? Math.max(...orders.map(order => order.id)) + 1
        : 1;

      const now = new Date().toISOString();
      const items = Array.from({ length: payload.quantity }, (_, index) => ({
        id: index + 1,
        productKey: '',
        isAssigned: false,
        assignedAt: null,
      }));

      const order: DigitalOrder = {
        id: nextOrderId,
        userId: this.mockUserId,
        userName: this.mockUserName,
        userEmail: this.mockUserEmail,
        digitalProductId: product.id,
        digitalProductName: product.name,
        digitalProductImagePath: product.imagePath,
        imagePath: product.imagePath,
        quantity: payload.quantity,
        totalPrice: product.price * payload.quantity,
        status: 'Pending',
        createdAt: now,
        approvedAt: null,
        items,
      };

      this.writeToStorage(this.mockOrdersKey, [order, ...orders]);
      return of({ message: 'Purchase successful! Order pending approval.', order });
    }

    return this.http.post(`${this.API_URL}/digital-orders/purchase`, payload);
  }


  //------GET---user digital order
  getMyOrders(): Observable<any[]> {
    if (this.useMockData) {
      const orders = this.readFromStorage<DigitalOrder[]>(this.mockOrdersKey, []);
      return of(
        orders
          .filter(order => order.userId === this.mockUserId)
          .sort((a, b) => b.id - a.id)
      );
    }

    return this.http.get<any[]> (`${this.API_URL}/digital-orders/my`);
    }

  //----GET single order
  getOrderById(id: number): Observable<any> {
    if (this.useMockData) {
      const orders = this.readFromStorage<DigitalOrder[]>(this.mockOrdersKey, []);
      const order = orders.find(item => item.id === id);
      if (!order) {
        return throwError(() => new Error('Digital order not found.'));
      }

      return of(order);
    }

    return this.http.get(`${this.API_URL}/digital-orders/${id}`);
  }

  //-------------ADMIN approved orders

  getAllOrders() {
    if (this.useMockData) {
      const orders = this.readFromStorage<DigitalOrder[]>(this.mockOrdersKey, []);
      return of([...orders].sort((a, b) => b.id - a.id));
    }

    return this.http.get<DigitalOrder[]>(
      `${this.API_URL}/admin/digital-orders`
    );
  }

  approveOrder(orderId: number) {
    if (this.useMockData) {
      return this.updateOrderStatus(orderId, 'Approved');
    }

    return this.http.post(
      `${this.API_URL}/admin/digital-orders/${orderId}/approve`,
      {}
    );
  }

  rejectOrder(orderId: number) {
    if (this.useMockData) {
      return this.updateOrderStatus(orderId, 'Rejected');
    }

    return this.http.post(
      `${this.API_URL}/admin/digital-orders/${orderId}/reject`,
      {}
    );
  }

  private updateOrderStatus(orderId: number, status: 'Approved' | 'Rejected'): Observable<DigitalOrder> {
    try {
      const orders = this.readFromStorage<DigitalOrder[]>(this.mockOrdersKey, []);
      const orderIndex = orders.findIndex(order => order.id === orderId);
      if (orderIndex < 0) {
        return throwError(() => new Error('Digital order not found.'));
      }

      const current = orders[orderIndex];
      const now = new Date().toISOString();

      let updatedOrder: DigitalOrder = {
        ...current,
        status,
        approvedAt: status === 'Approved' ? now : null,
      };

      if (status === 'Approved') {
        updatedOrder = this.assignProductKeys(updatedOrder, now);
      }

      if (status === 'Rejected') {
        updatedOrder = {
          ...updatedOrder,
          items: updatedOrder.items.map(item => ({
            ...item,
            productKey: '',
            isAssigned: false,
            assignedAt: null,
          })),
        };
      }

      const updatedOrders = [...orders];
      updatedOrders[orderIndex] = updatedOrder;
      this.writeToStorage(this.mockOrdersKey, updatedOrders);
      return of(updatedOrder);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update order status.';
      return throwError(() => new Error(message));
    }
  }

  private assignProductKeys(order: DigitalOrder, assignedAt: string): DigitalOrder {
    const rawKeys = this.readFromStorage<(DigitalProductKey & { digitalProductId: number })[]>(
      this.mockProductKeysKey,
      []
    );

    const candidateIndexes: number[] = [];
    for (let i = 0; i < rawKeys.length; i++) {
      const key = rawKeys[i];
      if (key.digitalProductId === order.digitalProductId && !key.isUsed) {
        candidateIndexes.push(i);
      }
    }

    if (candidateIndexes.length < order.quantity) {
      throw new Error('Not enough product keys available.');
    }

    const updatedKeys = [...rawKeys];
    const assignedItems = [...order.items];

    for (let i = 0; i < order.quantity; i++) {
      const keyIndex = candidateIndexes[i];
      const keyRecord = updatedKeys[keyIndex];
      updatedKeys[keyIndex] = {
        ...keyRecord,
        isUsed: true,
        assignedToUserId: order.userId,
        useAt: assignedAt,
      };

      assignedItems[i] = {
        ...assignedItems[i],
        productKey: keyRecord.productKey,
        isAssigned: true,
        assignedAt,
      };
    }

    this.writeToStorage(this.mockProductKeysKey, updatedKeys);
    this.syncProductAvailability(order.digitalProductId, updatedKeys);

    return {
      ...order,
      items: assignedItems,
    };
  }

  private syncProductAvailability(
    digitalProductId: number,
    keys: Array<DigitalProductKey & { digitalProductId: number }>
  ): void {
    const products = this.readFromStorage<DigitalProduct[]>(this.mockProductsKey, []);
    const productIndex = products.findIndex(product => product.id === digitalProductId);
    if (productIndex < 0) {
      return;
    }

    const productKeys = keys.filter(key => key.digitalProductId === digitalProductId);
    const available = productKeys.filter(key => !key.isUsed).length;

    const updatedProduct: DigitalProduct = {
      ...products[productIndex],
      stock: productKeys.length,
      availableKeys: available,
      updatedAt: new Date().toISOString(),
    };

    const updatedProducts = [...products];
    updatedProducts[productIndex] = updatedProduct;
    this.writeToStorage(this.mockProductsKey, updatedProducts);
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
}