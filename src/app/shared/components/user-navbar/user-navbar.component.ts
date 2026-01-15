import { Component, inject, OnInit, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-user-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-navbar.component.html',
})
export class UserNavbarComponent implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  @Output() sidebarToggled = new EventEmitter<boolean>();

  user$!: Observable<User | null>;
  isDropdownOpen = false;

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.user$ = this.userService.getProfile().pipe(
        catchError(() => of({ username: 'User', email: '' } as User))
      );
    } else {
      this.user$ = of(null);
    }
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  toggleSidebar(): void {
    // For user, perhaps no sidebar or different
    this.sidebarToggled.emit(false);
  }

  logout(): void {
    this.authService.logout();
    this.closeDropdown();
    this.router.navigate(['/login']);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }
}