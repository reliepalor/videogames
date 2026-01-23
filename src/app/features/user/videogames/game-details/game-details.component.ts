import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { VideoGameService } from '../../../../core/services/videogame.service';
import { AuthService } from '../../../../core/services/auth.service';
import { VideoGame } from '../../../../core/models/videogame.model';
import { GameReviewsComponent } from '../../../reviews/game-reviews';
import { ReviewFormComponent } from '../../../reviews/review-form';
import { SkeletonBoxComponent } from '../../../../shared/skeleton/skeleton-box.component';
import { OrderService } from '../../../../core/services/order.service';

@Component({
  selector: 'app-game-details',
  standalone: true,
  imports: [CommonModule, GameReviewsComponent, ReviewFormComponent, SkeletonBoxComponent],
  templateUrl: './game-details.component.html'
})
export class GameDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private videoGameService = inject(VideoGameService);
  private authService = inject(AuthService);
  private orderService = inject(OrderService);

  game?: VideoGame;
  loading = true;
  gameId!: number;
  showReviews = false;
  hasApprovedPurchase = false;

  ngOnInit(): void {
    this.gameId = +this.route.snapshot.params['id'];
    this.showReviews = this.route.snapshot.url.some(segment => segment.path === 'reviews');
    this.videoGameService.getById(this.gameId).subscribe({
      next: game => {
        this.game = game;
        this.loading = false;
      },
      error: () => this.loading = false
    });
    if (this.isLoggedIn) {
      this.checkApprovedPurchase();
    }
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  private checkApprovedPurchase(): void {
    this.orderService.getMyOrders().subscribe({
      next: orders => {
        this.hasApprovedPurchase = orders.some(o => o.status == 1 && o.items.some(i => i.videoGameId == this.gameId));
      },
      error: () => {
        this.hasApprovedPurchase = false;
      }
    });
  }
}