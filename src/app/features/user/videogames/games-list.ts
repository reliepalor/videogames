import { Component, inject, OnInit, OnDestroy, NgZone, ChangeDetectorRef, ViewEncapsulation } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { RouterModule, Router, NavigationEnd } from '@angular/router'
import { VideoGameService } from '../../../core/services/videogame.service'
import { CartService } from '../../../core/services/cart.service'
import { ThemeService } from '../../../core/services/theme.service'
import { VideoGame } from '../../../core/models/videogame.model'
import { SkeletonBoxComponent } from '../../../shared/skeleton/skeleton-box.component'
import { environment } from 'src/environments/environment';
import {
  Observable,
  filter,
  startWith,
  switchMap,
  BehaviorSubject,
  combineLatest,
  map,
  Subscription,
  Subject,
  of,
  debounceTime,
} from 'rxjs'
import { takeUntil, finalize, catchError } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-games-list',
  imports: [CommonModule, RouterModule, SkeletonBoxComponent, FormsModule],
  templateUrl: './games-list.html',
  encapsulation: ViewEncapsulation.None,
})
export class GamesListComponent implements OnInit, OnDestroy {
  apiUrl = environment.apiUrl;
  private videoGameService = inject(VideoGameService)
  private cartService = inject(CartService)
  private themeService = inject(ThemeService)
  private router = inject(Router)
  private ngZone = inject(NgZone)
  private cdr = inject(ChangeDetectorRef)

  viewMode: 'table' | 'card' = 'card'
  isDarkMode = false

  private reload$ = new BehaviorSubject<void>(undefined)

  games$: Observable<VideoGame[]> = this.reload$.pipe(
    startWith(null),
    switchMap(() => this.videoGameService.getAll())
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

  private filteredGamesSub?: Subscription

  ngOnInit(): void {
    this.themeService.isDarkMode$.pipe(takeUntil(this.destroy$)).subscribe(isDark => {
      this.isDarkMode = isDark;
      this.cdr.detectChanges();
    });

    // Subscribe to filtered games and update pagination
    this.filteredGamesSub = this.filteredGames$.subscribe(games => {
      this.updatePagination(games)
    })

    const toastStr = localStorage.getItem('toast')
    if (toastStr) {
      const toast = JSON.parse(toastStr)
      this.showSuccessMessage(toast.message)
      localStorage.removeItem('toast')
    }

    this.navigationSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      filter(() => this.router.url === '/games')
    ).subscribe(() => {
      const toastStr = localStorage.getItem('toast')
      if (toastStr) {
        const toast = JSON.parse(toastStr)
        this.showSuccessMessage(toast.message)
        localStorage.removeItem('toast')
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
    this.filteredGames$.pipe(takeUntil(this.destroy$)).subscribe(games => {
      this.updatePagination(games)
    })
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
    
    // Scroll to top smoothly when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return
    this.currentPage = page
    
    this.filteredGames$.pipe(takeUntil(this.destroy$)).subscribe(games => {
      this.updatePagination(games)
    })
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