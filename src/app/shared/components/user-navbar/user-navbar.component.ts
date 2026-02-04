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

import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { ThemeService } from '../../../core/services/theme.service';
import { Profile } from '../../../core/models/user/UserProfile.model';

@Component({
  selector: 'app-user-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-navbar.component.html',
  styleUrls: ['./user-navbar.component.css']
})
export class UserNavbarComponent implements OnInit, OnDestroy {

  /* ===================== SERVICES ===================== */
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private themeService = inject(ThemeService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);

  /* ===================== OUTPUTS ===================== */
  @Output() sidebarToggled = new EventEmitter<boolean>();

  /* ===================== STATE ===================== */
  user$!: Observable<Profile | null>;
  isDarkMode = false;

  isDropdownOpen = false;
  isMobileMenuOpen = false;
  isNavHidden = false;

  unreadCount = 2; // 🔴 MOCK for now (will be real-time later)

  private themeSubscription?: Subscription;
  private lastScrollY = 0;
  private scrollThreshold = 8;

  /* ===================== LIFECYCLE ===================== */
  ngOnInit(): void {

    this.themeSubscription = this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
      this.cdr.markForCheck();
    });

    this.user$ = this.authService.isLoggedIn()
      ? this.userService.Profile
      : of(null);
  }

  ngOnDestroy(): void {
    this.themeSubscription?.unsubscribe();
  }

  /* ===================== THEME ===================== */
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  /* ===================== MENUS ===================== */
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

  /* ===================== NAVIGATION ===================== */
  guardedNavigate(path: string): void {
    if (!this.authService.isLoggedIn()) return;

    this.closeAllMenus();
    this.router.navigate([path]);
  }

  /* ===================== AUTH ===================== */
  logout(): void {
    this.authService.logout();
    this.user$ = of(null);
    this.closeAllMenus();
    this.router.navigate(['/user-dashboard']);
  }

  /* ===================== HELPERS ===================== */
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

  /* ===================== CLICK OUTSIDE ===================== */
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeAllMenus();
    }
  }

  /* ===================== SCROLL HIDE/SHOW ===================== */
  @HostListener('window:scroll')
  onWindowScroll(): void {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop || 0;
    const delta = currentScroll - this.lastScrollY;

    if (Math.abs(delta) < this.scrollThreshold) {
      return;
    }

    if (this.isMobileMenuOpen || this.isDropdownOpen) {
      this.isNavHidden = false;
      this.lastScrollY = currentScroll;
      return;
    }

    if (currentScroll <= 0) {
      this.isNavHidden = false;
    } else if (delta > 0) {
      this.isNavHidden = true;
    } else {
      this.isNavHidden = false;
    }

    this.lastScrollY = currentScroll;
  }
}
