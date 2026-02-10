import {
  Component,
  inject,
  OnInit,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { Profile } from '../../../core/models/user/UserProfile.model';
import { Observable, of } from 'rxjs';
import { catchError, filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html'
})
export class NavbarComponent implements OnInit {

  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  @Input() isMinimized = false;
  @Input() isAdmin = false;

  @Output() sidebarToggled = new EventEmitter<boolean>();

  user$!: Observable<Profile | null>;
  isDropdownOpen = false;
  currentRoute = '';

  unreadCount = 3; // 🔴 MOCK — will be real SignalR later

  ngOnInit(): void {
    this.user$ = this.authService.isLoggedIn()
      ? this.userService.Profile.pipe(
          catchError(() =>
            of({ username: 'User', email: '' } as Profile)
          )
        )
      : of(null);

    // Track current route for active states
    this.currentRoute = this.router.url;
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute = event.url;
      });
  }

  toggleSidebar(): void {
    this.isMinimized = !this.isMinimized;
    this.sidebarToggled.emit(this.isMinimized);
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.closeDropdown();
    this.router.navigate(['/login']);
  }

  /**
   * Check if a route is currently active
   * Used for manual active state styling
   */
  isActiveRoute(route: string): boolean {
    if (route === '/dashboard') {
      return this.currentRoute === route;
    }
    return this.currentRoute.startsWith(route);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }

  // Close sidebar on mobile when clicking outside
  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    if (event.target.innerWidth >= 1024 && this.isMinimized) {
      // Optional: Auto-expand on desktop
      // this.isMinimized = false;
    }
  }
}