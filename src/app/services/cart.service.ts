import { Injectable } from '@angular/core';
import { Game } from '../models/game.model';

export interface DemoOrder {
  id: number;
  items: Game[];
  totalPrice: number;
  status: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly storageKey = 'demo_cart_items';
  private readonly ordersStorageKey = 'demo_orders';

  addToCart(game: Game): void {
    const cart = this.getCart();
    cart.push(game);
    this.writeCart(cart);
  }

  getCart(): Game[] {
    return this.readCart();
  }

  removeFromCart(id: number): void {
    const cart = this.getCart().filter(item => item.id !== id);
    this.writeCart(cart);
  }

  clearCart(): void {
    this.writeCart([]);
  }

  checkout(): string {
    const cart = this.getCart();
    if (cart.length) {
      const existingOrders = this.getMockOrders();
      const nextId = existingOrders.length
        ? Math.max(...existingOrders.map(order => order.id)) + 1
        : 1;

      const totalPrice = cart.reduce((sum, game) => sum + (game.price || 0), 0);
      const nextOrder: DemoOrder = {
        id: nextId,
        items: [...cart],
        totalPrice,
        status: 0,
        createdAt: new Date().toISOString(),
      };

      this.writeToStorage(this.ordersStorageKey, [nextOrder, ...existingOrders]);
    }

    this.clearCart();
    return 'Order placed successfully! (Demo Mode)';
  }

  setQuantity(gameId: number, quantity: number): void {
    const cart = this.getCart().filter(item => item.id !== gameId);
    const game = this.getCart().find(item => item.id === gameId);
    if (!game || quantity < 1) {
      this.writeCart(cart);
      return;
    }

    const nextCart = [...cart];
    for (let i = 0; i < quantity; i++) {
      nextCart.push({ ...game });
    }

    this.writeCart(nextCart);
  }

  getMockOrders(): DemoOrder[] {
    return this.readFromStorage<DemoOrder[]>(this.ordersStorageKey, []);
  }

  private readCart(): Game[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as Game[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeCart(cart: Game[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(cart));
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
