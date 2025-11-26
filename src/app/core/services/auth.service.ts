import { Injectable, signal } from '@angular/core';

export type Role = 'ADMIN' | 'USER'; // 👈 先定義角色型別

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: Role; // 👈 新增角色
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

  // ✅ 判斷角色的小工具
  hasRole(role: Role): boolean {
    const user = this.userSignal();
    return !!user && user.role === role;
  }

  hasAnyRole(roles: Role[]): boolean {
    const user = this.userSignal();
    if (!user) return false;
    return roles.includes(user.role);
  }

  login(email: string, password: string): boolean {
    // ⚠️ Demo 用：真實情境應該從後端 API 回傳角色
    const fakeToken = 'FAKE_JWT_TOKEN';

    // 範例：如果是 admin 帳號就給 ADMIN，其他都是 USER
    const role: Role = email === 'admin@test.com' ? 'ADMIN' : 'USER';

    const fakeUser: AuthUser = {
      id: '1',
      name: 'John Doe',
      email,
      avatarUrl: 'https://i.pravatar.cc/100?img=8',
      role,
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
