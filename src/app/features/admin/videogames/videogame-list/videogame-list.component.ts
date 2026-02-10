import { Component, inject, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterModule, Router, NavigationEnd } from '@angular/router'
import { VideoGameService } from '../../../../core/services/videogame.service'
import { VideoGame } from '../../../../core/models/videogame.model'
import { SkeletonBoxComponent } from '../../../../shared/skeleton/skeleton-box.component'
import { environment } from 'src/environments/environment';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'

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
  imports: [CommonModule, RouterModule, SkeletonBoxComponent, ReactiveFormsModule],
  templateUrl: './videogame-list.component.html',
})
export class VideoGameListComponent implements OnInit, OnDestroy {
  apiUrl = environment.apiUrl;

  /* ================= INJECTIONS ================= */
  private videoGameService = inject(VideoGameService)
  private router = inject(Router)
  private ngZone = inject(NgZone)
  private cdr = inject(ChangeDetectorRef)
  private fb = inject(FormBuilder)

  /* ================= VIEW MODE ================= */
  viewMode: 'table' | 'card' = 'table'

  toggleView(mode: 'table' | 'card'): void {
    this.viewMode = mode
  }

  /* ================= INIT ================= */
  ngOnInit(): void {
    this.initEditForm()
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
  isDeleteClosing = false

  confirmDelete(id?: number): void {
    if (!id) return
    this.selectedGameId = id
    this.showDeleteModal = true
    this.isDeleteClosing = false
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
    this.isDeleteClosing = true;
    setTimeout(() => {
      this.showDeleteModal = false;
      this.isDeleteClosing = false;
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

  /* ================= EDIT MODAL ================= */
  showEditModal = false
  isEditClosing = false
  editLoading = false
  editGameId: number | null = null
  editForm!: FormGroup
  selectedFile?: File
  previewUrl?: string

  platformOptions = [
    'PC',
    'PlayStation 5',
    'PlayStation 4',
    'Xbox Series X|S',
    'Xbox One',
    'Nintendo Switch',
    'Mobile',
    'VR',
  ]

  private initEditForm(): void {
    this.editForm = this.fb.group({
      title: ['', Validators.required],
      platform: [''],
      developer: [''],
      publisher: [''],
      price: [0, [Validators.min(0)]],
      imageUrl: [''],
    })
  }

  openEditModal(id?: number): void {
    if (!id) return

    this.editGameId = id
    this.showEditModal = true
    this.isEditClosing = false
    this.editLoading = true
    this.selectedFile = undefined
    this.previewUrl = undefined

    this.videoGameService.getById(id).subscribe({
      next: (game) => {
        this.editForm.patchValue({
          ...game,
          imageUrl: game.imageUrl ?? null,
        })
        this.editLoading = false
      },
      error: () => {
        this.editLoading = false
        this.closeEditModal()
      },
    })
  }

  openCreateModal(): void {
    this.editGameId = null
    this.showEditModal = true
    this.isEditClosing = false
    this.editLoading = false
    this.selectedFile = undefined
    this.previewUrl = undefined
    this.editForm.reset({
      title: '',
      platform: '',
      developer: '',
      publisher: '',
      price: 0,
      imageUrl: '',
    })
  }

  closeEditModal(): void {
    this.isEditClosing = true
    setTimeout(() => {
      this.showEditModal = false
      this.isEditClosing = false
      this.editGameId = null
      this.editLoading = false
      this.selectedFile = undefined
      this.previewUrl = undefined
      this.editForm.reset({
        title: '',
        platform: '',
        developer: '',
        publisher: '',
        price: 0,
        imageUrl: '',
      })
      this.cdr.detectChanges()
    }, 200)
  }

  onEditImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement
    if (!input.files?.length) return

    this.selectedFile = input.files[0]
    const reader = new FileReader()
    reader.onload = () => this.previewUrl = reader.result as string
    reader.readAsDataURL(this.selectedFile)
  }

  submitEdit(): void {
    if (this.editForm.invalid) return

    const formValues = this.editForm.getRawValue()
    const formData = new FormData()
    formData.append('Title', formValues.title)
    formData.append('Platform', formValues.platform ?? '')
    formData.append('Developer', formValues.developer ?? '')
    formData.append('Publisher', formValues.publisher ?? '')
    formData.append('Price', formValues.price.toString())

    if (this.selectedFile) {
      formData.append('Image', this.selectedFile, this.selectedFile.name)
    }

    this.editLoading = true
    const operation$ = this.editGameId
      ? this.videoGameService.update(this.editGameId, formData)
      : this.videoGameService.create(formData)

    operation$.subscribe({
      next: () => {
        this.editLoading = false
        this.closeEditModal()
        const message = this.editGameId
          ? 'Video game updated successfully'
          : 'Video game created successfully'
        this.showSuccessMessage(message)
        this.reload$.next()
      },
      error: () => {
        this.editLoading = false
        console.error('Update failed')
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
