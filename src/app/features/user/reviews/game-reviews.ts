import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  inject,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';

import { ReviewService, ReviewEligibility } from '../../../core/services/review.service';
import { GameReviewsResponse } from '../../../core/models/review.model';
import { SkeletonBoxComponent } from '../../../shared/skeleton/skeleton-box.component';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-game-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonBoxComponent],
  templateUrl: './game-review.html',
  styles: [`
    .toast-enter { animation: toast-enter 0.3s ease-out; }
    .toast-leave { animation: toast-leave 0.3s ease-in; }

    @keyframes toast-enter {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes toast-leave {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-10px); }
    }
  `]
})
export class GameReviewsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() videoGameId!: number;

  private reviewService = inject(ReviewService);
  private themeService = inject(ThemeService);
  private cdr = inject(ChangeDetectorRef);

  data?: GameReviewsResponse;
  loading = true;

  // theme
  isDarkMode = false;
  private themeSubscription?: Subscription;

  // review form
  rating = 5;
  comment = '';
  submitting = false;
  eligibleOrderId?: number;

  // success + error
  showSuccessModal = false;
  successMessage = '';
  isFadingOut = false;
  successTimeout?: any;
  error = '';

  ngOnInit(): void {
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
      this.cdr.markForCheck();
    });

    this.loadReviews();
    this.loadEligibility();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['videoGameId']?.currentValue) {
      this.loadReviews();
      this.loadEligibility();
    }
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
  }

  /* ===============================
     LOAD REVIEWS
  =============================== */

  loadReviews(): void {
    if (!this.videoGameId) return;

    this.loading = true;

    this.reviewService.getReviewsByGame(this.videoGameId).subscribe({
      next: res => {
        this.data = res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  /* ===============================
     ELIGIBILITY
  =============================== */

  loadEligibility(): void {
    this.reviewService.getEligibility().subscribe({
      next: (res: ReviewEligibility[]) => {
        const eligible = res.find(
          e => e.videoGameId === this.videoGameId && !e.hasReviewed
        );
        this.eligibleOrderId = eligible?.orderId;
      }
    });
  }

  /* ===============================
     SUBMIT REVIEW
  =============================== */

  submit(): void {
    if (!this.eligibleOrderId) {
      this.error = 'You already reviewed this game or have no approved purchase.';
      return;
    }

    if (!this.comment.trim()) {
      this.error = 'Please enter a comment';
      return;
    }

    this.submitting = true;

    this.reviewService.createReview({
      videoGameId: this.videoGameId,
      orderId: this.eligibleOrderId,
      rating: this.rating,
      comment: this.comment.trim()
    }).subscribe({
      next: () => {
        this.showSuccessMessage('Review submitted successfully!');
        this.comment = '';
        this.rating = 5;
        this.submitting = false;
        this.loadReviews();
        this.loadEligibility();
      },
      error: (err: HttpErrorResponse) => {
        this.error = err.error || 'Failed to submit review';
        this.submitting = false;
      }
    });
  }

  /* ===============================
     UI HELPERS
  =============================== */

  stars(count: number): number[] {
    return Array(count).fill(0);
  }

  roundRating(rating: number): number {
    return Math.round(rating);
  }

  closeErrorModal(): void {
    this.error = '';
  }

  showSuccessMessage(message: string): void {
    this.successMessage = message;
    this.showSuccessModal = true;
    this.isFadingOut = false;

    if (this.successTimeout) clearTimeout(this.successTimeout);

    this.successTimeout = setTimeout(() => {
      this.isFadingOut = true;

      setTimeout(() => {
        this.showSuccessModal = false;
        this.isFadingOut = false;
      }, 300);
    }, 1800);
  }
}