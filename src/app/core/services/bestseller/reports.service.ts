import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import { VideoGameSales } from 'src/app/shared/models/videogame-sales';

export interface BestSeller {
  videoGameId: number;
  title: string;
  totalQuantity: number;
  totalRevenue: number;
  imagePath?: string | null;
  price: number;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getVideoGameSales(): Observable<VideoGameSales[]> {
    return this.http.get<VideoGameSales[]>(
      `${this.api}/api/admin/reports/videogame-sales`
    );
  }

  getBestSellers(): Observable<BestSeller[]> {
    return this.http.get<BestSeller[]>(
      `${this.api}/api/reports/best-sellers`
    );
  }
}
