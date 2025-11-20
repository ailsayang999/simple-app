import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-register',
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  imports: [CommonModule, FormsModule, RouterLink],
})
export class Register {
  private auth = inject(AuthService);
  private router = inject(Router);

  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  error = '';
  loading = false;

  submit() {
    this.error = '';

    if (!this.name.trim()) {
      this.error = '請輸入名稱';
      return;
    }

    if (!this.email.trim()) {
      this.error = '請輸入 Email';
      return;
    }

    if (!this.password.trim()) {
      this.error = '請輸入密碼';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = '密碼與確認密碼不一致';
      return;
    }

    this.loading = true;

    // Demo：直接註冊成功（你的 AuthService.register() 會自動 login）
    const ok = this.auth.register(this.name, this.email, this.password);
    this.loading = false;

    if (!ok) {
      this.error = '註冊失敗，請稍後再試。';
      return;
    }

    // 註冊成功 → 導回首頁
    this.router.navigate(['/']);
  }
}
