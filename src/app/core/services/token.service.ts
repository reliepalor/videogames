// src/app/core/services/token.service.ts
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface UserClaims {
  userId: number;
  email?: string;
  role: 'Admin' | 'User';
  username?: string;
  exp?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TokenService {

  private readonly TOKEN_KEY = 'auth_token';
  private platformId = inject(PLATFORM_ID);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  setToken(token: string): void {
    if (!this.isBrowser) return;
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  clear(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    const claims = this.getClaims();
    return !!claims;
  }

  getClaims(): UserClaims | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      // ⏰ Expiration check
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        this.clear();
        return null;
      }

      return {
        userId: Number(payload.nameid),
        email: payload.email,
        role: payload.role,
        username: payload.username,
        exp: payload.exp
      };
    } catch {
      return null;
    }
  }

  getUserRole(): 'Admin' | 'User' | null {
    return this.getClaims()?.role ?? null;
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'Admin';
  }
}
