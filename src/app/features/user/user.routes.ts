import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const userRoutes: Routes = [

  /* ===================== PROFILE ===================== */
  {
    path: 'profile',
    loadComponent: () =>
      import('./profile/profile')
        .then(m => m.ProfileComponent)
  },

  {
    path: 'settings/password',
    loadComponent: () =>
      import('./settings/change-password.component')
        .then(m => m.ChangePasswordComponent)
  },

  /* ===================== DASHBOARD ===================== */
  {
    path: 'welcomepage',
    loadComponent: () =>
      import('./dashboard/user-dashboard.component')
        .then(m => m.UserDashboardComponent)
  },

  {
    path: 'user-dashboard',
    loadComponent: () =>
      import('./dashboard/user-dashboard.component')
        .then(m => m.UserDashboardComponent)
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

  /* ===================== DIGITAL PRODUCTS ===================== */
  {
    path: 'digital-products',
    loadComponent: () =>
      import('./digital-products/pages/digital-store.page')
        .then(m => m.DigitalStorePage)
  },

  /* ===================== CART / ORDERS ===================== */
  {
    path: 'cart',
    loadComponent: () =>
      import('./cart/cart')
        .then(m => m.CartComponent)
  },

  {
    path: 'checkout',
    loadComponent: () =>
      import('./checkout/checkout')
        .then(m => m.CheckoutComponent)
  },

  {
    path: 'orders',
    loadComponent: () =>
      import('./orders/user-orders')
        .then(m => m.UserOrdersComponent)
  },

  /* ===================== 💬 MESSENGER CONVERSATIONS ===================== */
  {
    path: 'conversations',
    loadComponent: () =>
      import('./conversations/user-conversation-page')
        .then(m => m.UserConversationsPageComponent)
  },
  {
    path: 'conversations/:id',
    loadComponent: () =>
      import('./conversations/user-conversation-page')
        .then(m => m.UserConversationsPageComponent)
  }

];
