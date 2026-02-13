import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

import { DigitalOrder } from "../../models/digital-orders/digital-order.model";

@Injectable({
    providedIn: 'root'
})

export class DigitalOrderService {
  private readonly API_URL = 'http://localhost:5019/api';

  constructor(private http: HttpClient) {}


  //-------POST------user purchase digital product
  purchase(payload: {
    digitalProductId: number;
    quantity: number
  }): Observable<any> {
    return this.http.post(`${this.API_URL}/digital-orders/purchase`, payload);
  }


  //------GET---user digital order
  getMyOrders(): Observable<any[]> {
    return this.http.get<any[]> (`${this.API_URL}/digital-orders/my`);
    }

  //----GET single order
  getOrderById(id: number): Observable<any> {
    return this.http.get(`${this.API_URL}/digital-orders/${id}`);
  }

  //-------------ADMIN approved orders

  getAllOrders() {
    return this.http.get<DigitalOrder[]>(
      `${this.API_URL}/admin/digital-orders`
    );
  }

  approveOrder(orderId: number) {
    return this.http.post(
      `${this.API_URL}/admin/digital-orders/${orderId}/approve`,
      {}
    );
  }

  rejectOrder(orderId: number) {
    return this.http.post(
      `${this.API_URL}/admin/digital-orders/${orderId}/reject`,
      {}
    );
  }
}