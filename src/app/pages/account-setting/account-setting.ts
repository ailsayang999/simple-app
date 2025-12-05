// src/app/pages/account-setting/account-setting.ts
import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService, AuthUser } from '../../core/services/auth.service';
import { finalize } from 'rxjs';

import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FileUploadModule, FileSelectEvent, FileUpload } from 'primeng/fileupload';
import { environment } from '../../../environments/environment';

type AccountFormModel = {
  name: string;
  email: string;
  avatarUrl: string;

  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
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
  private baseUrl = environment.apiUrl;

  form!: FormGroup;
  currentUser: AuthUser | null = null;

  originalSnapshot!: AccountFormModel;

  isSaving = false;
  saveError: string | null = null;
  saveSuccess = false;

  @ViewChild('avatarUpload') avatarUpload?: FileUpload;

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
          roles: fromLs.roles ?? [],
          permissions: fromLs.permissions ?? [],
        };
        this.auth.userSignal.set(this.currentUser);
      }
    }

    this.buildForm();
    this.originalSnapshot = this.form.getRawValue() as AccountFormModel;

    this.form.valueChanges.subscribe(() => {
      this.saveError = null;
      this.saveSuccess = false;
    });
  }

  private buildForm(): void {
    this.form = this.fb.nonNullable.group<AccountFormModel>(
      {
        name: this.currentUser?.name ?? '',
        email: this.currentUser?.email ?? '',
        avatarUrl: this.currentUser?.avatarUrl ?? '',

        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      },
      {
        validators: this.passwordChangeValidator(),
      }
    );

    this.form.get('name')!.addValidators([Validators.required]);
    this.form.get('email')!.addValidators([Validators.required, Validators.email]);

    // 新密碼：可選填，但有填要 >= 6 碼
    this.form.get('newPassword')!.addValidators([this.optionalMinLength(6)]);
  }

  // 密碼可選填：空字串通過，有值時才檢查 minlength
  private optionalMinLength(min: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value ?? '') as string;
      if (!value) return null;
      return value.length >= min ? null : { minlength: true };
    };
  }

  // ⭐ 群組層級驗證：三個欄位只要有填任何一個 → 三個都要填，而且 new / confirm 要一樣
  private passwordChangeValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const current = group.get('currentPassword');
      const newer = group.get('newPassword');
      const confirm = group.get('confirmPassword');

      if (!current || !newer || !confirm) return null;

      const currentVal = (current.value ?? '') as string;
      const newVal = (newer.value ?? '') as string;
      const confirmVal = (confirm.value ?? '') as string;

      const anyFilled = currentVal || newVal || confirmVal;

      // 先清掉我們自己加的錯誤
      this.setControlError(current, 'requiredPasswordChange', false);
      this.setControlError(newer, 'requiredPasswordChange', false);
      this.setControlError(confirm, 'requiredPasswordChange', false);
      this.setControlError(confirm, 'passwordMismatch', false);

      if (!anyFilled) {
        // 完全沒填 → 密碼變更整塊跳過
        return null;
      }

      const errors: any = {};

      if (!currentVal) {
        this.setControlError(current, 'requiredPasswordChange', true);
        errors.currentRequired = true;
      }

      if (!newVal) {
        this.setControlError(newer, 'requiredPasswordChange', true);
        errors.newRequired = true;
      }

      if (!confirmVal) {
        this.setControlError(confirm, 'requiredPasswordChange', true);
        errors.confirmRequired = true;
      }

      if (newVal && confirmVal && newVal !== confirmVal) {
        this.setControlError(confirm, 'passwordMismatch', true);
        errors.mismatch = true;
      }

      return Object.keys(errors).length ? { passwordChangeInvalid: errors } : null;
    };
  }

  private setControlError(control: AbstractControl, key: string, shouldSet: boolean) {
    const errors = { ...(control.errors || {}) };

    if (shouldSet) {
      errors[key] = true;
    } else {
      delete errors[key];
    }

    const hasKeys = Object.keys(errors).length > 0;
    control.setErrors(hasKeys ? errors : null);
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

  // 處理上傳頭像
  onAvatarSelect(event: FileSelectEvent) {
    const file = event.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;

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
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });

    this.avatarUpload?.clear();

    this.saveError = null;
    this.saveSuccess = false;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const submitSnapshot = this.form.getRawValue() as AccountFormModel;

    this.isSaving = true;
    this.saveError = null;
    this.saveSuccess = false;

    const payload = {
      name: submitSnapshot.name,
      email: submitSnapshot.email,
      avatarUrl: submitSnapshot.avatarUrl,
      currentPassword: submitSnapshot.currentPassword || null,
      newPassword: submitSnapshot.newPassword || null,
      confirmPassword: submitSnapshot.confirmPassword || null,
    };

    this.http
      .put(`${this.baseUrl}/account/profile`, payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: (res: any) => {
          this.saveSuccess = true;

          const updatedUser: AuthUser = {
            id: this.currentUser?.id ?? '1',
            name: res?.name ?? submitSnapshot.name,
            email: res?.email ?? submitSnapshot.email,
            avatarUrl: res?.avatarUrl ?? submitSnapshot.avatarUrl,
            roles: this.currentUser?.roles ?? [],
            permissions: this.currentUser?.permissions ?? [],
          };

          // ✅ 成功才更新 AuthService + localStorage（不再存任何密碼）
          this.auth.userSignal.set(updatedUser);
          this.currentUser = updatedUser;

          localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));

          // ✅ 更新成功後，snapshot 換成最新值（密碼欄位還是空）
          this.originalSnapshot = {
            name: updatedUser.name,
            email: updatedUser.email,
            avatarUrl: updatedUser.avatarUrl ?? '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          };

          // 清除密碼欄位 + 上傳區
          this.form.patchValue({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          });
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

          this.saveError = err?.error?.message ?? '後端儲存失敗，已還原設定。';

          this.form.reset({
            ...this.originalSnapshot,
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          });

          this.avatarUpload?.clear();

          this.messageService.add({
            severity: 'error',
            summary: '儲存失敗',
            detail: this.saveError ?? undefined,
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
