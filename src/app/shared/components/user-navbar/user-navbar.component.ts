import { Component, inject, OnInit, Output, EventEmitter, HostListener, ElementRef, Renderer2 } from '@angular/core';
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
  private renderer = inject(Renderer2);

  @Output() sidebarToggled = new EventEmitter<boolean>();

  user$!: Observable<User | null>;
  isDropdownOpen = false;
  isDarkMode = false;

  ngOnInit(): void {
    this.loadTheme();

    if (this.authService.isLoggedIn()) {
      this.user$ = this.userService.getProfile().pipe(
        catchError(() => of({ username: 'User', email: '' } as User))
      );
    } else {
      this.user$ = of(null);
    }
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  loadTheme(): void {
    const saved = localStorage.getItem('theme');
    this.isDarkMode = saved === 'dark';
    this.applyTheme();
  }

  applyTheme(): void {
    const html = document.documentElement;
    const body = document.body;

    if (this.isDarkMode) {
      html.classList.add('dark');
      body.classList.add('dark');
    } else {
      html.classList.remove('dark');
      body.classList.remove('dark');
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