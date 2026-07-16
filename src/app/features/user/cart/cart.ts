import { Component, OnInit, OnDestroy, inject, NgZone, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService as BackendCartService, CartItem } from 'src/app/core/services/cart/cart.service';
import { OrderService } from 'src/app/core/services/orders/order.service';
import { VideoGameService } from 'src/app/core/services/catalog/videogame.service';
import { ThemeService } from 'src/app/core/services/ui/theme.service';
import { Subscription } from 'rxjs';
import { environment } from 'environments/environment';
import { CartService as MockCartService } from 'src/app/services/cart.service';
import { Game } from 'src/app/models/game.model';

interface CartItemWithSelection extends CartItem {
  selected: boolean;
  subtotal: number;
  imageUrl: string;
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cart.html',
  styleUrls: ['./cart.css'],
})
export class CartComponent implements OnInit, OnDestroy {
  cartItems: CartItemWithSelection[] = [];
  filteredItems: CartItemWithSelection[] = [];

  search = '';
  selectAll = false;
  loadingCart = true;
  loading = false;
  errorMsg = '';
  showSuccessModal = false;
  showRemoveSuccessModal = false;
  useMockData = environment.useMockData;

  isDarkMode = signal(false);
  private themeSub?: Subscription;

  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private cartService: BackendCartService,
    private mockCartService: MockCartService,
    private orderService: OrderService,
    private videoGameService: VideoGameService,
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.isDarkMode.set(this.themeService.isDarkMode);
    this.themeSub = this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode.set(isDark);
    });

    this.loadCart();

    if (this.useMockData) {
      return;
    }

    this.cartService.cart$.subscribe({
      next: cart => {
        this.ngZone.run(() => {
          if (cart) {
            this.videoGameService.getAll().subscribe({
              next: games => {
                const gameMap = new Map(games.map(g => [g.title, g.imageUrl]));
                this.mapCartItems(cart.items, gameMap);
              },
              error: err => {
                console.error('Failed to load games:', err);
                this.mapCartItems(cart.items, new Map()); // Map without images
              }
            });
          }
        });
      },
      error: err => {
        console.error('Cart subscription error:', err);
      }
    });
  }

  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
  }

  /* ================= LOAD CART ================= */
  loadCart(): void {
    if (this.useMockData) {
      this.loadMockCart();
      return;
    }

    this.loadingCart = true;
    this.cartService.getCart().subscribe({
      next: res => {
        this.ngZone.run(() => {
          this.videoGameService.getAll().subscribe({
            next: games => {
              const gameMap = new Map(games.map(g => [g.title, g.imageUrl]));
              this.mapCartItems(res.items, gameMap);
            },
            error: err => {
              console.error('Failed to load games:', err);
              this.mapCartItems(res.items, new Map()); // Map without images
            }
          });
        });
      },
      error: err => {
        console.error('Failed to load cart:', err);
        this.errorMsg = 'Failed to load cart.';
        this.loadingCart = false;
      }
    });
  }

  private mapCartItems(items: CartItem[], gameMap: Map<string, string | undefined>): void {
    this.cartItems = items.map((i: CartItem) => ({
      ...i,
      selected: false,
      subtotal: (i.price || 0) * i.quantity,
      imageUrl: gameMap.get(i.title || '') || '/assets/no-image.png'
    })).sort((a, b) => b.cartItemId - a.cartItemId);
    this.filteredItems = [...this.cartItems];
    this.loadingCart = false;
    this.cdr.detectChanges();
  }

  private loadMockCart(): void {
    this.loadingCart = true;

    const raw = this.mockCartService.getCart();
    const grouped = new Map<number, { game: Game; quantity: number }>();

    for (const game of raw) {
      const key = game.id ?? 0;
      const existing = grouped.get(key);
      if (existing) {
        existing.quantity += 1;
      } else {
        grouped.set(key, { game, quantity: 1 });
      }
    }

    this.cartItems = Array.from(grouped.values()).map((entry, index) => ({
      cartItemId: index + 1,
      sourceCartItemId: index + 1,
      id: index + 1,
      videoGameId: entry.game.id ?? index + 1,
      title: entry.game.title,
      price: entry.game.price,
      quantity: entry.quantity,
      selected: false,
      subtotal: (entry.game.price || 0) * entry.quantity,
      imageUrl: entry.game.imageUrl || '/assets/no-image.png',
    }));

    this.filteredItems = [...this.cartItems];
    this.loadingCart = false;
    this.errorMsg = '';
    this.cdr.detectChanges();
  }

  /* ================= FILTER ================= */
  filterItems(): void {
    this.filteredItems = this.cartItems.filter(i =>
      i.title?.toLowerCase().includes(this.search.toLowerCase())
    );
  }

  /* ================= SELECT ================= */
  toggleSelectAll(): void {
    this.filteredItems.forEach(i => (i.selected = this.selectAll));
  }

  toggleItem(): void {
    this.selectAll = this.filteredItems.every(i => i.selected);
  }

  /* ================= QUANTITY ================= */
  updateQuantity(item: CartItemWithSelection, qty: number): void {
    if (qty < 1) return;
    item.quantity = qty;

    if (this.useMockData) {
      this.mockCartService.setQuantity(item.videoGameId, qty);
      this.loadMockCart();
      return;
    }

    this.cartService.updateQuantity(item.cartItemId, qty).subscribe({
      next: () => this.loadCart(),
      error: err => {
        console.error('Failed to update quantity:', err);
        this.errorMsg = 'Failed to update quantity.';
      }
    });
  }

  /* ================= REMOVE ================= */
  removeItem(item: CartItemWithSelection): void {
    if (this.useMockData) {
      this.mockCartService.removeFromCart(item.videoGameId);
      this.ngZone.run(() => {
        this.showRemoveSuccessModal = true;
        this.cdr.detectChanges();
        setTimeout(() => this.ngZone.run(() => {
          this.showRemoveSuccessModal = false;
          this.cdr.detectChanges();
        }), 2000);
        this.loadMockCart();
      });
      return;
    }

    this.cartService.removeItem(item.videoGameId).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.showRemoveSuccessModal = true;
          this.cdr.detectChanges();
          setTimeout(() => this.ngZone.run(() => {
            this.showRemoveSuccessModal = false;
            this.cdr.detectChanges();
          }), 2000);
          this.loadCart();
        });
      },
      error: err => {
        console.error('Failed to remove item:', err);
        this.errorMsg = 'Failed to remove item.';
      }
    });
  }

  /* ================= TOTAL ================= */
  get total(): number {
    return this.filteredItems
      .filter(i => i.selected)
      .reduce((sum, i) => sum + (i.subtotal || 0), 0);
  }

  trackByFn(index: number, item: CartItemWithSelection): any {
    return item.cartItemId; // FIXED
  }

  /* ================= CHECKOUT ================= */
  checkout(): void {
    console.log('filteredItems:', this.filteredItems);

    const selected = this.filteredItems.filter(i => i.selected);
    console.log('selected items:', selected);

    // FIX: correct cartItemId array
    const cartItemIds = selected
      .map(i => i.cartItemId)
      .filter(id => id !== undefined);

    console.log('Checkout cartItemIds:', cartItemIds);

    if (!cartItemIds.length) {
      this.errorMsg = 'Please select at least one item.';
      return;
    }

    if (this.useMockData) {
      this.loading = true;
      const message = this.mockCartService.checkout();
      this.loading = false;
      this.errorMsg = '';
      this.showSuccessModal = true;
      this.cdr.detectChanges();
      localStorage.setItem('toast', JSON.stringify({ message }));

      this.ngZone.run(() => {
        setTimeout(() => {
          this.router.navigate(['/orders']);
        }, 1200);
      });
      return;
    }

    this.loading = true;

    this.orderService.checkout(cartItemIds).subscribe({
      next: () => {
        this.loading = false;
        this.showSuccessModal = true;
        this.cdr.detectChanges();
        this.ngZone.run(() => {
          setTimeout(() => {
            this.router.navigate(['/orders']);
          }, 2000);
        });
      },
      error: (error) => {
        console.error('Checkout failed:', error);
        this.errorMsg = 'Checkout failed. Please try again.';
        this.loading = false;
      }
    });
  }
}
