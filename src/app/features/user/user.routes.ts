import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const userRoutes: Routes = [

  /* ===================== PROFILE ===================== */
  {
    path: 'profile',
    loadComponent: () =>
      import('./profile/profile.component')
        .then(m => m.ProfileComponent),
    canActivate: [authGuard]
  },

  {
    path: 'settings/password',
    loadComponent: () =>
      import('./settings/change-password.component')
        .then(m => m.ChangePasswordComponent),
    canActivate: [authGuard]
  },

  /* ===================== DASHBOARD ===================== */
  {
    path: 'welcomepage',
    loadComponent: () =>
      import('./dashboard/user-dashboard.component')
        .then(m => m.UserDashboardComponent),
    canActivate: [authGuard]
  },

  {
    path: 'user-dashboard',
    loadComponent: () =>
      import('./dashboard/user-dashboard.component')
        .then(m => m.UserDashboardComponent),
    canActivate: [authGuard]
  },

  /* ===================== GAMES ===================== */
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

  /* ===================== CART / ORDERS ===================== */
  {
    path: 'cart',
    loadComponent: () =>
      import('./cart/cart')
        .then(m => m.CartComponent),
    canActivate: [authGuard]
  },

  {
    path: 'checkout',
    loadComponent: () =>
      import('./checkout/checkout')
        .then(m => m.CheckoutComponent),
    canActivate: [authGuard]
  },

  {
    path: 'orders',
    loadComponent: () =>
      import('./orders/user-orders')
        .then(m => m.UserOrdersComponent),
    canActivate: [authGuard]
  },

  /* ===================== 💬 MESSENGER CONVERSATIONS ===================== */
  {
    path: 'conversations',
    loadComponent: () =>
      import('./conversations/conversations-page/conversations-page')
        .then(m => m.ConversationsPageComponent),
    canActivate: [authGuard]
  }

];
