import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { environment } from 'src/environments/environment'
import { Observable, map, switchMap } from 'rxjs'
import { VideoGameService } from './videogame.service'

export interface OrderItem {
  id: number;
  sourceCartItemId: number;
  gameTitle: string;
  unitPrice: number;
  quantity: number;
  subtotal?: number;
  productKey?: string;
  imageUrl?: string;
}

export interface Order {
  id: number;
  userId: number;
  totalPrice: number;
  status?: number;
  items: OrderItem[];
  createdAt?: string;
}

export interface CheckoutResponse {
  message: string;
  order: Order;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private api = `${environment.apiUrl}/api/orders`

  constructor(private http: HttpClient, private videoGameService: VideoGameService) {}

  getMyOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.api}/my`).pipe(
      switchMap(orders => {
        return this.videoGameService.getAll().pipe(
          map(games => {
            const gameMap = new Map(games.map(g => [g.title, g.imageUrl]));
            return orders.map(order => ({
              ...order,
              items: order.items.map(item => ({
                ...item,
                imageUrl: gameMap.get(item.gameTitle) || '/assets/no-image.png'
              }))
            }));
          })
        );
      })
    );
  }

  checkout(cartItemIds: number[]): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.api}/checkout`, cartItemIds)
  }
}
