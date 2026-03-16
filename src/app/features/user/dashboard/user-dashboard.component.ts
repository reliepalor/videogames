import {
  AfterViewInit,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  NgZone,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  BestSeller,
  ReportsService,
} from 'src/app/core/services/bestseller/reports.service';
import { HttpClient } from '@angular/common/http';
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

type DashboardBestSellerItem = {
  id: number;
  type: 'game' | 'digital';
  title: string;
  totalQuantity: number;
  totalRevenue: number;
  imagePath?: string | null;
  price: number;
  percent: number;
  route: string[];
  videoGameId?: number;
  digitalProductId?: number;
};

type DashboardBestSellerSeedItem = Omit<DashboardBestSellerItem, 'percent'>;

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
  private scrollObserver?: IntersectionObserver;
  private observeRetryTimeoutId?: number;
  private featuredScrollEl?: HTMLElement;
  private featuredWheelHandler?: (event: WheelEvent) => void;
  private bestSellerScrollEl?: HTMLElement;
  private bestSellerLeftBtn?: HTMLButtonElement;
  private bestSellerRightBtn?: HTMLButtonElement;
  private bestSellerScrollHandler?: () => void;
  private bestSellerLeftClickHandler?: () => void;
  private bestSellerRightClickHandler?: () => void;
  private allGameRecommendations: RecommendedItem[] = [];
  private allDigitalRecommendations: RecommendedItem[] = [];
  
  apiUrl = environment.apiUrl;
  useMockData = environment.useMockData;
  private readonly featuredSignatureStorageKey = 'dashboard_featured_signature';

  // ============================================
  // SERVICES
  // ============================================
  
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private reportsService = inject(ReportsService);
  private cartService = inject(CartService);
  private orderService = inject(OrderService);
  private router = inject(Router);
  private videoGameService = inject(VideoGameService);
  private digitalProductService = inject(DigitalProductService);
  private ngZone = inject(NgZone);

  // ============================================
  // OBSERVABLES
  // ============================================
  
  bestSellers$: Observable<DashboardBestSellerItem[] | null> =
    (this.useMockData
      ? forkJoin({
          games: this.http.get<VideoGame[]>('/assets/mock/games.json').pipe(
            map(games => games ?? []),
            catchError(() => of([] as VideoGame[]))
          ),
          digitalProducts: this.http.get<DashboardDigitalProduct[]>('/assets/mock/digital-products.json').pipe(
            map(products => (products ?? []).filter(product => product.isActive !== false)),
            catchError(() => of([] as DashboardDigitalProduct[]))
          )
        }).pipe(
          map(({ games, digitalProducts }) => this.mapMockBestSellers(games, digitalProducts)),
          catchError(() => of(null))
        )
      : forkJoin({
          gameSales: this.reportsService.getBestSellers().pipe(
            catchError(() => of([] as BestSeller[]))
          ),
          digitalProducts: this.digitalProductService.getActiveProducts().pipe(
            catchError(() => of([] as DashboardDigitalProduct[]))
          )
        }).pipe(
          map(({ gameSales, digitalProducts }) => this.mapBackendBestSellers(gameSales, digitalProducts)),
          catchError(() => of(null))
        )
    ).pipe(
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

    // Setup featured horizontal scroll
    this.setupFeaturedScroller();
    
    // Update scroll progress
    this.updateScrollProgress();
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Disconnect observer
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
    }
    if (this.observeRetryTimeoutId) {
      clearTimeout(this.observeRetryTimeoutId);
    }

    // Remove carousel event listeners
    this.cleanupFeaturedScroller();
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
      this.initOrRefreshFeaturedScroller();
      this.initOrRefreshBestSellerControls();
      this.forceCriticalSectionsVisible();
    });

    if (this.observeRetryTimeoutId) {
      clearTimeout(this.observeRetryTimeoutId);
    }
    // Some async templates render slightly after the first frame.
    this.observeRetryTimeoutId = window.setTimeout(() => {
      this.observeAnimatedElements();
      this.initOrRefreshFeaturedScroller();
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

  private setupFeaturedScroller(): void {
    this.initOrRefreshFeaturedScroller();
  }

  private initOrRefreshFeaturedScroller(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const featuredScroll = document.getElementById('featured-scroll') as HTMLElement | null;
    if (!featuredScroll) return;

    this.cleanupFeaturedScroller();
    this.featuredScrollEl = featuredScroll;
    this.featuredWheelHandler = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }

      event.preventDefault();
      this.ngZone.runOutsideAngular(() => {
        this.featuredScrollEl?.scrollBy({
          left: event.deltaY * 0.9,
          behavior: 'smooth',
        });
      });
    };

    featuredScroll.addEventListener('wheel', this.featuredWheelHandler, { passive: false });
  }

  private cleanupFeaturedScroller(): void {
    if (this.featuredScrollEl && this.featuredWheelHandler) {
      this.featuredScrollEl.removeEventListener('wheel', this.featuredWheelHandler);
    }

    this.featuredScrollEl = undefined;
    this.featuredWheelHandler = undefined;
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

  private loadRecommendedItems(): void {
    const gamesSource$ = this.useMockData
      ? this.http.get<VideoGame[]>('/assets/mock/games.json').pipe(
          map(games => games ?? []),
          catchError(() => of([] as VideoGame[]))
        )
      : this.videoGameService.getAll().pipe(
          catchError(() => of([] as VideoGame[]))
        );

    const digitalProductsSource$ = this.useMockData
      ? this.http.get<DashboardDigitalProduct[]>('/assets/mock/digital-products.json').pipe(
          map(products => (products ?? []).filter(product => product.isActive !== false)),
          catchError(() => of([] as DashboardDigitalProduct[]))
        )
      : this.digitalProductService.getActiveProducts().pipe(
          catchError(() => of([] as DashboardDigitalProduct[]))
        );

    forkJoin({
      games: gamesSource$,
      digitalProducts: digitalProductsSource$
    }).subscribe({
      next: ({ games, digitalProducts }) => {
        this.allGameRecommendations = (games ?? [])
          .filter(g => !!g.id)
          .map(g => this.mapGameToRecommended(g));

        this.allDigitalRecommendations = (digitalProducts ?? [])
          .map(p => this.mapDigitalToRecommended(p))
          .filter((item): item is RecommendedItem => item !== null);

        this.refreshRecommendedItems();
        this.scheduleObserveAnimations();
      },
      error: () => {
        this.recommendedItems = [];
        this.scheduleObserveAnimations();
      }
    });
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

  onBestSellerAction(item: DashboardBestSellerItem, event?: MouseEvent): void {
    event?.stopPropagation();

    if (item.type === 'game') {
      const game = this.toGameBestSeller(item);
      if (!game) return;
      this.openBuyConfirm(game, event);
      return;
    }

    this.router.navigate(item.route);
  }

  isBestSellerGameBuying(item: DashboardBestSellerItem): boolean {
    return item.type === 'game' && !!item.videoGameId && this.buyingGames.has(item.videoGameId);
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
    const previousSignature = this.getPreviousFeaturedSignature();

    let nextItems: RecommendedItem[] = [];
    let nextSignature = '';

    // Try a few rolls so a refresh is very unlikely to repeat the same exact set.
    for (let attempt = 0; attempt < 5; attempt++) {
      const selectedGames = this.pickRandomItemsWithCycle(this.allGameRecommendations, 4);
      const selectedDigitalProducts = this.pickRandomItemsWithCycle(this.allDigitalRecommendations, 4);

      nextItems = this.buildAlternatingRecommendations(
        selectedGames,
        selectedDigitalProducts
      );

      nextSignature = this.createFeaturedSignature(nextItems);
      if (!previousSignature || nextSignature !== previousSignature) {
        break;
      }
    }

    this.recommendedItems = nextItems;
    this.saveFeaturedSignature(nextSignature);
  }

  private createFeaturedSignature(items: RecommendedItem[]): string {
    return items.map(item => `${item.type}:${item.id}`).join('|');
  }

  private getPreviousFeaturedSignature(): string {
    if (!isPlatformBrowser(this.platformId)) {
      return '';
    }

    return sessionStorage.getItem(this.featuredSignatureStorageKey) ?? '';
  }

  private saveFeaturedSignature(signature: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    sessionStorage.setItem(this.featuredSignatureStorageKey, signature);
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
    if (path.startsWith('/assets/')) return path;
    if (path.startsWith('assets/')) return `/${path}`;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiUrl}${normalized}`;
  }

  private mapMockBestSellers(
    games: VideoGame[],
    digitalProducts: DashboardDigitalProduct[]
  ): DashboardBestSellerItem[] | null {
    if (!games.length && !digitalProducts.length) {
      return null;
    }

    const randomGames = this.shuffleArray(games).slice(0, Math.min(3, games.length));
    const randomDigital = this.shuffleArray(digitalProducts).slice(0, Math.min(3, digitalProducts.length));

    const gameItems: DashboardBestSellerSeedItem[] = randomGames.map(game => {
      const totalQuantity = this.randomInt(8, 120);
      const price = Number(game.price) || 0;
      const totalRevenue = Number((price * totalQuantity).toFixed(2));

      return {
        id: game.id ?? 0,
        type: 'game',
        videoGameId: game.id ?? 0,
        title: game.title,
        totalQuantity,
        totalRevenue,
        imagePath: game.imageUrl,
        price,
        route: ['/games', String(game.id ?? 0)],
      };
    });

    const digitalItems: DashboardBestSellerSeedItem[] = randomDigital.map(product => {
      const totalQuantity = this.randomInt(4, 60);
      const price = Number(product.price) || 0;
      const totalRevenue = Number((price * totalQuantity).toFixed(2));

      return {
        id: product.id ?? 0,
        type: 'digital',
        digitalProductId: product.id ?? 0,
        title: product.name,
        totalQuantity,
        totalRevenue,
        imagePath: product.imagePath,
        price,
        route: ['/digital-products'],
      };
    });

    const withSales = this.shuffleArray([...gameItems, ...digitalItems]);
    const sliced = withSales.slice(0, Math.min(6, withSales.length));

    return this.withBestSellerPercent(sliced);
  }

  private mapBackendBestSellers(
    gameSales: BestSeller[],
    digitalProducts: DashboardDigitalProduct[]
  ): DashboardBestSellerItem[] | null {
    const gameItems: DashboardBestSellerSeedItem[] = (gameSales ?? [])
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 6)
      .map(item => ({
        id: item.videoGameId,
        type: 'game' as const,
        videoGameId: item.videoGameId,
        title: item.title,
        totalQuantity: item.totalQuantity,
        totalRevenue: item.totalRevenue,
        imagePath: item.imagePath,
        price: item.price,
        route: ['/games', String(item.videoGameId)],
      }));

    const digitalItems: DashboardBestSellerSeedItem[] = (digitalProducts ?? [])
      .map(product => {
        const soldEstimate = Math.max((product.stock ?? 0) - (product.availableKeys ?? 0), 1);
        const price = Number(product.price) || 0;
        const revenue = Number((soldEstimate * price).toFixed(2));

        return {
          id: product.id,
          type: 'digital' as const,
          digitalProductId: product.id,
          title: product.name,
          totalQuantity: soldEstimate,
          totalRevenue: revenue,
          imagePath: product.imagePath,
          price,
          route: ['/digital-products'],
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 3);

    const merged = [...gameItems, ...digitalItems]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 6);

    if (!merged.length) {
      return null;
    }

    return this.withBestSellerPercent(merged);
  }

  private withBestSellerPercent(items: DashboardBestSellerSeedItem[]): DashboardBestSellerItem[] {
    const total = items.reduce((sum, item) => sum + item.totalRevenue, 0);
    return items.map(item => ({
      ...item,
      percent: total ? parseFloat(((item.totalRevenue / total) * 100).toFixed(1)) : 0,
    }));
  }

  private toGameBestSeller(item: DashboardBestSellerItem): BestSeller | null {
    if (item.type !== 'game' || !item.videoGameId) {
      return null;
    }

    return {
      videoGameId: item.videoGameId,
      title: item.title,
      totalQuantity: item.totalQuantity,
      totalRevenue: item.totalRevenue,
      imagePath: item.imagePath,
      price: item.price,
    };
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
