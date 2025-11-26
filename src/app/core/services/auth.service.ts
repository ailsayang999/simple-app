import { Injectable, signal } from '@angular/core';
import { Role, Permission, ROLE_PERMISSIONS } from '../../auth/rbac'; // 路徑依你實際調整


export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  roles: Role[]; // ✅ 多角色
  permissions: Permission[]; // ✅ 實際權限清單（通常由後端決定）
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'demo_token';
  private readonly USER_KEY = 'demo_user';

  readonly userSignal = signal<AuthUser | null>(this.loadUser());

  private loadUser(): AuthUser | null {
    const json = localStorage.getItem(this.USER_KEY);
    return json ? (JSON.parse(json) as AuthUser) : null;
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  // ---------- ✅ 角色 / 權限判斷 helper ----------

  hasRole(role: Role): boolean {
    const user = this.userSignal();
    return !!user && user.roles.includes(role);
  }

  hasAnyRole(roles: Role[]): boolean {
    const user = this.userSignal();
    if (!user) return false;
    return roles.some((r) => user.roles.includes(r));
  }

  hasPermission(permission: Permission): boolean {
    const user = this.userSignal();
    return !!user && user.permissions.includes(permission);
  }

  hasAnyPermission(perms: Permission[]): boolean {
    const user = this.userSignal();
    if (!user) return false;
    return perms.some((p) => user.permissions.includes(p));
  }

  // ---------- ✅ Demo 用 login（實務上應該由 API 回傳） ----------

  login(email: string, password: string): boolean {
    const fakeToken = 'FAKE_JWT_TOKEN';

    // demo：根據 email 給角色
    let roles: Role[] = [Role.User];

    if (email === 'admin@test.com') {
      roles = [Role.Admin];
    } else if (email === 'manager@test.com') {
      roles = [Role.Manager];
    } else if (email === 'report@test.com') {
      roles = [Role.ReportViewer];
    }

    // 依角色組出 permissions（真實環境通常後端直接回傳）
    const permissions = Array.from(new Set(roles.flatMap((r) => ROLE_PERMISSIONS[r] ?? [])));

    const fakeUser: AuthUser = {
      id: '1',
      name: email,
      email,
      avatarUrl: 'https://i.pravatar.cc/100?img=8',
      roles,
      permissions,
    };

    localStorage.setItem(this.TOKEN_KEY, fakeToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(fakeUser));
    this.userSignal.set(fakeUser);
    return true;
  }

  register(name: string, email: string, password: string): boolean {
    // Demo：直接當作註冊成功，然後順便登入
    return this.login(email, password);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.userSignal.set(null);
  }
}
