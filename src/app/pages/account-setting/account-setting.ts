import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService, AuthUser } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-account-setting',
  templateUrl: './account-setting.html',
  styleUrls: ['./account-setting.scss'],
  imports: [CommonModule, ReactiveFormsModule],
})
export class AccountSetting implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  form!: FormGroup;

  // 畫面狀態
  isSaving = false;
  saveError: string | null = null;
  saveSuccess = false;

  // 目前登入使用者（從 AuthService 的 signal 抓）
  currentUser: AuthUser | null = null;

  // localStorage 用的 key（要跟 AuthService 的 USER_KEY 一致）
  private readonly USER_KEY = 'demo_user';

  ngOnInit(): void {
    this.currentUser = this.auth.userSignal(); // signal() 取目前值

    this.form = this.fb.group({
      name: [this.currentUser?.name ?? '', [Validators.required]],
      email: [this.currentUser?.email ?? '', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]], // 密碼通常不預填
      avatarUrl: [this.currentUser?.avatarUrl ?? ''],
    });

    // ⭐ 即時同步 localStorage + AuthService.userSignal
    this.form.valueChanges.subscribe((value) => {
      // 沒登入理論上不會進到這頁，但保險防呆
      if (!this.currentUser) {
        return;
      }

      // localStorage 裡存的物件，可以比 AuthUser 多一個 password 欄位
      const updatedForStorage = {
        ...this.currentUser,
        name: value.name ?? this.currentUser.name,
        email: value.email ?? this.currentUser.email,
        avatarUrl: value.avatarUrl ?? this.currentUser.avatarUrl,
        // Demo 需求：密碼也放進 localStorage（正式環境不建議！）
        password: value.password ?? '',
      };

      // 寫回 localStorage
      localStorage.setItem(this.USER_KEY, JSON.stringify(updatedForStorage));

      // 更新 AuthService.userSignal（不含 password，因為型別沒有）
      const updatedUser: AuthUser = {
        id: this.currentUser.id,
        name: updatedForStorage.name,
        email: updatedForStorage.email,
        avatarUrl: updatedForStorage.avatarUrl,
      };
      this.auth.userSignal.set(updatedUser);

      // 同步 this.currentUser，避免後續使用舊資料
      this.currentUser = updatedUser;
    });
  }

  // 小工具：讓 template 好寫
  hasError(controlName: string, error: string): boolean {
    const ctrl = this.form.get(controlName);
    return !!ctrl && ctrl.touched && ctrl.hasError(error);
  }

  // ✅ 送出給後端
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.saveError = null;
    this.saveSuccess = false;

    const formValue = this.form.value;

    const payload = {
      name: formValue.name,
      email: formValue.email,
      password: formValue.password, // 可以由後端決定為空時是否忽略
      avatarUrl: formValue.avatarUrl,
    };

    // ⚠️ 這裡請改成你實際的 API URL
    this.http.put('/api/account/profile', payload).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.saveSuccess = true;

        // 以後端回傳為主（如果沒有就用 payload）
        const baseUser = this.auth.userSignal() ?? this.currentUser;

        const updatedUser: AuthUser = {
          id: baseUser?.id ?? res?.id ?? '1',
          name: res?.name ?? payload.name,
          email: res?.email ?? payload.email,
          avatarUrl: res?.avatarUrl ?? payload.avatarUrl,
        };

        // 更新 AuthService signal
        this.auth.userSignal.set(updatedUser);
        this.currentUser = updatedUser;

        // 再正式寫回 localStorage（包含 password）
        const finalForStorage = {
          ...updatedUser,
          password: payload.password ?? '',
        };
        localStorage.setItem(this.USER_KEY, JSON.stringify(finalForStorage));
      },
      error: (err) => {
        console.error(err);
        this.isSaving = false;
        this.saveError = '儲存失敗，請稍後再試一次';
      },
    });
  }
}
