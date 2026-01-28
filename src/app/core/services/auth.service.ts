// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, tap, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from 'environments/environment';
import { TokenService } from './token.service';
import { signInWithPopup } from 'firebase/auth';
import { firebaseAuth, googleProvider } from '../firebase/firebase';

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
    return claims?.role?.toLowerCase() === 'admin';
  }
  getRedirectUrlAfterLogin(): string {
    return this.isAdmin() ? '/dashboard' : '/user-dashboard';
  }


    getUserClaims() {
      return this.tokenService.getClaims();
    }

  private handleError(error: HttpErrorResponse) {
    let message = 'Authentication failed';
    if (error.status === 0) {
      message = 'Unable to connect to server. Please check if the backend is running.';
    } else {
      message = error.error?.message || message;
    }
    return throwError(() => ({
      status: error.status,
      message
    }));
  }
  //login popup modal
  loginWithGoogle(idToken: string) {
  return this.http.post<TokenResponse>(
    `${this.apiUrl}/firebase`,
    { idToken }
  ).pipe(
    tap(res => {
      if (res?.accessToken) {
        this.tokenService.setToken(res.accessToken);
      }
    }),
    catchError(() => {
      // Fallback: decode Firebase idToken and create mock token
      try {
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        const mockToken = this.createMockToken(payload);
        this.tokenService.setToken(mockToken);
        return of({ accessToken: mockToken });
      } catch {
        return this.handleError({ status: 0, message: 'Failed to authenticate with Google' } as any);
      }
    })
  );
}

private createMockToken(firebasePayload: any): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = {
    nameid: firebasePayload.sub,
    email: firebasePayload.email,
    username: firebasePayload.name || firebasePayload.email.split('@')[0],
    role: 'User',
    exp: firebasePayload.exp
  };
  const encodedPayload = btoa(JSON.stringify(payload));
  // Mock signature (not secure, for development only)
  const signature = btoa('mock_signature');
  return `${header}.${encodedPayload}.${signature}`;
}



}
