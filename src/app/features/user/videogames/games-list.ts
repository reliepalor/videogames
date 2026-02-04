import { Component, inject, OnInit, OnDestroy, NgZone, ChangeDetectorRef, ViewEncapsulation } from '@angular/core'
import { CommonModule } from '@angular/common'
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
} from 'rxjs'
import { takeUntil, finalize, catchError } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-games-list',
  imports: [CommonModule, RouterModule, SkeletonBoxComponent],
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

  filteredGames$ = combineLatest([this.games$, this.searchTerm$, this.filters$]).pipe(
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

  showSuccessModal = false
  successMessage = ''
  successTimeout?: any
  isFadingOut = false
  loadingGames = new Set<number>()

  toggleFilters(): void {
    this.filtersOpen = !this.filtersOpen
  }

  setPlatform(platform: string): void {
    const current = this.filters$.value
    this.filters$.next({ ...current, platform })
  }

  setPrice(price: string): void {
    const current = this.filters$.value
    this.filters$.next({ ...current, price })
  }

  resetFilters(): void {
    this.filters$.next({ platform: 'all', price: 'any' })
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

  ngOnInit(): void {
    this.themeService.isDarkMode$.pipe(takeUntil(this.destroy$)).subscribe(isDark => {
      this.isDarkMode = isDark;
      this.cdr.detectChanges();
    });

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
    this.destroy$.next();
    this.destroy$.complete();
  }
}
