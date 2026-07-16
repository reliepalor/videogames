import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private isMinimizedSubject = new BehaviorSubject<boolean>(false);
  public isMinimized$ = this.isMinimizedSubject.asObservable();

  setMinimized(minimized: boolean): void {
    this.isMinimizedSubject.next(minimized);
  }

  get isMinimized(): boolean {
    return this.isMinimizedSubject.value;
  }
}