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
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { Profile } from '../../../core/models/UserProfile.model';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent implements OnInit {

  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  // 🔁 Layout inputs
  @Input() isMinimized = false;

  // 🔐 Role-based input (from MainLayout)
  @Input() isAdmin = false;

  // 🔁 Sidebar toggle output
  @Output() sidebarToggled = new EventEmitter<boolean>();

  user$!: Observable<Profile | null>;
  isDropdownOpen = false;

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.user$ = this.userService.Profile.pipe(
        catchError(() =>
          of({ username: 'User', email: '' } as Profile)
        )
      );
    } else {
      this.user$ = of(null);
    }
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

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }
}
