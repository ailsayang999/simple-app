import { Injectable, signal } from '@angular/core';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'demo_token';
  private readonly USER_KEY = 'demo_user';

  readonly userSignal = signal<AuthUser | null>(this.loadUser());

  private loadUser(): AuthUser | null {
    const json = localStorage.getItem(this.USER_KEY);
    return json ? JSON.parse(json) : null;
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  login(email: string, password: string): boolean {
    // Demo：直接通過，真實環境要 call API
    const fakeToken = 'FAKE_JWT_TOKEN';
    const fakeUser: AuthUser = {
      id: '1',
      name: 'John Doe',
      email,
      avatarUrl: 'https://i.pravatar.cc/100?img=1',
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
