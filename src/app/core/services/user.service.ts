// src/app/core/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { timeout, map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../models/user/user.model';
import { Profile } from '../models/user/UserProfile.model';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private userApiUrl = `${environment.apiUrl}/api/user`;
  private readonly nonAdminUsersEndpoints = [
    `${environment.apiUrl}/api/auth/users/non-admin`,
    `${environment.apiUrl}/auth/users/non-admin`,
    `${environment.apiUrl}/api/admin/users/non-admin`,
    `${environment.apiUrl}/admin/users/non-admin`,
  ];
  private readonly deleteUserEndpoints = [
    `${environment.apiUrl}/api/auth/delete-user`,
    `${environment.apiUrl}/auth/delete-user`,
    `${environment.apiUrl}/api/admin/delete-user`,
    `${environment.apiUrl}/admin/delete-user`,
  ];

  constructor(private http: HttpClient, private tokenService: TokenService) {}

  get Profile(): Observable<Profile> {
    const claims = this.tokenService.getClaims();
    if (claims && claims.username && claims.email) {
      return of({
        username: claims.username,
        email: claims.email,
        profilePicture: undefined
      } as Profile);
    }

    return this.http.get<Profile>(`${this.userApiUrl}/me`).pipe(
      timeout(10000),
      catchError(() => of({
        username: '',
        email: '',
        profilePicture: undefined
      } as Profile))
    );
  }

  getNonAdminUsers(): Observable<User[]> {
    return this.fetchNonAdminUsersFrom(0);
  }

  deleteUser(userId: number): Observable<void> {
    return this.deleteUserFrom(0, userId);
  }

  private fetchNonAdminUsersFrom(index: number): Observable<User[]> {
    if (index >= this.nonAdminUsersEndpoints.length) {
      return throwError(() => new Error('All non-admin users endpoints returned 404/405.'));
    }

    const endpoint = this.nonAdminUsersEndpoints[index];
    return this.http.get<unknown[]>(endpoint).pipe(
      map((rows) => (rows ?? []).map((row) => this.toUser(row))),
      catchError((err) => {
        if (err?.status === 404 || err?.status === 405) {
          return this.fetchNonAdminUsersFrom(index + 1);
        }
        return throwError(() => err);
      })
    );
  }

  private deleteUserFrom(index: number, userId: number): Observable<void> {
    if (index >= this.deleteUserEndpoints.length) {
      return throwError(() => new Error('All delete user endpoints returned 404/405.'));
    }

    const endpoint = `${this.deleteUserEndpoints[index]}/${userId}`;
    return this.http.delete(endpoint, { responseType: 'text' }).pipe(
      map(() => void 0),
      catchError((err) => {
        if (err?.status === 404 || err?.status === 405) {
          return this.deleteUserFrom(index + 1, userId);
        }
        return throwError(() => err);
      })
    );
  }

  private toUser(row: unknown): User {
    const data = (row ?? {}) as Record<string, unknown>;

    return {
      id: Number(data['id'] ?? data['Id'] ?? 0),
      username: String(data['username'] ?? data['Username'] ?? ''),
      email: String(data['email'] ?? data['Email'] ?? ''),
      profilePicture: this.optionalString(data['profilePicture'] ?? data['ProfilePicture']),
      isAdmin: this.optionalBoolean(data['isAdmin'] ?? data['IsAdmin']),
      isExternalAuth: Boolean(data['isExternalAuth'] ?? data['IsExternalAuth']),
      createdAt: String(data['createdAt'] ?? data['CreatedAt'] ?? ''),
      lastLoginAt: String(data['lastLoginAt'] ?? data['LastLoginAt'] ?? ''),
    };
  }

  private optionalString(value: unknown): string | undefined {
    if (value == null) return undefined;
    const asString = String(value).trim();
    return asString || undefined;
  }

  private optionalBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') return value;
    if (value == null) return undefined;
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return undefined;
  }
}
