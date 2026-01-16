import { Component, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from 'src/app/shared/components/navbar/navbar.component';
import { UserNavbarComponent } from 'src/app/shared/components/user-navbar/user-navbar.component';
import { AuthService } from 'src/app/core/services/auth.service';
import { SidebarService } from 'src/app/core/services/sidebar.service';

@Component({
  standalone: true,
  selector: 'app-main-layout',
  imports: [RouterOutlet, CommonModule, NavbarComponent, UserNavbarComponent],
  template: `
    <div class="min-h-screen" *ngIf="auth.isAdmin(); else userLayout">
      <div class="flex">

        <app-navbar
          [isAdmin]="true"
          [isMinimized]="isSidebarMinimized"
          (sidebarToggled)="onSidebarToggle($event)">
        </app-navbar>

        <main
          class="flex-1 transition-all duration-300"
          [class.ml-64]="!isSidebarMinimized"
          [class.ml-16]="isSidebarMinimized">

          <div class="p-8">
            <router-outlet></router-outlet>
          </div>

        </main>
      </div>
    </div>

    <ng-template #userLayout>
      <app-user-navbar></app-user-navbar>
      <main [class]="getMainClass()">
        <router-outlet></router-outlet>
      </main>
    </ng-template>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class MainLayoutComponent {

  auth = inject(AuthService);
  sidebarService = inject(SidebarService);
  router = inject(Router);

  isSidebarMinimized = false;

  onSidebarToggle(minimized: boolean): void {
    this.isSidebarMinimized = minimized;
    this.sidebarService.setMinimized(minimized);
  }

  getMainClass(): string {
    if (this.router.url.includes('user-dashboard')) {
      return '';
    }
    return 'p-8';
  }
}
