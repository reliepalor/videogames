import {
  Observable,
  filter,
  BehaviorSubject,
  combineLatest,
  map,
  Subscription,
  Subject,
  of,
  defer,
  debounceTime,
  startWith,
  shareReplay,
} from 'rxjs'
import { takeUntil, finalize, catchError } from 'rxjs/operators';
import { Component, inject, OnInit, OnDestroy, NgZone, ChangeDetectorRef, ViewEncapsulation, PLATFORM_ID } from '@angular/core'
import { CommonModule } from '@angular/common'
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms'
import { RouterModule, Router, NavigationEnd } from '@angular/router'
import { VideoGameService } from '../../../core/services/videogame.service'
import { CartService } from '../../../core/services/cart.service'
import { CartService as MockCartService } from 'src/app/services/cart.service'
import { ThemeService } from '../../../core/services/theme.service'
import { VideoGame } from '../../../core/models/videogame.model'
import { Game } from 'src/app/models/game.model'
import { environment } from 'src/environments/environment';
import { SkeletonBoxComponent } from 'src/app/shared/skeleton/skeleton-box.component'
import { ScrollToTopComponent } from 'src/app/shared/components/scrollToTop/scroll-to-top.component';

const DEMO_GAMES: VideoGame[] = [
  {
    id: 1,
    title: 'Elden Ring',
    platform: 'PC',
    developer: 'Orbit Pixel Studio',
    publisher: 'Blue Arcade',
    price: 29.99,
    imageUrl: '/assets/games/elden-ring.png',
  },
  {
    id: 2,
    title: 'Kingdoms of Ember',
    platform: 'PlayStation 5',
    developer: 'Iron Lantern Games',
    publisher: 'Northwind Interactive',
    price: 59.99,
    imageUrl: '/assets/games/kingdoms-of-ember.png',
  },
  {
    id: 3,
    title: 'Starline Protocol',
    platform: 'Xbox Series X|S',
    developer: 'Helios Forge',
    publisher: 'Epoch Entertainment',
    price: 49.99,
    imageUrl: '/assets/games/starline-protocol.jpg',
  },
  {
    id: 4,
    title: 'Echoes of Hollow Reef',
    platform: 'Nintendo Switch',
    developer: 'Tidebound Works',
    publisher: 'Maple Finch',
    price: 39.99,
    imageUrl: '/assets/games/echoes-of-hollow-reef.jpg',
  },
 
]


@Component({
  standalone: true,
  selector: 'app-games-list',
  imports: [CommonModule, RouterModule, SkeletonBoxComponent, FormsModule, ScrollToTopComponent
  ],
  templateUrl: './games-list.html',
  styleUrls: ['./games-list.css'],
  encapsulation: ViewEncapsulation.None,
})
export class GamesListComponent implements OnInit, OnDestroy {
  apiUrl = environment.apiUrl;
  private http = inject(HttpClient)
  private platformId = inject(PLATFORM_ID)
  private videoGameService = inject(VideoGameService)
  private cartService = inject(CartService)
  private mockCartService = inject(MockCartService)
  private themeService = inject(ThemeService)
  private router = inject(Router)
  private ngZone = inject(NgZone)
  private cdr = inject(ChangeDetectorRef)

  viewMode: 'table' | 'card' = 'card'
  isDarkMode = false
  isInitialLoading = true
  private isBrowser = isPlatformBrowser(this.platformId)
  useMockData = environment.useMockData

  private mockGames$: Observable<VideoGame[]> = defer(() => {
    if (!this.isBrowser) {
      return of(DEMO_GAMES)
    }

    return this.http.get<VideoGame[]>('/assets/mock/games.json').pipe(
      map(games => (games?.length ? games : DEMO_GAMES)),
      catchError(() => of(DEMO_GAMES))
    )
  }).pipe(shareReplay(1))

  private backendGames$: Observable<VideoGame[] | null> = defer(() => {
    if (!this.isBrowser || this.useMockData) {
      return of(null)
    }

    return this.videoGameService.getAll().pipe(
      map(games => games ?? []),
      catchError(() => of(null)),
      // Allow combineLatest to emit mock data immediately.
      startWith(null)
    )
  }).pipe(shareReplay(1))

  games$: Observable<VideoGame[]> = combineLatest([
    this.mockGames$,
    this.backendGames$,
  ]).pipe(
    map(([mockGames, backendGames]) => {
      // When backend responds successfully (even with empty array), prefer backend data.
      if (backendGames !== null) {
        return backendGames
      }

      return mockGames
    }),
    shareReplay(1)
  )

  private navigationSub?: Subscription;
  private destroy$ = new Subject<void>();

  searchTerm$ = new BehaviorSubject<string>('')
  filtersOpen = false

  filters$ = new BehaviorSubject<{ platform: string; price: string }>({
    platform: 'all',
    price: 'any',
  })

  platforms$ = this.games$.pipe(
    map(games => {
      const platforms = games
        .map(game => game.platform)
        .filter((platform): platform is string => !!platform)
      return Array.from(new Set(platforms)).sort()
    })
  )

  filteredGames$ = combineLatest([
    this.games$, 
    this.searchTerm$.pipe(debounceTime(300)), 
    this.filters$
  ]).pipe(
    map(([games, term, filters]) => {
      const normalizedTerm = term.toLowerCase()
      return games.filter(game => {
        const matchesTerm =
          game.title?.toLowerCase().includes(normalizedTerm) ||
          game.platform?.toLowerCase().includes(normalizedTerm)

        const matchesPlatform =
          filters.platform === 'all' || game.platform === filters.platform

        const matchesPrice = (() => {
          if (filters.price === 'any') return true
          if (filters.price === 'under-500') return game.price < 500
          if (filters.price === '500-1000') return game.price >= 500 && game.price <= 1000
          if (filters.price === 'over-1000') return game.price > 1000
          return true
        })()

        return matchesTerm && matchesPlatform && matchesPrice
      })
    })
  )

  // Pagination properties
  currentPage = 1
  itemsPerPage = 9
  paginatedGames: VideoGame[] = []
  totalPages = 0
  
  // Pagination helpers
  get shouldShowFirstPage(): boolean {
    return this.visiblePages[0] > 1
  }
  
  get shouldShowLastPage(): boolean {
    return this.visiblePages[this.visiblePages.length - 1] < this.totalPages
  }
  
  get shouldShowLeftEllipsis(): boolean {
    return this.visiblePages[0] > 2
  }
  
  get shouldShowRightEllipsis(): boolean {
    return this.visiblePages[this.visiblePages.length - 1] < this.totalPages - 1
  }
  
  get visiblePages(): number[] {
    const delta = 2 // Number of pages to show on each side of current page
    const range: number[] = []
    const rangeWithDots: number[] = []
    
    for (
      let i = Math.max(2, this.currentPage - delta);
      i <= Math.min(this.totalPages - 1, this.currentPage + delta);
      i++
    ) {
      range.push(i)
    }
    
    return range
  }

  showSuccessModal = false
  successMessage = ''
  successTimeout?: any
  isFadingOut = false
  loadingGames = new Set<number>()
  private currentFilteredGames: VideoGame[] = []

  private filteredGamesSub?: Subscription

  ngOnInit(): void {
    const initialSkeletonDelayMs = this.useMockData ? 1000 : 2000;

    setTimeout(() => {
      this.ngZone.run(() => {
        this.isInitialLoading = false;
        this.cdr.detectChanges();
      });
    }, initialSkeletonDelayMs);

    this.themeService.isDarkMode$.pipe(takeUntil(this.destroy$)).subscribe(isDark => {
      this.isDarkMode = isDark;
      this.cdr.detectChanges();
    });

    // Subscribe to filtered games and update pagination
    this.filteredGamesSub = this.filteredGames$.subscribe(games => {
      this.ngZone.run(() => {
        this.currentFilteredGames = games
        this.updatePagination(games)
        this.cdr.detectChanges()
      })
    })

    if (this.isBrowser) {
      const toastStr = localStorage.getItem('toast')
      if (toastStr) {
        const toast = JSON.parse(toastStr)
        this.showSuccessMessage(toast.message)
        localStorage.removeItem('toast')
      }
    }

    this.navigationSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      filter(() => this.router.url === '/games')
    ).subscribe(() => {
      if (this.isBrowser) {
        const toastStr = localStorage.getItem('toast')
        if (toastStr) {
          const toast = JSON.parse(toastStr)
          this.showSuccessMessage(toast.message)
          localStorage.removeItem('toast')
        }
      }
    })
  }

  toggleFilters(): void {
    this.filtersOpen = !this.filtersOpen
  }

  setPlatform(platform: string): void {
    const current = this.filters$.value
    this.filters$.next({ ...current, platform })
    this.currentPage = 1 // Reset to first page when filtering
  }

  setPrice(price: string): void {
    const current = this.filters$.value
    this.filters$.next({ ...current, price })
    this.currentPage = 1 // Reset to first page when filtering
  }

  resetFilters(): void {
    this.filters$.next({ platform: 'all', price: 'any' })
    this.currentPage = 1
  }

  onSearchChange(event: any): void {
    this.searchTerm$.next(event.target.value)
    this.currentPage = 1 // Reset to first page when searching
  }

  onItemsPerPageChange(): void {
    this.currentPage = 1 // Reset to first page when changing items per page
    this.updatePagination(this.currentFilteredGames)
  }

  // Pagination methods
  updatePagination(games: VideoGame[]): void {
    this.totalPages = Math.ceil(games.length / this.itemsPerPage)
    
    // Ensure current page is within bounds
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages
    }
    if (this.currentPage < 1) {
      this.currentPage = 1
    }
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage
    const endIndex = startIndex + this.itemsPerPage
    this.paginatedGames = games.slice(startIndex, endIndex)
    
    this.cdr.detectChanges()
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return
    this.currentPage = page

    this.updatePagination(this.currentFilteredGames)

    if (this.isBrowser) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  getStartIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage
  }

  getEndIndex(): number {
    return Math.min(this.getStartIndex() + this.itemsPerPage, this.paginatedGames.length + this.getStartIndex())
  }

  showSuccessMessage(message: string): void {
    this.ngZone.run(() => {
      this.successMessage = message;
      this.showSuccessModal = true;
      this.isFadingOut = false;

      // FORCE immediate UI paint
      setTimeout(() => {
        this.cdr.detectChanges();
      }, 0);

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
    });
  }

  addToCart(game: VideoGame) {
    const id = game.id;
    if (!id) return;

    if (this.loadingGames.has(id)) return;
    this.loadingGames.add(id);
    this.cdr.detectChanges();

    if (this.useMockData) {
      this.mockCartService.addToCart(game as Game);
      this.loadingGames.delete(id);
      this.showSuccessMessage(`Added ${game.title} to cart!`);
      return;
    }

    this.cartService.addToCart(id, 1).subscribe({
      next: () => {
        this.loadingGames.delete(id);
        this.showSuccessMessage(`Added ${game.title} to cart!`);
      },
      error: () => {
        this.loadingGames.delete(id);
        this.showSuccessMessage(`Failed to add ${game.title}`);
      }
    });
  }

  ngOnDestroy(): void {
    this.navigationSub?.unsubscribe();
    this.filteredGamesSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
