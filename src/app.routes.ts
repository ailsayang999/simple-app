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
      {
        path: 'samples',
        loadComponent: () => import('./app/pages/samples/samples').then((m) => m.Samples),
      },
      {
        path: 'account',
        children: [
          {
            path: 'setting',
            loadComponent: () =>
              import('./app/pages/account-setting/account-setting').then((m) => m.AccountSetting),
          },
          {
            path: '',
            redirectTo: 'setting',
            pathMatch: 'full',
          },
        ],
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];
