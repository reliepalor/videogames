import { Component, Input, OnInit, inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReviewService } from '../../core/services/review.service';
import { GameReviewsResponse } from '../../core/models/review.model';
import { SkeletonBoxComponent } from '../../shared/skeleton/skeleton-box.component';

@Component({
  selector: 'app-game-reviews',
  standalone: true,
  imports: [CommonModule, SkeletonBoxComponent],
  templateUrl: './game-reviews.html'
})
export class GameReviewsComponent implements OnInit {
  @Input() videoGameId!: number;

  private reviewService = inject(ReviewService);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  data?: GameReviewsResponse;
  loading = true;

  ngOnInit(): void {
    this.reviewService.getReviewsByGame(this.videoGameId).subscribe({
      next: res => {
        this.ngZone.run(() => {
          this.data = res;
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  stars(count: number): number[] {
    return Array(count).fill(0);
  }

  roundRating(rating: number): number {
    return Math.round(rating);
  }
}
