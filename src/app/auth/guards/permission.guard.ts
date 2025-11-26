import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Permission } from '../../auth/rbac';

export const permissionGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const requiredPermissions = (route.data?.['permissions'] as Permission[] | undefined) ?? [];

  // 如果這個 route 沒有設定 permissions，代表不限制
  if (!requiredPermissions.length) {
    return true;
  }

  const user = auth.userSignal();
  if (!user) {
    // 沒登入：可以選擇導去 login
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  const hasAny = requiredPermissions.some((p) => user.permissions.includes(p));

  if (hasAny) {
    return true;
  }

  // 沒權限：導去 dashboard 或專門的「沒有權限」頁
  return router.createUrlTree(['/dashboard']);
};
