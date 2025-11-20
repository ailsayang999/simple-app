// src/app/layout/topbar/topbar.ts
import { Component, EventEmitter, Output, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-topbar',
  templateUrl: './topbar.html',
  styleUrls: ['./topbar.scss'],
  imports: [CommonModule, RouterLink],
})
export class Topbar {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly user = computed(() => this.auth.userSignal());

  @Output() toggleSidebar = new EventEmitter<void>();

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  logout() {
    // 1. 清掉 token / 使用者
    this.auth.logout();

    // 2. 導回登入頁（可帶 returnUrl 或不帶）
    this.router.navigate(['/auth/login']);
  }
}
