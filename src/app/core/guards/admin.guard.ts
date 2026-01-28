import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    const isLoggedIn = this.auth.isLoggedIn();
    const isAdmin = this.auth.isAdmin();
    if (isLoggedIn && isAdmin) {
      return of(true);
    } else if (isLoggedIn) {
      this.router.navigate(['/user-dashboard']);
      return of(false);
    } else {
      this.router.navigate(['/login']);
      return of(false);
    }
  }
}
