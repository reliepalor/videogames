import { Component, inject, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VideoGameService } from '../../../../core/services/videogame.service';
import { AuthService } from '../../../../core/services/auth.service';
import { VideoGame } from '../../../../core/models/videogame.model';
import { GameReviewsComponent } from '../../reviews/game-reviews';
import { SkeletonBoxComponent } from '../../../../shared/skeleton/skeleton-box.component';
import { OrderService } from '../../../../core/services/order.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { CartService } from '../../../../core/services/cart.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-game-details',
  standalone: true,
  imports: [CommonModule, RouterLink, GameReviewsComponent, SkeletonBoxComponent],
  templateUrl: './game-details.component.html',
  styles: [`
    .toast-enter {
      animation: toast-enter 0.3s ease-out;
    }
    .toast-leave {
      animation: toast-leave 0.3s ease-in;
    }
    @keyframes toast-enter {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes toast-leave {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(-10px);
      }
    }

    .buy-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 60;
      display: grid;
      place-items: center;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(5px);
      animation: buy-fade-in 180ms ease-out;
    }
    .buy-modal-panel {
      width: min(92vw, 420px);
      border-radius: 14px;
      border: 1px solid rgba(75, 85, 99, 0.6);
      background: rgba(17, 24, 39, 0.96);
      color: #f9fafb;
      box-shadow: 0 22px 60px rgba(0, 0, 0, 0.45);
      padding: 1rem;
      animation: buy-panel-in 180ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    .buy-modal-backdrop.closing { animation: buy-fade-out 180ms ease-in forwards; }
    .buy-modal-panel.closing { animation: buy-panel-out 180ms ease-in forwards; }
    @keyframes buy-fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes buy-fade-out { from { opacity: 1; } to { opacity: 0; } }
    @keyframes buy-panel-in {
      from { opacity: 0; transform: translateY(12px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes buy-panel-out {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to { opacity: 0; transform: translateY(8px) scale(0.985); }
    }
  `]
})
export class GameDetailsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private videoGameService = inject(VideoGameService);
  private authService = inject(AuthService);
  private orderService = inject(OrderService);
  private themeService = inject(ThemeService);
  private cartService = inject(CartService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  @ViewChild('reviews', { static: false }) reviews?: GameReviewsComponent;

  game?: VideoGame;
  loading = true;
  gameId!: number;
  showReviews = false;
  hasApprovedPurchase = false;
  isDarkMode = false;
  showSuccessModal = false;
  successMessage = '';
  successTimeout?: any;
  isFadingOut = false;
  isBuyingNow = false;
  showBuyConfirmModal = false;
  isBuyConfirmClosing = false;
  private themeSubscription?: Subscription;

  ngOnInit(): void {
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(
      isDark => {
        this.isDarkMode = isDark;
        this.cdr.markForCheck();
      }
    );
    this.gameId = +this.route.snapshot.params['id'];
    this.showReviews = this.route.snapshot.url.some(segment => segment.path === 'reviews');
    this.videoGameService.getById(this.gameId).subscribe({
      next: game => {
        this.game = game;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
    if (this.isLoggedIn) {
      this.checkApprovedPurchase();
    }
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  private checkApprovedPurchase(): void {
    this.orderService.getMyOrders().subscribe({
      next: orders => {
        this.hasApprovedPurchase = orders.some(o => o.status == 1 && o.items.some(i => i.videoGameId == this.gameId));
        this.cdr.detectChanges();
      },
      error: () => {
        this.hasApprovedPurchase = false;
        this.cdr.detectChanges();
      }
    });
  }

  showSuccessMessage(message: string): void {
    this.successMessage = message;
    this.showSuccessModal = true;
    this.isFadingOut = false;
    this.cdr.detectChanges();

    // remove old timeout
    if (this.successTimeout) clearTimeout(this.successTimeout);

    // fade out animation start
    this.successTimeout = setTimeout(() => {
      this.isFadingOut = true;
      this.cdr.detectChanges();

      // remove modal after animation
      setTimeout(() => {
        this.showSuccessModal = false;
        this.isFadingOut = false;
        this.cdr.detectChanges();
      }, 300);
    }, 1800);
  }

  addToCart(game: VideoGame): void {
    if (!game.id) return;
    this.cartService.addToCart(game.id, 1).subscribe({
      next: () => {
        this.showSuccessMessage(`Added ${game.title} to cart!`);
      },
      error: () => {
        this.showSuccessMessage('Failed to add to cart.');
      }
    });
  }

  openBuyConfirm(): void {
    if (!this.game?.id || this.isBuyingNow) return;
    this.isBuyConfirmClosing = false;
    this.showBuyConfirmModal = true;
  }

  closeBuyConfirm(): void {
    this.isBuyConfirmClosing = true;
    setTimeout(() => {
      this.showBuyConfirmModal = false;
      this.isBuyConfirmClosing = false;
    }, 180);
  }

  confirmBuyNow(): void {
    if (!this.game) return;
    this.closeBuyConfirm();
    this.buyNow(this.game);
  }

  buyNow(game: VideoGame): void {
    const gameId = game.id;
    if (!gameId || this.isBuyingNow) return;

    this.isBuyingNow = true;
    this.cartService.addToCart(gameId, 1).subscribe({
      next: () => {
        this.cartService.getCart().subscribe({
          next: (cart) => {
            const latestCartItem = [...(cart.items ?? [])]
              .filter(i => i.videoGameId === gameId)
              .sort((a, b) => b.cartItemId - a.cartItemId)[0];

            const cartItemId = latestCartItem?.cartItemId;
            if (!cartItemId) {
              this.isBuyingNow = false;
              this.showSuccessMessage('Unable to start checkout right now.');
              return;
            }

            this.orderService.checkout([cartItemId]).subscribe({
              next: () => {
                this.isBuyingNow = false;
                this.showSuccessMessage('Checkout successful! Redirecting to your orders...');
                setTimeout(() => this.router.navigate(['/orders']), 1200);
              },
              error: () => {
                this.isBuyingNow = false;
                this.showSuccessMessage('Checkout failed. Please try again.');
              }
            });
          },
          error: () => {
            this.isBuyingNow = false;
            this.showSuccessMessage('Unable to load cart for checkout.');
          }
        });
      },
      error: () => {
        this.isBuyingNow = false;
        this.showSuccessMessage('Failed to start checkout.');
      }
    });
  }
}
