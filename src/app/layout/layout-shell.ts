import { Component, inject,signal, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './sidebar/sidebar';
import { Topbar } from './topbar/topbar';
import { AppBreadcrumb } from '../shared/breadcrumb/app-breadcrumb';
// ⭐ 新增：載入 AuthService + AuthUser 型別
import { AuthService, AuthUser } from '../core/services/auth.service';

// ⭐ 新增：專門定義「layout 給頁面用的 context」
export interface ShellContext {
  user: AuthUser | null;
  collapsed: boolean;
  toggleSidebar: () => void; // ⭐ 新增：操作方法
}


@Component({
  standalone: true,
  selector: 'app-layout-shell',
  imports: [RouterOutlet, Sidebar, Topbar, AppBreadcrumb],
  templateUrl: './layout-shell.html',
  styleUrl: './layout-shell.scss',
})
export class LayoutShell {
  // ⭐ 新增：注入 AuthService
  private readonly auth = inject(AuthService); // ← 只在這裡碰 service

  readonly collapsed = signal(true);
  readonly sidebarWidth = computed(() => (this.collapsed() ? '72px' : '240px'));

  // ⭐ 新增：直接引用 AuthService 的 userSignal
  readonly user = this.auth.userSignal; // Signal<AuthUser | null>

  // ⭐ 新增：用一個 computed 把「要給頁面的 context」組起來
  readonly shellContext = computed<ShellContext>(() => ({
    user: this.user(),
    collapsed: this.collapsed(),
    toggleSidebar: () => this.toggleSidebar(), // ⭐ 把方法也包進去
  })); // 以後所有 routed pages 都可以拿到這個 context，而 不用再自己 inject AuthService 或算 collapsed

  toggleSidebar(): void {
    this.collapsed.update((v) => !v);
  }
}
