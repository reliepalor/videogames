import { Component, inject, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterModule, Router, NavigationEnd } from '@angular/router'
import { VideoGameService } from '../../../core/services/videogame.service'
import { CartService } from '../../../core/services/cart.service'
import { VideoGame } from '../../../core/models/videogame.model'
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
} from 'rxjs'

@Component({
  standalone: true,
  selector: 'app-games-list',
  imports: [CommonModule, RouterModule],
  templateUrl: './games-list.html',
})
export class GamesListComponent implements OnInit, OnDestroy {
  apiUrl = environment.apiUrl;

  private videoGameService = inject(VideoGameService)
  private cartService = inject(CartService)
  private router = inject(Router)
  private ngZone = inject(NgZone)
  private cdr = inject(ChangeDetectorRef)

  viewMode: 'table' | 'card' = 'card'

  private reload$ = new BehaviorSubject<void>(undefined)

  games$: Observable<VideoGame[]> = combineLatest([
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      filter(() => this.router.url === '/games'),
      startWith(null)
    ),
    this.reload$,
  ]).pipe(
    switchMap(() => this.videoGameService.getAll())
  )

  private navigationSub?: Subscription;

  searchTerm$ = new BehaviorSubject<string>('')

  filteredGames$ = combineLatest([this.games$, this.searchTerm$]).pipe(
    map(([games, term]) =>
      games.filter(game =>
        game.title?.toLowerCase().includes(term.toLowerCase()) ||
        game.platform?.toLowerCase().includes(term.toLowerCase())
      )
    )
  )

  showSuccessModal = false
  successMessage = ''
  successTimeout?: any
  isFadingOut = false
  loadingGames = new Set<number>()

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
  }
}
