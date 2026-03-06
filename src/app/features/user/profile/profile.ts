import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { combineLatest, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { UserService } from '../../../core/services/user.service';
import { UserOrdersService, UserOrder } from '../../../core/services/user-orders.service';
import { DigitalOrderService } from '../../../core/services/digital-products/digital-order.service';
import { ReviewEligibility, ReviewService } from '../../../core/services/review.service';
import { DigitalOrder } from '../../../core/models/digital-orders/digital-order.model';
import { VideoGameService } from '../../../core/services/videogame.service';
import { VideoGame } from '../../../core/models/videogame.model';
import { Profile, ProfileRecentOrder } from '../../../core/models/user/UserProfile.model';

@Component({
  standalone: true,
  selector: 'app-profile',
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.html'
})
export class ProfileComponent implements OnInit {
  private userService = inject(UserService);
  private userOrdersService = inject(UserOrdersService);
  private digitalOrderService = inject(DigitalOrderService);
  private reviewService = inject(ReviewService);
  private videoGameService = inject(VideoGameService);

  user$!: Observable<Profile>;
  showAllOrdersModal = false;

  ngOnInit(): void {
    this.user$ = combineLatest({
      profile: this.userService.Profile,
      gameOrders: this.userOrdersService.getMyOrders().pipe(
        catchError(() => of([] as UserOrder[]))
      ),
      digitalOrders: this.digitalOrderService.getMyOrders().pipe(
        map(orders => orders as DigitalOrder[]),
        catchError(() => of([] as DigitalOrder[]))
      ),
      eligibility: this.reviewService.getEligibility().pipe(
        catchError(() => of([] as ReviewEligibility[]))
      ),
      games: this.videoGameService.getAll().pipe(
        catchError(() => of([] as VideoGame[]))
      )
    }).pipe(
      map(({ profile, gameOrders, digitalOrders, eligibility, games }) => {
        const approvedGameOrders = gameOrders.filter(order => order.status === 1);
        const approvedDigitalOrders = digitalOrders.filter(order =>
          String(order.status || '').toLowerCase() === 'approved'
        );

        const gameSpent = approvedGameOrders.reduce(
          (sum, order) => sum + Number(order.totalPrice || 0),
          0
        );
        const digitalSpent = approvedDigitalOrders.reduce(
          (sum, order) => sum + Number(order.totalPrice || 0),
          0
        );

        const gameIdByTitle = new Map(
          games
            .filter(game => !!game.title)
            .map(game => [
              game.title.trim().toLowerCase(),
              { id: game.id, imageUrl: game.imageUrl }
            ] as const)
        );

        const reviewedGames = eligibility
          .filter(item => item.hasReviewed)
          .map(item => item.gameTitle?.trim())
          .filter((title): title is string => !!title)
          .filter((title, index, arr) => arr.indexOf(title) === index)
          .map(title => ({
            title,
            gameId: gameIdByTitle.get(title.toLowerCase())?.id,
            imageUrl: gameIdByTitle.get(title.toLowerCase())?.imageUrl
          }));

        const recentGameOrders: ProfileRecentOrder[] = approvedGameOrders.map(order => ({
          id: order.id,
          type: 'game',
          title: order.items.map(item => item.gameTitle).filter(Boolean).join(', ') || 'Game Order',
          quantity: order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
          totalPrice: Number(order.totalPrice || 0),
          createdAt: order.createdAt,
          status: order.status === 1 ? 'Approved' : 'Pending'
        }));

        const recentDigitalOrders: ProfileRecentOrder[] = approvedDigitalOrders.map(order => ({
          id: order.id,
          type: 'digital',
          title: order.digitalProductName || 'Digital Product',
          quantity: Number(order.quantity || 0),
          totalPrice: Number(order.totalPrice || 0),
          createdAt: order.createdAt,
          status: order.status || 'Approved'
        }));

        const allOrders = [...recentGameOrders, ...recentDigitalOrders]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const recentOrders = allOrders.slice(0, 5);

        return {
          ...profile,
          totalOrders: approvedGameOrders.length + approvedDigitalOrders.length,
          totalSpent: gameSpent + digitalSpent,
          totalReviews: reviewedGames.length,
          reviewedGames,
          recentOrders,
          allOrders
        };
      })
    );
  }

  openAllOrdersModal(): void {
    this.showAllOrdersModal = true;
  }

  closeAllOrdersModal(): void {
    this.showAllOrdersModal = false;
  }

  getReviewedTitle(reviewed: unknown): string {
    if (typeof reviewed === 'string') return reviewed;
    if (!reviewed || typeof reviewed !== 'object') return '';

    const title = (reviewed as { title?: unknown }).title;
    if (typeof title === 'string') return title;
    if (title == null) return '';
    return String(title);
  }

  getReviewedGameId(reviewed: unknown): number | null {
    if (!reviewed || typeof reviewed !== 'object') return null;
    const id = (reviewed as { gameId?: unknown }).gameId;
    return typeof id === 'number' && id > 0 ? id : null;
  }

  getReviewedImageUrl(reviewed: unknown): string {
    if (reviewed && typeof reviewed === 'object') {
      const imageUrl = (reviewed as { imageUrl?: unknown }).imageUrl;
      if (typeof imageUrl === 'string' && imageUrl.trim()) {
        return imageUrl;
      }
    }
    return '/assets/images/games.png';
  }

}
