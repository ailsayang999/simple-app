// src/app/pages/account-setting/account-setting.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService, AuthUser } from '../../core/services/auth.service';
import { finalize } from 'rxjs';

import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FileUploadModule, FileSelectEvent, FileUpload } from 'primeng/fileupload';
import { ViewChild } from '@angular/core';

type AccountFormModel = {
  name: string;
  email: string;
  password: string;
  avatarUrl: string; // ⭐ 會被填入 Base64
};

@Component({
  standalone: true,
  selector: 'app-account-setting',
  templateUrl: './account-setting.html',
  styleUrls: ['./account-setting.scss'],
  imports: [CommonModule, ReactiveFormsModule, ToastModule, FileUploadModule],
  providers: [MessageService],
})
export class AccountSetting implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private messageService = inject(MessageService);

  private readonly USER_KEY = 'demo_user';

  form!: FormGroup;
  currentUser: AuthUser | null = null;

  originalSnapshot!: AccountFormModel; // ⭐ 送出前的原始快照（後端錯誤時回復用）

  isSaving = false;
  saveError: string | null = null;
  saveSuccess = false;

  @ViewChild('avatarUpload') avatarUpload?: FileUpload; // ⭐ 對應 #avatarUpload

  ngOnInit(): void {
    this.currentUser = this.auth.userSignal();

    if (!this.currentUser) {
      const fromLs = this.loadUserFromLocalStorage();
      if (fromLs) {
        this.currentUser = {
          id: fromLs.id ?? '1',
          name: fromLs.name,
          email: fromLs.email,
          avatarUrl: fromLs.avatarUrl,
        };
        this.auth.userSignal.set(this.currentUser);
      }
    }

    this.buildForm();
    this.originalSnapshot = this.form.getRawValue() as AccountFormModel; // ⭐ 初始化 snapshot：一開始畫面載入的狀態

    // ⭐ 使用者只要一改值，就把 success / error 清掉
    this.form.valueChanges.subscribe(() => {
      this.saveError = null;
      this.saveSuccess = false;
    });
  }

  private buildForm(): void {
    this.form = this.fb.nonNullable.group<AccountFormModel>({
      name: this.currentUser?.name ?? '',
      email: this.currentUser?.email ?? '',
      password: '',
      avatarUrl: this.currentUser?.avatarUrl ?? '',
    });

    this.form.get('name')!.addValidators([Validators.required]);
    this.form.get('email')!.addValidators([Validators.required, Validators.email]);
    // ⭐ 自訂「可選填 + 最少 6 碼」的 validator
    this.form.get('password')!.addValidators([this.optionalMinLength(6)]);
  }
  // 密碼可選填：空字串通過，有值時才檢查 minlength
  private optionalMinLength(min: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value ?? '') as string;
      if (!value) return null;
      return value.length >= min ? null : { minlength: true };
    };
  }

  private loadUserFromLocalStorage(): any | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  hasError(controlName: keyof AccountFormModel, error: string): boolean {
    const ctrl = this.form.get(controlName);
    return !!ctrl && ctrl.touched && ctrl.hasError(error);
  }

  // ⭐ 處理選檔事件（轉 Base64 + 即時預覽）
  onAvatarSelect(event: FileSelectEvent) {
    const file = event.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;

      // 更新 form 裡的 avatarUrl（右側預覽會跟著變）
      this.form.patchValue({ avatarUrl: base64 });

      this.messageService.add({
        severity: 'info',
        summary: '上傳成功',
        detail: '頭像已更新（尚未儲存）。',
        life: 2500,
      });
    };

    reader.readAsDataURL(file);
  }

  onReset(): void {
    this.form.reset({
      ...this.originalSnapshot,
      password: '',
    });

    // ⭐ 清掉 FileUpload 的檔案 + label（No file chosen）
    this.avatarUpload?.clear();

    this.saveError = null;
    this.saveSuccess = false;
  }

  // ⭐ 後端成功才更新 localStorage + userSignal
  // ⭐ 後端錯誤：回原本 snapshot，不動 localStorage / userSignal
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const submitSnapshot = this.form.getRawValue() as AccountFormModel;

    this.isSaving = true;
    this.saveError = null;
    this.saveSuccess = false;

    this.http
      .put('/api/account/profile', submitSnapshot) // ⚠ 換成你的 API
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: (res: any) => {
          this.saveSuccess = true;

          const updatedUser: AuthUser = {
            id: this.currentUser?.id ?? '1',
            name: res?.name ?? submitSnapshot.name,
            email: res?.email ?? submitSnapshot.email,
            avatarUrl: res?.avatarUrl ?? submitSnapshot.avatarUrl,
          };
          // ✅ 成功才更新 AuthService + localStorage
          this.auth.userSignal.set(updatedUser);
          this.currentUser = updatedUser;

          localStorage.setItem(
            this.USER_KEY,
            JSON.stringify({
              ...updatedUser,
              password: submitSnapshot.password ?? '',
            })
          );

          // ✅ 更新成功後，把 snapshot 換成這次成功的值（之後錯誤就回復這個）
          this.originalSnapshot = {
            ...submitSnapshot,
            password: '', // 下次 reset 時密碼預設還是空的
          };

          // ✅「儲存成功後也清掉上傳區」
          this.avatarUpload?.clear();

          this.messageService.add({
            severity: 'success',
            summary: '更新成功',
            detail: '帳號資料已儲存。',
            life: 3000,
          });
        },

        error: (err) => {
          console.error(err);

          this.saveError = '後端儲存失敗，已還原設定。';

          // ❗ 回復成送出前的狀態
          this.form.reset({
            ...this.originalSnapshot,
            password: '',
          });

          // ⭐ 後端失敗時也清空 upload 檔案名稱
          this.avatarUpload?.clear();

          this.messageService.add({
            severity: 'error',
            summary: '儲存失敗',
            detail: '後端錯誤，設定已還原。',
            life: 4000,
          });
        },
      });
  }

  // 預覽顯示
  get avatarPreviewUrl(): string {
    const v = this.form.getRawValue() as AccountFormModel;
    return v.avatarUrl || this.currentUser?.avatarUrl || 'https://via.placeholder.com/160';
  }

  get displayName(): string {
    return this.form.get('name')?.value || this.currentUser?.name || '';
  }

  get displayEmail(): string {
    return this.form.get('email')?.value || this.currentUser?.email || '';
  }
}
