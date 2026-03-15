import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, tap } from 'rxjs';
import { Game } from '../models/game.model';

interface MockCartItem {
  game: Game;
  quantity: number;
}

interface MockPurchase {
  game: Game;
  quantity: number;
  purchasedAt: string;
}

@Injectable({ providedIn: 'root' })
export class GameMockService {
  private http = inject(HttpClient);

  private readonly mockGamesKey = 'mock_games';
  private readonly mockCartKey = 'mock_cart_items';
  private readonly mockPurchasesKey = 'mock_purchases';

  // Frontend-only data source for portfolio/demo mode.
  getGames(): Observable<Game[]> {
    return this.http.get<Game[]>('/assets/mock/games.json').pipe(
      map(games => games ?? [])
    );
  }

  // API-compatible list method so existing components can keep using VideoGameService token.
  getAll(): Observable<Game[]> {
    const stored = this.getStoredGames();
    if (stored.length) {
      return of(stored);
    }

    return this.getGames().pipe(
      tap(games => this.writeToStorage(this.mockGamesKey, games))
    );
  }

  getById(id: number): Observable<Game> {
    return this.getAll().pipe(
      map(games => {
        const game = games.find(item => item.id === id);
        if (!game) {
          throw new Error('Game not found in mock data');
        }

        return game;
      })
    );
  }

  create(formData: FormData): Observable<Game> {
    const games = this.getStoredGames();
    const nextId = games.length ? Math.max(...games.map(g => g.id ?? 0)) + 1 : 1;

    const created: Game = {
      id: nextId,
      title: this.readFormString(formData, 'Title'),
      platform: this.readFormString(formData, 'Platform'),
      developer: this.readFormString(formData, 'Developer'),
      publisher: this.readFormString(formData, 'Publisher'),
      price: Number(this.readFormString(formData, 'Price')) || 0,
      imageUrl: undefined,
    };

    const updated = [...games, created];
    this.writeToStorage(this.mockGamesKey, updated);
    return of(created);
  }

  update(id: number, formData: FormData): Observable<Game> {
    const games = this.getStoredGames();
    const index = games.findIndex(game => game.id === id);

    if (index < 0) {
      throw new Error('Game not found for mock update');
    }

    const current = games[index];
    const updatedGame: Game = {
      ...current,
      title: this.readFormString(formData, 'Title') || current.title,
      platform: this.readFormString(formData, 'Platform') || current.platform,
      developer: this.readFormString(formData, 'Developer') || current.developer,
      publisher: this.readFormString(formData, 'Publisher') || current.publisher,
      price: Number(this.readFormString(formData, 'Price')) || current.price,
    };

    const updated = [...games];
    updated[index] = updatedGame;
    this.writeToStorage(this.mockGamesKey, updated);
    return of(updatedGame);
  }

  delete(id: number): Observable<void> {
    const games = this.getStoredGames();
    const updated = games.filter(game => game.id !== id);
    this.writeToStorage(this.mockGamesKey, updated);
    return of(void 0);
  }

  getCartItems(): MockCartItem[] {
    return this.readFromStorage<MockCartItem[]>(this.mockCartKey, []);
  }

  addToCart(game: Game, quantity = 1): void {
    const cart = this.getCartItems();
    const existing = cart.find(item => item.game.id === game.id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({ game, quantity });
    }

    this.writeToStorage(this.mockCartKey, cart);
  }

  clearCart(): void {
    this.writeToStorage(this.mockCartKey, []);
  }

  buyNow(game: Game, quantity = 1): void {
    const purchases = this.getPurchases();
    purchases.push({
      game,
      quantity,
      purchasedAt: new Date().toISOString(),
    });

    this.writeToStorage(this.mockPurchasesKey, purchases);
  }

  checkoutCart(): void {
    const cart = this.getCartItems();
    if (!cart.length) return;

    const purchases = this.getPurchases();
    for (const item of cart) {
      purchases.push({
        game: item.game,
        quantity: item.quantity,
        purchasedAt: new Date().toISOString(),
      });
    }

    this.writeToStorage(this.mockPurchasesKey, purchases);
    this.clearCart();
  }

  getPurchases(): MockPurchase[] {
    return this.readFromStorage<MockPurchase[]>(this.mockPurchasesKey, []);
  }

  private getStoredGames(): Game[] {
    return this.readFromStorage<Game[]>(this.mockGamesKey, []);
  }

  private readFormString(formData: FormData, key: string): string {
    const value = formData.get(key);
    return typeof value === 'string' ? value : '';
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
