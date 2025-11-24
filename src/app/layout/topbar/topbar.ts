// src/app/layout/topbar/topbar.ts
import { Component, EventEmitter, Output, Input, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';
import { PopoverModule } from 'primeng/popover';
import { TabsModule } from 'primeng/tabs';

@Component({
  standalone: true,
  selector: 'app-topbar',
  templateUrl: './topbar.html',
  styleUrls: ['./topbar.scss'],
  imports: [CommonModule, ToggleSwitch, FormsModule, PopoverModule, TabsModule],
})
export class Topbar {
  private auth = inject(AuthService);
  private router = inject(Router);
  readonly user = computed(() => this.auth.userSignal());
  // ✅ 綁給 ToggleSwitch 的狀態
  isDark = false;

  // ⭐ 目前選到哪個 tab
  activeUserTab: string = 'profile';

  @Output() toggleSidebar1 = new EventEmitter<void>();

  constructor() {
    // 初始化時，根據 html 上有沒有 my-app-dark 來決定開關預設值
    this.isDark = document.documentElement.classList.contains('my-app-dark');
  }

  // ✅ 用於 ToggleSwitch 事件
  onThemeToggle(checked: boolean) {
    this.isDark = checked;

    if (checked) {
      document.documentElement.classList.add('my-app-dark');
    } else {
      document.documentElement.classList.remove('my-app-dark');
    }
  }

  onToggleSidebar() {
    this.toggleSidebar1.emit();
  }

  logout() {
    // 1. 清掉 token / 使用者
    this.auth.logout();

    // 2. 導回登入頁（可帶 returnUrl 或不帶）
    this.router.navigate(['/auth/login']);
  }
}
