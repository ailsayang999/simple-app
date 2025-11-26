import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Role } from '../../auth/rbac'; // 👈 新增：使用 enum Role

export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // 從 route data 取得要求的角色（多個）
  const requiredRoles = route.data?.['roles'] as Role[] | undefined;

  // 如果這個 route 沒設定 roles，就不用判斷
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  const user = auth.userSignal();

  // ✅ 有登入，且 user.roles 中只要包含任一個 requiredRoles 即可
  if (user && user.roles && requiredRoles.some((r) => user.roles.includes(r))) {
    return true;
  }

  // 🚫 未授權：導回 Dashboard 或另外的「沒有權限」頁
  return router.createUrlTree(['/dashboard']);
};
