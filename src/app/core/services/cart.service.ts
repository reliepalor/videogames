import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { BehaviorSubject, tap } from 'rxjs'
import { environment } from 'src/environments/environment'

export interface VideoGame {
  id: number;
  title: string;
  price: number;
  imageUrl: string;
}

export interface CartItem {
  id?: number;
  sourceCartItemId?: number;
  cartItemId: number;
  videoGameId: number;
  title?: string;
  price?: number;
  quantity: number;
  subtotal?: number;
  imageUrl?: string;
  videoGame?: VideoGame;
}

export interface Cart {
  items: CartItem[];
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private api = `${environment.apiUrl}/api/cart`
  private cartSubject = new BehaviorSubject<Cart | null>(null)
  cart$ = this.cartSubject.asObservable()

  constructor(private http: HttpClient) {}

  getCart() {
    return this.http.get<Cart>(this.api).pipe(
      tap(cart => this.cartSubject.next(cart))
    )
  }

  addToCart(gameId: number, quantity: number) {
    return this.http.post(`${this.api}/add`, { videoGameId: gameId, quantity }).pipe(
      tap(() => this.getCart().subscribe())
    )
  }

  updateQuantity(cartItemId: number, quantity: number) {
    return this.http.put(`${this.api}/update/${cartItemId}`, { quantity })
  }

  removeItem(gameId: number) {
    return this.http.delete(`${this.api}/remove/${gameId}`)
  }
}
