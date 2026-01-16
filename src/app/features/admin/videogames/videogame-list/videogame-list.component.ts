import { Component, inject, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterModule, Router, NavigationEnd } from '@angular/router'
import { VideoGameService } from '../../../../core/services/videogame.service'
import { VideoGame } from '../../../../core/models/videogame.model'
import { SkeletonBoxComponent } from '../../../../shared/skeleton/skeleton-box.component'
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
  selector: 'app-videogame-list',
  imports: [CommonModule, RouterModule, SkeletonBoxComponent],
  templateUrl: './videogame-list.component.html',
})
export class VideoGameListComponent implements OnInit, OnDestroy {
  apiUrl = environment.apiUrl;

  /* ================= INJECTIONS ================= */
  private videoGameService = inject(VideoGameService)
  private router = inject(Router)
  private ngZone = inject(NgZone)
  private cdr = inject(ChangeDetectorRef)

  /* ================= VIEW MODE ================= */
  viewMode: 'table' | 'card' = 'table'

  toggleView(mode: 'table' | 'card'): void {
    this.viewMode = mode
  }

  /* ================= INIT ================= */
  ngOnInit(): void {
    // Check for toast on component load
    const toastStr = localStorage.getItem('toast')
    if (toastStr) {
      const toast = JSON.parse(toastStr)
      this.showSuccessMessage(toast.message)
      localStorage.removeItem('toast')
    }
    // Subscribe to navigation events for future toasts
    this.navigationSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      filter(() => this.router.url === '/videogames')
    ).subscribe(() => {
      const toastStr = localStorage.getItem('toast')
      if (toastStr) {
        const toast = JSON.parse(toastStr)
        this.showSuccessMessage(toast.message)
        localStorage.removeItem('toast')
      }
    })
  }

  /* ================= RELOAD TRIGGER ================= */
  private reload$ = new BehaviorSubject<void>(undefined)

  /**
   * Reload when:
   * - page loads
   * - navigates to /videogames
   * - after delete
   */
  games$: Observable<VideoGame[]> = combineLatest([
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      filter(() => this.router.url === '/videogames'),
      startWith(null),
    ),
    this.reload$,
  ]).pipe(
    switchMap(() => this.videoGameService.getAll())
  )

  /* ================= SUCCESS MODAL ON NAVIGATION ================= */
  private navigationSub?: Subscription;

  /* ================= SEARCH ================= */
  searchTerm$ = new BehaviorSubject<string>('')

  filteredGames$ = combineLatest([this.games$, this.searchTerm$]).pipe(
    map(([games, term]) =>
      games.filter(game =>
        game.title?.toLowerCase().includes(term.toLowerCase()) ||
        game.platform?.toLowerCase().includes(term.toLowerCase())
      )
    )
  )

  /* ================= SUCCESS MODAL ================= */
  showSuccessModal = false
  successMessage = ''
  successTimeout?: any
  isFadingOut = false

  showSuccessMessage(message: string): void {
    console.log('showSuccessMessage called with:', message)
    this.successMessage = message
    this.isFadingOut = false
    this.showSuccessModal = true

    clearTimeout(this.successTimeout)
    this.successTimeout = setTimeout(() => {
      this.ngZone.run(() => {
        this.isFadingOut = true
        setTimeout(() => {
          this.showSuccessModal = false
          this.isFadingOut = false
          this.cdr.detectChanges()
        }, 300)
      })
    }, 2000) // 2 seconds
  }



  /* ================= DELETE MODAL ================= */
  showDeleteModal = false
  selectedGameId: number | null = null
  isDeleteFadingOut = false

  confirmDelete(id?: number): void {
    if (!id) return
    this.selectedGameId = id
    this.showDeleteModal = true
  }
  closeSuccessModal() {
    this.isFadingOut = true;
    setTimeout(() => {
      this.showSuccessModal = false;
      this.isFadingOut = false;
      this.cdr.detectChanges();
    }, 300);
  }

  cancelDelete() {
    this.isDeleteFadingOut = true;
    setTimeout(() => {
      this.showDeleteModal = false;
      this.isDeleteFadingOut = false;
      this.cdr.detectChanges();
    }, 300);
  }

  openSuccessModal(message: string) {
  this.successMessage = message;
  this.showSuccessModal = true;
  this.isFadingOut = true; // start hidden
  setTimeout(() => this.isFadingOut = false, 50); // trigger enter animation
}



// Same pattern for delete modal (add isFadingOutDelete or reuse a shared variable)

  deleteConfirmed(): void {
    if (!this.selectedGameId) return

    this.videoGameService.delete(this.selectedGameId).subscribe({
      next: () => {
        this.showDeleteModal = false
        this.selectedGameId = null
        this.showSuccessMessage('Video game deleted successfully')
        this.reload$.next()
      },
      error: () => {
        console.error('Delete failed')
      },
    })
  }

  /* ================= EDIT ================= */
  editGame(id?: number): void {

    if (id) {

      this.router.navigate(['/videogames/edit', id])

    }

  }

  ngOnDestroy(): void {

    this.navigationSub?.unsubscribe()

  }

}
