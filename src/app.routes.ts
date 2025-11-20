import { Routes } from '@angular/router';
import { authGuard } from './app/auth/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./app/auth/login/login').then((m) => m.Login),
      },
      {
        path: 'register',
        loadComponent: () => import('./app/auth/register/register').then((m) => m.Register),
      },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },
  // ✅ 需要登入的區域：layout + 內頁
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./app/layout/layout-shell').then((m) => m.LayoutShell),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./app/pages/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'products',
        loadComponent: () => import('./app/pages/products/products').then((m) => m.Products),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
