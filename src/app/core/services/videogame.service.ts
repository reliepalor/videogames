import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { VideoGame } from '../models/videogame.model';
import { environment } from '../../../environments/environment';

interface VideoGameApiResponse extends Omit<VideoGame, 'imageUrl'> {
  imagePath?: string;
}

@Injectable({ providedIn: 'root' })
export class VideoGameService {

  private http = inject(HttpClient);

  private API = `${environment.apiUrl}/api/videogame`;
  private apiUrl = environment.apiUrl;

  getAll(): Observable<VideoGame[]> {
    return this.http.get<VideoGameApiResponse[]>(this.API).pipe(
      map(games =>
        games.map(game => ({
          ...game,
          imageUrl: game.imagePath ? `${this.apiUrl}${game.imagePath}` : undefined
        }))
      )
    );
  }

  getById(id: number): Observable<VideoGame> {
    return this.http.get<VideoGame>(`${this.API}/${id}`).pipe(
      map(game => ({
        ...game,
        imageUrl: (game as any).imagePath ? `${this.apiUrl}${(game as any).imagePath}` : undefined
      }))
    );
  }

  create(formData: FormData) {
    return this.http.post<VideoGame>(this.API, formData);
  }

  update(id: number, formData: FormData) {
    console.log('Sending PUT to:', `${this.API}/${id}`, 'with formData');
    return this.http.put(`${this.API}/${id}`, formData);
  }

  delete(id: number) {
    return this.http.delete(`${this.API}/${id}`);
  }
}
