import { Component, Input, inject, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ReviewService, ReviewEligibility } from '../../core/services/review.service';
import { ThemeService } from '../../core/services/theme.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './review-form.html',
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    .animate-scale-in {
      animation: scaleIn 0.3s ease-out;
    }
    .animate-bounce-in {
      animation: bounceIn 0.6s ease-out;
    }
    .toast-enter {
      animation: toast-enter 0.3s ease-out;
    }
    .toast-leave {
      animation: toast-leave 0.3s ease-in;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleIn {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    @keyframes bounceIn {
      0% { transform: scale(0.3); opacity: 0; }
      50% { transform: scale(1.05); }
      70% { transform: scale(0.9); }
      100% { transform: scale(1); opacity: 1; }
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
export class ReviewFormComponent implements OnInit, OnDestroy {
  @Input() videoGameId!: number;
  @Output() reviewSubmitted = new EventEmitter<void>();

  private reviewService = inject(ReviewService);
  private themeService = inject(ThemeService);
  private cdr = inject(ChangeDetectorRef);

  rating = 5;
  comment = '';
  submitting = false;
  showSuccessModal = false;
  successMessage = '';
  successTimeout?: any;
  isFadingOut = false;
  error = '';
  isDarkMode = false;
  private themeSubscription?: Subscription;

  eligibleOrderId?: number;

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

  closeErrorModal(): void {
    this.error = '';
  }

  ngOnInit(): void {
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(
      isDark => {
        this.isDarkMode = isDark;
        this.cdr.markForCheck();
      }
    );
    this.loadEligibility();
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
  }

  loadEligibility(): void {
    this.reviewService.getEligibility().subscribe({
      next: (res: ReviewEligibility[]) => {
        const eligible = res.find(
          e => e.videoGameId === this.videoGameId && !e.hasReviewed
        );
        this.eligibleOrderId = eligible?.orderId;
      },
      error: (e: HttpErrorResponse) => {
        // Handle error if needed
      }
    });
  }

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
        this.reviewSubmitted.emit();
        this.loadEligibility(); // refresh state
      },
      error: (err: HttpErrorResponse) => {
        this.error = err.error || 'Failed to submit review';
        this.submitting = false;
      }
    });
  }
}
