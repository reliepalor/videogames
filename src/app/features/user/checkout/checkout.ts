import { Component, inject, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OrderService } from 'src/app/core/services/order.service';
import { CartService, Cart } from 'src/app/core/services/cart.service';
import { BehaviorSubject } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-checkout',
  imports: [CommonModule],
  templateUrl: './checkout.html'
})
export class CheckoutComponent implements OnInit {
  private orderService = inject(OrderService);
  cartService = inject(CartService);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  private cartSubject = new BehaviorSubject<Cart | null>(null);
  cart$ = this.cartSubject.asObservable();

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
    this.cartService.getCart().subscribe({
      next: (cart) => this.cartSubject.next(cart),
      error: () => this.errorMessage = 'Failed to load cart'
    });
  }

  checkout() {
    if (this.cartItemsToCheckout.length === 0) {
      this.errorMessage = 'Please select at least one item to checkout.';
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
