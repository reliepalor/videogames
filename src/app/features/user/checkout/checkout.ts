import { Component, inject, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OrderService } from 'src/app/core/services/orders/order.service';
import { CartService, Cart } from 'src/app/core/services/cart/cart.service';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'environments/environment';
import { CartService as MockCartService } from 'src/app/services/cart.service';
import { Game } from 'src/app/models/game.model';

@Component({
  standalone: true,
  selector: 'app-checkout',
  imports: [CommonModule],
  templateUrl: './checkout.html'
})
export class CheckoutComponent implements OnInit {
  private orderService = inject(OrderService);
  cartService = inject(CartService);
  private mockCartService = inject(MockCartService);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  private cartSubject = new BehaviorSubject<Cart | null>(null);
  cart$ = this.cartSubject.asObservable();
  useMockData = environment.useMockData;

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  isFadingOut = false;
  showSuccessModal = false;
  successTimeout?: any;

  cartItemsToCheckout: number[] = []; // array of CartItem IDs user selects for checkout

  ngOnInit(): void {
    this.loadCart();
  }

  private loadCart() {
    if (this.useMockData) {
      this.loadMockCart();
      return;
    }

    this.cartService.getCart().subscribe({
      next: (cart) => this.cartSubject.next(cart),
      error: () => this.errorMessage = 'Failed to load cart'
    });
  }

  private loadMockCart(): void {
    const games = this.mockCartService.getCart();
    const grouped = new Map<number, { game: Game; quantity: number }>();

    for (const game of games) {
      const key = game.id ?? 0;
      const current = grouped.get(key);
      if (current) {
        current.quantity += 1;
      } else {
        grouped.set(key, { game, quantity: 1 });
      }
    }

    const items = Array.from(grouped.values()).map((entry, index) => ({
      cartItemId: index + 1,
      sourceCartItemId: index + 1,
      id: index + 1,
      videoGameId: entry.game.id ?? index + 1,
      title: entry.game.title,
      price: entry.game.price,
      quantity: entry.quantity,
      videoGame: {
        id: entry.game.id ?? index + 1,
        title: entry.game.title,
        price: entry.game.price,
        imageUrl: entry.game.imageUrl || '/assets/no-image.png',
      },
    }));

    this.cartSubject.next({ items });
  }

  checkout() {
    if (this.cartItemsToCheckout.length === 0) {
      this.errorMessage = 'Please select at least one item to checkout.';
      return;
    }

    if (this.useMockData) {
      this.isLoading = true;
      const message = this.mockCartService.checkout();
      this.showSuccessMessage(message);
      this.isLoading = false;

      setTimeout(() => {
        this.router.navigate(['/orders']);
      }, 1200);
      return;
    }

    this.isLoading = true;
    this.orderService.checkout(this.cartItemsToCheckout).subscribe({
      next: () => {
        this.showSuccessMessage('Checkout successful! Thank you for your purchase.');
        this.isLoading = false;

        setTimeout(() => {
          this.router.navigate(['/orders']);
        }, 2000);
      },
      error: (err) => {
        this.errorMessage = 'Checkout failed. Please try again.';
        this.isLoading = false;
      }
    });
  }

  toggleItemSelection(item: any, event: Event) {
    const itemId = item.sourceCartItemId || item.id;
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.cartItemsToCheckout.push(itemId);
    } else {
      this.cartItemsToCheckout = this.cartItemsToCheckout.filter(id => id !== itemId);
    }
  }

  showSuccessMessage(message: string): void {
    this.successMessage = message;
    this.isFadingOut = false;
    this.showSuccessModal = true;

    clearTimeout(this.successTimeout);
    this.successTimeout = setTimeout(() => {
      this.ngZone.run(() => {
        this.isFadingOut = true;
        setTimeout(() => {
          this.showSuccessModal = false;
          this.isFadingOut = false;
          this.cdr.detectChanges();
        }, 300);
      });
    }, 3000); // 3 seconds
  }
}
