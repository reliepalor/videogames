// src/app/core/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { timeout, map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../models/user/user.model';
import { Profile } from '../models/user/UserProfile.model';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private apiUrl = `${environment.apiUrl}/api/user`;

  constructor(private http: HttpClient, private tokenService: TokenService) {}

  get Profile(): Observable<Profile> {
    // Try to get user info from token first
    const claims = this.tokenService.getClaims();
    if (claims && claims.username && claims.email) {
      return of({
        username: claims.username,
        email: claims.email,
        profilePicture: undefined
      } as Profile);
    }

    // Fallback to API call if token doesn't have info
    return this.http.get<Profile>(`${this.apiUrl}/me`).pipe(
      timeout(10000),
      catchError(() => of({
        username: '',
        email: '',
        profilePicture: undefined
      } as Profile))
    );
  }
}