import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // 從 route data 取得要求的角色
  const requiredRoles = route.data?.['roles'] as string[] | undefined;

  // 如果這個 route 沒設定 roles，就不用判斷
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  const user = auth.userSignal();

  if (user && requiredRoles.includes(user.role)) {
    // ✅ 有登入且角色符合
    return true;
  }

  // 🚫 未授權：導回 Dashboard 或另外的「沒有權限」頁
  return router.createUrlTree(['/dashboard']);
};
