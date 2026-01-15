import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TestService {
  private apiUrl = `${environment.apiUrl}/test`;

  constructor(private http: HttpClient) {}

  getMe() {
    return this.http.get<any>(`${this.apiUrl}/me`);
  }
}
