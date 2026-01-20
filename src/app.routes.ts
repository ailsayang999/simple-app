import { Routes } from '@angular/router';
import { authGuard } from './app/auth/guards/auth.guard';
import { roleGuard } from './app/auth/guards/role.guard';
import { permissionGuard } from './app/auth/guards/permission.guard';
import { Permission, Role } from './app/auth/rbac';

export const routes: Routes = [
  // {
  //   path: 'auth',
  //   children: [
  //     {
  //       path: 'login',
  //       loadComponent: () => import('./app/auth/login/login').then((m) => m.Login),
  //     },
  //     {
  //       path: 'register',
  //       loadComponent: () => import('./app/auth/register/register').then((m) => m.Register),
  //     },
  //     { path: '', pathMatch: 'full', redirectTo: 'login' },
  //   ],
  // },
  // ✅ 需要登入的區域：layout + 內頁
  {
    path: '',
    //canActivate: [authGuard],
    loadComponent: () => import('./app/layout/layout-shell').then((m) => m.LayoutShell),
    children: [
      // {
      //   path: 'dashboard',
      //   data: {
      //     breadcrumb: {
      //       label: 'Dashboard',
      //       icon: 'pi pi-gauge',
      //     },
      //   },
      //   loadComponent: () => import('./app/pages/dashboard/dashboard').then((m) => m.Dashboard),
      // },
      // {
      //   path: 'portal',
      //   data: {
      //     breadcrumb: {
      //       label: 'Portal',
      //       icon: 'pi pi-table',
      //     },
      //   },
      //   loadComponent: () => import('./app/pages/portal/portal').then((m) => m.Portal),
      // },
      {
        path: 'portal-gridster',
        data: {
          breadcrumb: {
            label: 'Portal Gridster',
            icon: 'pi pi-qrcode',
          },
        },
        loadComponent: () =>
          import('./app/pages/portal-gridster/portal-gridster').then((m) => m.PortalGridster),
      },
      {
        path: 'portal-gridster-deletebtn',
        data: {
          breadcrumb: {
            label: 'Portal Gridster deletbtn',
            icon: 'pi pi-qrcode',
          },
        },
        loadComponent: () =>
          import('./app/pages/portal-gridster-deletebtn/portal-gridster-deletebtn').then(
            (m) => m.PortalGridsterDeleteBtn
          ),
      },
      {
        path: 'portal-gridstack',
        data: {
          breadcrumb: {
            label: 'Portal GridStack',
            icon: 'pi pi-qrcode',
          },
        },
        loadComponent: () =>
          import('./app/pages/portal-gridstack/portal-gridstack').then((m) => m.PortalGridstack),
      },
      {
        path: 'admin/user-roles',
        //canActivate: [authGuard, roleGuard], // 如果要獨立出來自己一頁的話就可以加authGuard
        canActivate: [roleGuard],
        data: { roles: [Role.Admin, Role.Manager] },
        loadComponent: () =>
          import('./app/pages/admin-user-roles/user-role-management').then(
            (m) => m.UserRoleManagementComponent
          ),
      },
      // {
      //   path: 'products',
      //   canActivate: [roleGuard], // 👈 新增角色守門人
      //   data: {
      //     breadcrumb: {
      //       label: 'Products',
      //       icon: 'pi pi-cart-minus', // ⭐  加 icon
      //     },
      //     roles: [Role.Manager], // 👈 只有 MANAGER 可以進
      //   },
      //   loadComponent: () => import('./app/pages/products/products').then((m) => m.Products),
      // },
      // // ⭐⭐ ← 在這裡加上 products/:id，放在 path: 'products' 的旁邊（與它並列）（而不是放在 products 的 children 裡，因為你的 products 是一個 page，不是 feature parent）
      // {
      //   path: 'products/:id',
      //   canActivate: [roleGuard], // 👈 新增角色守門人
      //   data: {
      //     breadcrumb: {
      //       label: 'Product Detail~~',
      //       icon: 'pi pi-shopping-bag',
      //     },
      //     title: 'Product Detail!!!!',
      //     roles: [Role.Manager], // 👈 只有 MANAGER 可以進
      //   },
      //   loadComponent: () =>
      //     import('./app/pages/product-detail/product-detail').then((m) => m.ProductDetail),
      // },
      // {
      //   path: 'samples',
      //   canActivate: [permissionGuard], // ✅ 多加這一層
      //   data: {
      //     breadcrumb: 'Samples', // ⭐ 只寫字串
      //     permissions: [Permission.ReportView], // ✅ 有 report.view.view 卡才能進
      //   },
      //   loadComponent: () => import('./app/pages/samples/samples').then((m) => m.Samples),
      // },
      // {
      //   path: 'account',
      //   data: {
      //     breadcrumb: {
      //       label: 'Account',
      //       icon: 'pi pi-user',
      //       //skip: true, // ⭐ 不顯示這一層
      //     },
      //   },
      //   children: [
      //     {
      //       path: 'setting',
      //       data: {
      //         breadcrumb: {
      //           label: 'Settings',
      //           disableLink: true, // ⭐ 最後一層只顯示文字、不允許點擊
      //         },
      //       },
      //       loadComponent: () =>
      //         import('./app/pages/account-setting/account-setting').then((m) => m.AccountSetting),
      //     },
      //     {
      //       path: '',
      //       redirectTo: 'setting',
      //       pathMatch: 'full',
      //     },
      //   ],
      // },
      // {
      //   path: 'accounts',
      //   data: {
      //     breadcrumb: 'Accounts List', // ⭐ 只寫字串
      //     breadcrumbKey: 'accounts',
      //   },
      //   loadComponent: () =>
      //     import('./app/pages/account-list/account-list').then((m) => m.AccountListPage),
      // },
      // {
      //   path: 'accounts/:id',
      //   data: {
      //     breadcrumb: { label: "Account's Detail" },
      //     breadcrumbParent: 'accounts',
      //   },
      //   loadComponent: () =>
      //     import('./app/pages/account-detail/account-detail').then((m) => m.AccountDetailPage),
      // },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./app/pages/not-found/not-found').then((m) => m.NotFound),
  },
];
