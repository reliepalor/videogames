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
  styles: [`
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-up {
      animation: fadeUp .25s ease-out;
    }
  `]
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

  ngOnInit(): void {
    this.user$ = this.authService.isLoggedIn()
      ? this.userService.Profile.pipe(
          catchError(() =>
            of({ username: 'User', email: '' } as Profile)
          )
        )
      : of(null);
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

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }
}
