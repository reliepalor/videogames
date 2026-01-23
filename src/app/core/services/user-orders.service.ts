import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { VideoGameService } from './videogame.service';

export interface UserOrderItem {
  id: number;
  gameTitle: string;
  unitPrice: number;
  quantity: number;
  productKey?: string | null;
  imageUrl?: string;
  videoGameId?: number;
}

export interface UserOrder {
  id: number;
  totalPrice: number;
  status: number;
  createdAt: string;
  items: UserOrderItem[];
  showItems?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UserOrdersService {
  private http = inject(HttpClient);
  private videoGameService = inject(VideoGameService);
  private apiUrl = environment.apiUrl;

  getMyOrders(): Observable<UserOrder[]> {
    return this.http.get<UserOrder[]>(`${this.apiUrl}/api/orders/my`).pipe(
      switchMap(orders => {
        return this.videoGameService.getAll().pipe(
          map(games => {
            const gameMap = new Map(games.map(g => [g.title, { imageUrl: g.imageUrl, id: g.id }]));
            return orders.map(order => ({
              ...order,
              items: order.items.map(item => {
                const gameData = gameMap.get(item.gameTitle);
                return {
                  ...item,
                  imageUrl: gameData?.imageUrl || '/assets/no-image.png',
                  videoGameId: gameData?.id
                };
              })
            }));
          })
        );
      })
    );
  }
}
