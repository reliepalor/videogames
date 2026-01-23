import { Component, OnInit, OnDestroy, inject, NgZone, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService, CartItem } from 'src/app/core/services/cart.service';
import { OrderService } from 'src/app/core/services/order.service';
import { VideoGameService } from 'src/app/core/services/videogame.service';
import { ThemeService } from 'src/app/core/services/theme.service';
import { Subscription } from 'rxjs';

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
  loading = false;
  errorMsg = '';
  showSuccessModal = false;
  showRemoveSuccessModal = false;

  isDarkMode = signal(false);
  private themeSub?: Subscription;

  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private cartService: CartService,
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
