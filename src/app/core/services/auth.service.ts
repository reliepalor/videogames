// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, tap } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from 'environments/environment';
import { TokenService } from './token.service';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = `${environment.apiUrl}/api/auth`;

  constructor(
    private http: HttpClient,
    private tokenService: TokenService
  ) {}

  login(data: LoginRequest): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${this.apiUrl}/login`, data)
      .pipe(
        timeout(10000),
        tap(res => {
          if (res?.accessToken) {
            this.tokenService.setToken(res.accessToken);
          }
        }),
        catchError(this.handleError)
      );
  }

  register(data: RegisterRequest): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${this.apiUrl}/register`, data)
      .pipe(
        timeout(10000),
        tap(res => {
          if (res?.accessToken) {
            this.tokenService.setToken(res.accessToken);
          }
        }),
        catchError(this.handleError)
      );
  }

  logout(): void {
    this.tokenService.clear();
  }
  updatePassword(newPassword: string) {
  return this.http.put(
    `${this.apiUrl}/update-password`,
    { newPassword }
  );
}


  isLoggedIn(): boolean {
    return this.tokenService.isLoggedIn();
  }

isAdmin(): boolean {
  const claims = this.tokenService.getClaims();
  return claims?.role === 'Admin';
}
getRedirectUrlAfterLogin(): string {
  return this.isAdmin() ? '/dashboard' : '/user-dashboard';
}


  getUserClaims() {
    return this.tokenService.getClaims();
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => ({
      status: error.status,
      message: error.error?.message || 'Authentication failed'
    }));
  }
}
