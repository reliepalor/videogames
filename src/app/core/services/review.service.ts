import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GameReviewsResponse, Review } from '../models/review.model';

export interface ReviewEligibility{
  orderId: number;
  videoGameId: number;
  gameTitle: string;
  hasReviewed: boolean;
}
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getEligibility(): Observable<ReviewEligibility[]> {
    return this.http.get<ReviewEligibility[]>(`${this.apiUrl}/api/reviews/eligibility`);
  }

  getReviewsByGame(gameId: number): Observable<GameReviewsResponse> {
    return this.http.get<{ message: string; data: GameReviewsResponse }>(
      `${this.apiUrl}/api/reviews/game/${gameId}`
    ).pipe(
      map(res => res.data)
    );
  }

  createReview(payload: {
    videoGameId: number;
    orderId: number;
    rating: number;
    comment: string;
  }) {
    return this.http.post(`${this.apiUrl}/api/reviews`, payload);
  }

}
