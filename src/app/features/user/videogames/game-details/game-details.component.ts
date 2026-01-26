import { Component, inject, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { VideoGameService } from '../../../../core/services/videogame.service';
import { AuthService } from '../../../../core/services/auth.service';
import { VideoGame } from '../../../../core/models/videogame.model';
import { GameReviewsComponent } from '../../../reviews/game-reviews';
import { ReviewFormComponent } from '../../../reviews/review-form';
import { SkeletonBoxComponent } from '../../../../shared/skeleton/skeleton-box.component';
import { OrderService } from '../../../../core/services/order.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { CartService } from '../../../../core/services/cart.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-game-details',
  standalone: true,
  imports: [CommonModule, GameReviewsComponent, ReviewFormComponent, SkeletonBoxComponent],
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

  buyNow(game: VideoGame): void {
    if (!game.id) return;
    this.cartService.addToCart(game.id, 1).subscribe({
      next: () => {
        this.router.navigate(['/user/checkout']);
      },
      error: () => {
        alert('Failed to add to cart.');
      }
    });
  }
}