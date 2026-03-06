import {
  AfterViewInit,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  BestSeller,
  ReportsService,
} from 'src/app/core/services/bestseller/reports.service';
import { CartService } from 'src/app/core/services/cart.service';
import { OrderService } from 'src/app/core/services/order.service';
import { Observable, catchError, forkJoin, map, of, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { VideoGameService } from 'src/app/core/services/videogame.service';
import { DigitalProductService } from 'src/app/core/services/digital-products/digital-product.service';
import { VideoGame } from 'src/app/core/models/videogame.model';
import { DigitalProduct } from 'src/app/core/models/digital-products/digital-product.model';
import { ScrollToTopComponent } from 'src/app/shared/components/scrollToTop/scroll-to-top.component';

type RecommendedItem = {
  id: number;
  type: 'game' | 'digital';
  title: string;
  subtitle: string;
  price: number;
  imageUrl: string;
  route: string[];
};

type DashboardDigitalProduct = DigitalProduct & {
  digitalProductId?: number;
};

@Component({
  standalone: true,
  selector: 'app-user-dashboard',
  imports: [CommonModule, RouterLink, ScrollToTopComponent],
  templateUrl: './user-dashboard.html',
  styleUrls: ['./user-dashboard.css'],
})
export class UserDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  
  // ============================================
  // STATE
  // ============================================
  
  buyingGames = new Set<number>();
  showBuyConfirmModal = false;
  isBuyConfirmClosing = false;
  pendingBuyGame: BestSeller | null = null;
  
  recommendedItems: RecommendedItem[] = [];
  activeRecommendedIndex = 0;
  recommendedTrackTransition = 'transform 900ms cubic-bezier(0.22, 0.61, 0.36, 1)';
  
  private isRecommendedHovered = false;
  private recommendedIntervalId?: number;
  private recommendedRefreshIntervalId?: number;
  private scrollObserver?: IntersectionObserver;
  private observeRetryTimeoutId?: number;
  private bestSellerScrollEl?: HTMLElement;
  private bestSellerLeftBtn?: HTMLButtonElement;
  private bestSellerRightBtn?: HTMLButtonElement;
  private bestSellerScrollHandler?: () => void;
  private bestSellerLeftClickHandler?: () => void;
  private bestSellerRightClickHandler?: () => void;
  private allGameRecommendations: RecommendedItem[] = [];
  private allDigitalRecommendations: RecommendedItem[] = [];
  
  apiUrl = environment.apiUrl;

  // ============================================
  // SERVICES
  // ============================================
  
  private platformId = inject(PLATFORM_ID);
  private reportsService = inject(ReportsService);
  private cartService = inject(CartService);
  private orderService = inject(OrderService);
  private router = inject(Router);
  private videoGameService = inject(VideoGameService);
  private digitalProductService = inject(DigitalProductService);

  // ============================================
  // OBSERVABLES
  // ============================================
  
  bestSellers$: Observable<Array<BestSeller & { percent: number }> | null> =
    this.reportsService.getBestSellers().pipe(
      map((sales) => {
        if (!sales || sales.length === 0) return null;
        const total = sales.reduce((sum, item) => sum + item.totalRevenue, 0);
        return [...sales]
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, 6)
          .map((item) => ({
            ...item,
            percent: total ? parseFloat(((item.totalRevenue / total) * 100).toFixed(1)) : 0,
          }));
      }),
      catchError(() => of(null)),
      tap(() => this.scheduleObserveAnimations())
    );

  // ============================================
  // LIFECYCLE HOOKS
  // ============================================
  
  ngOnInit(): void {
    this.loadRecommendedItems();
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Setup scroll animations
    this.setupScrollAnimations();
    
    // Setup carousel controls
    this.setupCarouselControls();
    
    // Update scroll progress
    this.updateScrollProgress();
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Clear intervals
    if (this.recommendedIntervalId) {
      clearInterval(this.recommendedIntervalId);
    }
    if (this.recommendedRefreshIntervalId) {
      clearInterval(this.recommendedRefreshIntervalId);
    }

    // Disconnect observer
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
    }
    if (this.observeRetryTimeoutId) {
      clearTimeout(this.observeRetryTimeoutId);
    }

    // Remove carousel event listeners
    this.cleanupBestSellerControls();
  }

  // ============================================
  // SCROLL ANIMATIONS
  // ============================================
  
  private setupScrollAnimations(): void {
    const observerOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: '0px 0px -100px 0px',
      threshold: 0.1
    };

    this.scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    this.observeAnimatedElements();
  }

  private observeAnimatedElements(): void {
    if (!this.scrollObserver) return;

    const animatedElements = document.querySelectorAll('.scroll-fade-in, .product-card');
    animatedElements.forEach((el) => {
      // Skip already-revealed elements and avoid duplicate observe calls.
      if (!el.classList.contains('visible')) {
        this.scrollObserver!.observe(el);
      }
    });
  }

  private scheduleObserveAnimations(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    requestAnimationFrame(() => {
      this.observeAnimatedElements();
      this.initOrRefreshBestSellerControls();
      this.forceCriticalSectionsVisible();
    });

    if (this.observeRetryTimeoutId) {
      clearTimeout(this.observeRetryTimeoutId);
    }
    // Some async templates render slightly after the first frame.
    this.observeRetryTimeoutId = window.setTimeout(() => {
      this.observeAnimatedElements();
      this.initOrRefreshBestSellerControls();
      this.forceCriticalSectionsVisible();
    }, 80);
  }

  private forceCriticalSectionsVisible(): void {
    const criticalBlocks = document.querySelectorAll(
      '#featured .scroll-fade-in, #products .scroll-fade-in'
    );
    criticalBlocks.forEach((el) => el.classList.add('visible'));
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.updateScrollProgress();
    }
  }

  private updateScrollProgress(): void {
    const progressBar = document.getElementById('scroll-progress');
    if (!progressBar) return;

    const maxScroll = document.body.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    progressBar.style.width = `${progress * 100}%`;
  }

  // ============================================
  // CAROUSEL CONTROLS
  // ============================================
  
  private setupCarouselControls(): void {
    this.initOrRefreshBestSellerControls();
  }

  private initOrRefreshBestSellerControls(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const productsScroll = document.getElementById('products-scroll') as HTMLElement | null;
    const scrollLeftBtn = document.getElementById('products-scroll-left') as HTMLButtonElement | null;
    const scrollRightBtn = document.getElementById('products-scroll-right') as HTMLButtonElement | null;
    if (!productsScroll || !scrollLeftBtn || !scrollRightBtn) return;

    this.cleanupBestSellerControls();

    this.bestSellerScrollEl = productsScroll;
    this.bestSellerLeftBtn = scrollLeftBtn;
    this.bestSellerRightBtn = scrollRightBtn;

    const scrollStep = Math.max(260, Math.floor(productsScroll.clientWidth * 0.82));
    this.bestSellerLeftClickHandler = () => {
      productsScroll.scrollBy({ left: -scrollStep, behavior: 'smooth' });
    };
    this.bestSellerRightClickHandler = () => {
      productsScroll.scrollBy({ left: scrollStep, behavior: 'smooth' });
    };
    this.bestSellerScrollHandler = () => {
      const atStart = productsScroll.scrollLeft <= 1;
      const atEnd = productsScroll.scrollLeft + productsScroll.clientWidth >= productsScroll.scrollWidth - 1;
      scrollLeftBtn.disabled = atStart;
      scrollRightBtn.disabled = atEnd;
    };

    scrollLeftBtn.addEventListener('click', this.bestSellerLeftClickHandler);
    scrollRightBtn.addEventListener('click', this.bestSellerRightClickHandler);
    productsScroll.addEventListener('scroll', this.bestSellerScrollHandler);

    requestAnimationFrame(() => {
      this.bestSellerScrollHandler?.();
    });
  }

  private cleanupBestSellerControls(): void {
    if (this.bestSellerLeftBtn && this.bestSellerLeftClickHandler) {
      this.bestSellerLeftBtn.removeEventListener('click', this.bestSellerLeftClickHandler);
    }
    if (this.bestSellerRightBtn && this.bestSellerRightClickHandler) {
      this.bestSellerRightBtn.removeEventListener('click', this.bestSellerRightClickHandler);
    }
    if (this.bestSellerScrollEl && this.bestSellerScrollHandler) {
      this.bestSellerScrollEl.removeEventListener('scroll', this.bestSellerScrollHandler);
    }

    this.bestSellerScrollEl = undefined;
    this.bestSellerLeftBtn = undefined;
    this.bestSellerRightBtn = undefined;
    this.bestSellerScrollHandler = undefined;
    this.bestSellerLeftClickHandler = undefined;
    this.bestSellerRightClickHandler = undefined;
  }

  // ============================================
  // FEATURED SLIDER
  // ============================================
  
  get recommendedLoopItems(): RecommendedItem[] {
    if (!this.recommendedItems.length) return [];
    return [...this.recommendedItems, ...this.recommendedItems];
  }

  get recommendedTrackTransform(): string {
    return `translateX(-${this.activeRecommendedIndex * 100}%)`;
  }

  onRecommendedMouseEnter(): void {
    this.isRecommendedHovered = true;
  }

  onRecommendedMouseLeave(): void {
    this.isRecommendedHovered = false;
  }

  onRecommendedPrev(): void {
    const total = this.recommendedItems.length;
    if (total <= 1) return;

    if (this.activeRecommendedIndex === 0) {
      this.recommendedTrackTransition = 'none';
      this.activeRecommendedIndex = total;
      requestAnimationFrame(() => {
        this.recommendedTrackTransition = 'transform 900ms cubic-bezier(0.22, 0.61, 0.36, 1)';
        this.activeRecommendedIndex = total - 1;
      });
      return;
    }

    this.activeRecommendedIndex -= 1;
  }

  onRecommendedNext(): void {
    if (this.recommendedItems.length <= 1) return;
    this.activeRecommendedIndex += 1;
  }

  onRecommendedTransitionEnd(): void {
    const total = this.recommendedItems.length;
    if (!total) return;

    if (this.activeRecommendedIndex >= total) {
      this.recommendedTrackTransition = 'none';
      this.activeRecommendedIndex = 0;
      requestAnimationFrame(() => {
        this.recommendedTrackTransition = 'transform 900ms cubic-bezier(0.22, 0.61, 0.36, 1)';
      });
    }
  }

  private loadRecommendedItems(): void {
    forkJoin({
      games: this.videoGameService.getAll().pipe(
        catchError(() => of([] as VideoGame[]))
      ),
      digitalProducts: this.digitalProductService.getActiveProducts().pipe(
        catchError(() => of([] as DashboardDigitalProduct[]))
      )
    }).subscribe({
      next: ({ games, digitalProducts }) => {
        this.allGameRecommendations = (games ?? [])
          .filter(g => !!g.id)
          .map(g => this.mapGameToRecommended(g));

        this.allDigitalRecommendations = (digitalProducts ?? [])
          .map(p => this.mapDigitalToRecommended(p))
          .filter((item): item is RecommendedItem => item !== null);

        this.refreshRecommendedItems();
        this.startRecommendedAutoCycle();
        this.startRecommendedRefreshCycle();
        this.scheduleObserveAnimations();
      },
      error: () => {
        this.recommendedItems = [];
        this.scheduleObserveAnimations();
      }
    });
  }

  private startRecommendedAutoCycle(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.recommendedIntervalId) {
      clearInterval(this.recommendedIntervalId);
    }
    if (this.recommendedItems.length <= 1) return;

    this.recommendedIntervalId = window.setInterval(() => {
      if (this.isRecommendedHovered) return;
      this.activeRecommendedIndex += 1;
    }, 3800);
  }

  private startRecommendedRefreshCycle(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.recommendedRefreshIntervalId) {
      clearInterval(this.recommendedRefreshIntervalId);
    }

    this.recommendedRefreshIntervalId = window.setInterval(() => {
      if (this.isRecommendedHovered) return;
      this.refreshRecommendedItems();
      this.startRecommendedAutoCycle();
    }, 16000);
  }

  // ============================================
  // BUY MODAL
  // ============================================
  
  openBuyConfirm(game: BestSeller, event?: MouseEvent): void {
    event?.stopPropagation();
    const gameId = game.videoGameId;
    if (!gameId || this.buyingGames.has(gameId)) return;

    this.pendingBuyGame = game;
    this.isBuyConfirmClosing = false;
    this.showBuyConfirmModal = true;
  }

  closeBuyConfirm(): void {
    this.isBuyConfirmClosing = true;
    setTimeout(() => {
      this.showBuyConfirmModal = false;
      this.isBuyConfirmClosing = false;
      this.pendingBuyGame = null;
    }, 180);
  }

  confirmBuyNow(): void {
    if (!this.pendingBuyGame) return;
    const game = this.pendingBuyGame;
    this.closeBuyConfirm();
    this.buyNow(game);
  }

  buyNow(game: BestSeller, event?: MouseEvent): void {
    event?.stopPropagation();

    const gameId = game.videoGameId;
    if (!gameId || this.buyingGames.has(gameId)) return;

    this.buyingGames.add(gameId);

    this.cartService.addToCart(gameId, 1).subscribe({
      next: () => {
        this.cartService.getCart().subscribe({
          next: (cart) => {
            const latestCartItem = [...(cart.items ?? [])]
              .filter(i => i.videoGameId === gameId)
              .sort((a, b) => b.cartItemId - a.cartItemId)[0];

            const cartItemId = latestCartItem?.cartItemId;
            if (!cartItemId) {
              this.buyingGames.delete(gameId);
              return;
            }

            this.orderService.checkout([cartItemId]).subscribe({
              next: () => {
                this.buyingGames.delete(gameId);
                this.router.navigate(['/orders']);
              },
              error: () => {
                this.buyingGames.delete(gameId);
              }
            });
          },
          error: () => {
            this.buyingGames.delete(gameId);
          }
        });
      },
      error: () => {
        this.buyingGames.delete(gameId);
      }
    });
  }

  // ============================================
  // UTILITY METHODS
  // ============================================
  
  private mapGameToRecommended(game: VideoGame): RecommendedItem {
    return {
      id: game.id ?? 0,
      type: 'game',
      title: game.title,
      subtitle: game.platform || 'Video Game',
      price: game.price,
      imageUrl: this.getRecommendedImageUrl(game.imageUrl),
      route: ['/games', String(game.id)]
    };
  }

  private mapDigitalToRecommended(product: DashboardDigitalProduct): RecommendedItem | null {
    const productId = this.getDigitalProductId(product);
    if (!productId) return null;

    return {
      id: productId,
      type: 'digital',
      title: product.name,
      subtitle: product.brand || product.platform || 'Digital Product',
      price: product.price,
      imageUrl: this.getRecommendedImageUrl(product.imagePath),
      route: ['/digital-products']
    };
  }

  private buildAlternatingRecommendations(
    games: RecommendedItem[],
    digitalProducts: RecommendedItem[]
  ): RecommendedItem[] {
    const sequence: RecommendedItem[] = [];
    const maxLen = Math.max(games.length, digitalProducts.length);

    for (let i = 0; i < maxLen; i++) {
      if (games[i]) {
        sequence.push(games[i]);
      }
      if (digitalProducts[i]) {
        sequence.push(digitalProducts[i]);
      }
    }

    return sequence;
  }

  private refreshRecommendedItems(): void {
    const selectedGames = this.pickRandomItemsWithCycle(this.allGameRecommendations, 4);
    const selectedDigitalProducts = this.pickRandomItemsWithCycle(this.allDigitalRecommendations, 4);

    this.recommendedItems = this.buildAlternatingRecommendations(
      selectedGames,
      selectedDigitalProducts
    );
    this.activeRecommendedIndex = 0;
  }

  private pickRandomItemsWithCycle<T>(items: T[], count: number): T[] {
    if (!items.length) return [];

    const shuffled = this.shuffleArray(items);
    if (shuffled.length >= count) {
      return shuffled.slice(0, count);
    }

    const cycled: T[] = [];
    for (let i = 0; i < count; i++) {
      cycled.push(shuffled[i % shuffled.length]);
    }
    return cycled;
  }

  private getDigitalProductId(product: DashboardDigitalProduct): number | null {
    const fallbackId = (product as unknown as { digitalProductId?: number }).digitalProductId;
    const id = product.id ?? fallbackId ?? 0;
    return id > 0 ? id : null;
  }

  private getRecommendedImageUrl(imagePath?: string | null): string {
    const path = imagePath?.trim();
    if (!path) return '/assets/images/games.png';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/assets/')) return path;
    if (path.startsWith('assets/')) return `/${path}`;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiUrl}${normalized}`;
  }

  onRecommendedImageError(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (!image) return;
    if (image.src.endsWith('/assets/images/games.png')) return;
    image.src = '/assets/images/games.png';
  }

  private shuffleArray<T>(items: T[]): T[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getBestSellerImageUrl(imagePath?: string | null): string | null {
    const path = imagePath?.trim();
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiUrl}${normalized}`;
  }
}
