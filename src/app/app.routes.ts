import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { loginGuard } from './core/guards/login.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { userGuard } from './core/guards/user.guard';

import { LoginComponent } from './features/auth/login/login.component';
import { routes as videogameRoutes } from './features/admin/videogames.routes';

import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';

export const routes: Routes = [

  /* ================= DEFAULT ================= */
  {
    path: '',
    redirectTo: 'user-dashboard',
    pathMatch: 'full'
  },

  /* ================= AUTH (NO NAVBAR) ================= */
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        component: LoginComponent,
        canActivate: [loginGuard]
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component')
            .then(m => m.RegisterComponent)
      }
    ]
  },

  /* ================= MAIN APP (WITH NAVBAR) ================= */
  {
    path: '',
    component: MainLayoutComponent,
    children: [

      /* ---------- PUBLIC USER DASHBOARD ---------- */
      {
        path: 'user-dashboard',
        loadComponent: () =>
          import('./features/user/dashboard/user-dashboard.component')
            .then(m => m.UserDashboardComponent)
      },

      /* ---------- ADMIN ---------- */
      {
        path: 'dashboard',
        canActivate: [AdminGuard],
        loadComponent: () =>
          import('./features/dashboard/dashboard.component')
            .then(m => m.AdminDashboardComponent)
      },
      {
        path: 'videogames',
        canActivate: [AdminGuard],
        children: videogameRoutes
      },
      {
        path: 'admin',
        canActivate: [AdminGuard],
        loadChildren: () =>
          import('./features/admin/admin.routes')
            .then(m => m.adminRoutes)
      },

      /* ---------- USER (AUTH REQUIRED) ---------- */
      {
        path: '',
        canActivate: [userGuard],
        loadChildren: () =>
          import('./features/user/user.routes')
            .then(m => m.userRoutes)
      }

    ]
  }
];
