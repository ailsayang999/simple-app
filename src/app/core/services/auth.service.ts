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

    // TODO:demo：根據 email 給角色
    let roles: Role[] = [];

    if (email === 'admin@test.com') {
      roles = [Role.Admin, Role.Manager, Role.ReportViewer, Role.User]; // 多個角色
      console.log('roles', roles); // ['ADMIN', 'MANAGER', 'REPORT_VIEWER', 'USER']
    } else if (email === 'manager@test.com') {
      roles = [Role.Manager];
      console.log('roles', roles); // ['MANAGER']
    } else if (email === 'report@test.com') {
      roles = [Role.ReportViewer];
      console.log('roles', roles); // ['REPORT_VIEWER']
    }

    // 依角色組出 permissions（真實環境通常後端直接回傳）
    // 如果roles是 ['ADMIN', 'MANAGER', 'REPORT_VIEWER', 'USER']，permissions 就是['fund.read', 'fund.write', 'product.view', 'product.edit']
    // 如果roles是 ['MANAGER']，permissions 就是['fund.read', 'product.view', 'product.edit']
    // 如果roles是 ['REPORT_VIEWER']，permissions 就是['fund.read', 'product.view']
    const permissions = Array.from(new Set(roles.flatMap((r) => ROLE_PERMISSIONS[r] ?? [])));
    // let a = roles.flatMap((r) => ROLE_PERMISSIONS[r] ?? []);
    // console.log('a', a); // ['fund.read', 'fund.write', 'product.view', 'product.edit', 'fund.read', 'product.view', 'product.edit', 'fund.read', 'product.view']
    // let b = new Set(a); // {'fund.read', 'fund.write', 'product.view', 'product.edit'}
    // console.log('b', b);
    // let c = Array.from(b);
    // console.log('c', c); //  ['fund.read', 'fund.write', 'product.view', 'product.edit']

    const fakeUser: AuthUser = {
      id: '1',
      name: 'John Doe',
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

  // TODO: 前端註冊
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

// // ⭐ 如果接上後端：
// // src/app/core/services/auth.service.ts
// import { Injectable, signal } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { map, tap } from 'rxjs';
// import { Role, Permission } from '../../auth/rbac';

// export interface AuthUser {
//   id: string;
//   name: string;
//   email: string;
//   avatarUrl?: string;
//   roles: Role[];
//   permissions: Permission[];
// }

// // 後端回傳格式（你可以依實際 API 調整）
// interface LoginResponse {
//   token: string;
//   user: {
//     id: string;
//     name: string;
//     email: string;
//     avatarUrl?: string;
//     roles: string[]; // 後端傳來的 raw 字串
//     permissions: string[]; // 後端傳來的 raw 字串
//   };
// }

// type RegisterResponse = LoginResponse; // ⭐ 後端回同樣格式就直接共用

// @Injectable({ providedIn: 'root' })
// export class AuthService {
//   private readonly TOKEN_KEY = 'demo_token';
//   private readonly USER_KEY = 'demo_user';

//   readonly userSignal = signal<AuthUser | null>(this.loadUser());

//   constructor(private http: HttpClient) {}

//   private loadUser(): AuthUser | null {
//     const json = localStorage.getItem(this.USER_KEY);
//     if (!json) return null;

//     try {
//       const raw = JSON.parse(json);
//       return {
//         id: raw.id,
//         name: raw.name,
//         email: raw.email,
//         avatarUrl: raw.avatarUrl,
//         roles: raw.roles ?? [],
//         permissions: raw.permissions ?? [],
//       } as AuthUser;
//     } catch {
//       return null;
//     }
//   }

//   isLoggedIn(): boolean {
//     return !!localStorage.getItem(this.TOKEN_KEY);
//   }

//   // ========================
//   // ⭐ 真正接後端的 login() ⭐
//   // ========================
//   login(email: string, password: string) {
//     return this.http.post<LoginResponse>('/api/auth/login', { email, password }).pipe(
//       tap((res) => {
//         this.handleAuthSuccess(res);
//       }),
//       map(() => true) // component 收到的是 boolean（成功與否）
//     );
//   }

//   // ========================
//   // ⭐ 真正接後端的 register() ⭐
//   // ========================
//   register(name: string, email: string, password: string) {
//     return this.http.post<RegisterResponse>('/api/auth/register', { name, email, password }).pipe(
//       tap((res) => this.handleAuthSuccess(res)), // ✅ 註冊成功順便登入
//       map(() => true)
//     );
//   }

//   // 把後端回傳的資料整理成 AuthUser + 存 localStorage + 更新 signal
//   private handleAuthSuccess(res: LoginResponse) {
//     const rawUser = res.user;

//     // 後端給的是 string[]，這裡轉成 enum（如果完全對得起來）
//     const roles = (rawUser.roles ?? []).map((r) => r as Role);
//     const permissions = (rawUser.permissions ?? []).map((p) => p as Permission);

//     const user: AuthUser = {
//       id: rawUser.id,
//       name: rawUser.name,
//       email: rawUser.email,
//       avatarUrl: rawUser.avatarUrl,
//       roles,
//       permissions,
//     };

//     // 存 token + user
//     localStorage.setItem(this.TOKEN_KEY, res.token);
//     localStorage.setItem(this.USER_KEY, JSON.stringify(user));
//     this.userSignal.set(user);
//   }

//   logout(): void {
//     localStorage.removeItem(this.TOKEN_KEY);
//     localStorage.removeItem(this.USER_KEY);
//     this.userSignal.set(null);
//   }

//   // 你原本的 hasRole / hasAnyPermission 也可以保留：
//   hasAnyRole(roles: Role[]): boolean {
//     const user = this.userSignal();
//     if (!user) return false;
//     return roles.some((r) => user.roles.includes(r));
//   }

//   hasAnyPermission(perms: Permission[]): boolean {
//     const user = this.userSignal();
//     if (!user) return false;
//     return perms.some((p) => user.permissions.includes(p));
//   }
// }
