import { Component, Input, OnInit, OnChanges, SimpleChanges, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReviewService } from '../../core/services/review.service';
import { GameReviewsResponse } from '../../core/models/review.model';
import { SkeletonBoxComponent } from '../../shared/skeleton/skeleton-box.component';
import { ThemeService } from '../../core/services/theme.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-game-reviews',
  standalone: true,
  imports: [CommonModule, SkeletonBoxComponent],
  templateUrl: './game-reviews.html'
})
export class GameReviewsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() videoGameId!: number;

  private reviewService = inject(ReviewService);
  private cdr = inject(ChangeDetectorRef);
  private themeService = inject(ThemeService);

  data?: GameReviewsResponse;
  loading = true;
  isDarkMode = false;
  private themeSubscription?: Subscription;

  ngOnInit(): void {
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(
      isDark => {
        this.isDarkMode = isDark;
        this.cdr.markForCheck();
      }
    );
    this.load();
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['videoGameId'] && changes['videoGameId'].currentValue) {
      this.load();
    }
  }

  load(): void {
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

  stars(count: number): number[] {
    return Array(count).fill(0);
  }

  roundRating(rating: number): number {
    return Math.round(rating);
  }
}
