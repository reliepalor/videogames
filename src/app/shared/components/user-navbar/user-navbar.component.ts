import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Observable, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { ThemeService } from '../../../core/services/theme.service';
import { Profile } from '../../../core/models/UserProfile.model';

@Component({
  selector: 'app-user-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-navbar.component.html',
})
export class UserNavbarComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private themeService = inject(ThemeService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);

  @Output() sidebarToggled = new EventEmitter<boolean>();

  user$!: Observable<Profile | null>;
  isDarkMode = false;

  /** desktop avatar dropdown */
  isDropdownOpen = false;

  /** mobile hamburger dropdown */
  isMobileMenuOpen = false;

  private themeSubscription?: Subscription;

  // ---------------- INIT ----------------
  ngOnInit(): void {
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(
      isDark => {
        this.isDarkMode = isDark;
        this.cdr.markForCheck();
      }
    );

    if (this.authService.isLoggedIn()) {
      this.user$ = this.userService.Profile.pipe(
        catchError(() =>
          of({
            username: '',
            email: '',
            profilePicture: undefined,
          } as Profile)
        )
      );
    } else {
      this.user$ = of(null);
    }
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
  }

  // ---------------- THEME ----------------
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  // ---------------- MENUS ----------------
  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeAllMenus(): void {
    this.isDropdownOpen = false;
    this.isMobileMenuOpen = false;
  }

  // ---------------- AUTH ----------------
  logout(): void {
    this.authService.logout();
    this.closeAllMenus();
    this.router.navigate(['/login']);
  }

  // ---------------- HELPERS ----------------
  getInitials(name?: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // ---------------- CLICK OUTSIDE ----------------
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeAllMenus();
    }
  }
}
