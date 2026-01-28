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
  styles: [`
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(14px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fade-in {
      animation: fadeIn 0.25s ease-out;
    }

    .animate-slide-up {
      animation: slideUp 0.3s cubic-bezier(.22,1,.36,1);
    }
  `]
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

  private themeSubscription?: Subscription;

  /* ===================== LIFECYCLE ===================== */
  ngOnInit(): void {

    this.themeSubscription = this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
      this.cdr.markForCheck();
    });

    // Show user profile if logged in, else null
    this.user$ = this.authService.isLoggedIn() ? this.userService.Profile : of(null);
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

  /* ===================== NAVIGATION GUARD ===================== */
  guardedNavigate(path: string): void {
    if (!this.authService.isLoggedIn()) {
      return;
    }

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
}
