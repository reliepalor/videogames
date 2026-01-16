import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { VideoGameSales } from 'src/app/shared/models/videogame-sales';


@Injectable({ providedIn: 'root' })
export class ReportsService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getVideoGameSales(): Observable<VideoGameSales[]> {
    return this.http.get<VideoGameSales[]>(
      `${this.api}/api/admin/reports/videogame-sales`
    );
  }
}
