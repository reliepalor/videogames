import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const userRoutes: Routes = [
  {
    path: 'profile',
    loadComponent: () =>
      import('./profile/profile.component')
        .then(m => m.ProfileComponent)
  },
  {
    path: 'settings/password',
    loadComponent: () =>
      import('./settings/change-password.component')
        .then(m => m.ChangePasswordComponent)
  },
  {
    path: 'user-dashboard',
    loadComponent: () =>
      import('./dashboard/user-dashboard.component')
        .then(m => m.UserDashboardComponent)
  },
  {
    path: 'games',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./videogames/games-list')
            .then(m => m.GamesListComponent)
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./videogames/game-details/game-details.component')
            .then(m => m.GameDetailsComponent)
      },
      {
        path: ':id/reviews',
        loadComponent: () =>
          import('./videogames/game-details/game-details.component')
            .then(m => m.GameDetailsComponent)
      }
    ]
  },
  {
    path: 'cart',
    loadComponent: () => import('./cart/cart').then(m => m.CartComponent),
    canActivate: [authGuard]
  },
  {
    path: 'checkout',
    loadComponent: () => import('./checkout/checkout').then(m => m.CheckoutComponent),
    canActivate: [authGuard]
  },
  {
    path: 'orders',
    loadComponent: () => import('./orders/user-orders').then(m => m.UserOrdersComponent),
    canActivate: [authGuard]
  }

];
