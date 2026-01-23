import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { GameReviewsResponse, Review } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getReviewsByGame(gameId: number): Observable<GameReviewsResponse> {
    return this.http.get<GameReviewsResponse>(
      `${this.apiUrl}/api/reviews/game/${gameId}`
    );
  }

  createReview(payload: {
    videoGameId: number;
    rating: number;
    comment: string;
    orderId: number;
  }) {
    return this.http.post(`${this.apiUrl}/api/reviews`, payload);
  }

}
