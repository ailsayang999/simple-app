import { Component, inject, OnInit, signal, WritableSignal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { AdminService, UserWithRolesDto } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';

// PrimeNG
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';

@Component({
  standalone: true,
  selector: 'app-user-role-management',
  templateUrl: './user-role-management.html',
  styleUrls: ['./user-role-management.scss'],
  imports: [CommonModule, FormsModule, ConfirmDialogModule, ButtonModule],
  providers: [ConfirmationService, MessageService],
})
export class UserRoleManagementComponent implements OnInit {
  private admin = inject(AdminService);
  private auth = inject(AuthService);
  private confirmationService = inject(ConfirmationService);

  // ✅ Signals 狀態
  users: WritableSignal<UserWithRolesDto[]> = signal([]);
  allRoles: WritableSignal<string[]> = signal([]);

  loading = signal(false);
  savingUserId = signal<string | null>(null);
  error = signal('');
  success = signal('');

  // ⭐ 目前登入者 Id（用來判斷「不能刪自己」）
  currentUserId = computed(() => this.auth.userSignal()?.id ?? null);

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    forkJoin({
      roles: this.admin.getAllRoles(),
      users: this.admin.getUsersWithRoles(),
    })
      .pipe(
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: ({ roles, users }) => {
          this.allRoles.set(roles);
          this.users.set(users);
        },
        error: () => {
          this.error.set('讀取角色或使用者清單失敗');
        },
      });
  }

  toggleRole(user: UserWithRolesDto, role: string) {
    const hasRole = user.roles.includes(role);
    if (hasRole) {
      user.roles = user.roles.filter((r) => r !== role);
    } else {
      user.roles = [...user.roles, role];
    }
  }

  saveUserRoles(user: UserWithRolesDto) {
    this.savingUserId.set(user.id);
    this.error.set('');
    this.success.set('');

    this.admin.updateUserRoles(user.id, user.roles).subscribe({
      next: () => {
        this.savingUserId.set(null);
        this.success.set('已儲存變更 🎉');
        setTimeout(() => this.success.set(''), 2000);
      },
      error: () => {
        this.savingUserId.set(null);
        this.error.set('儲存失敗，請稍後再試');
      },
    });
  }

  // 🔥 這個是點「刪除」按鈕時叫的
  confirmDeleteUser(user: UserWithRolesDto) {
    // 前端先擋一次（UX 友善）
    if (this.currentUserId() === user.id) {
      this.error.set('你不能刪除自己的帳號');
      setTimeout(() => this.error.set(''), 2000);
      return;
    }

    this.confirmationService.confirm({
      message: `你確定要刪除使用者「${user.email}」嗎？此動作無法復原。`,
      header: '刪除使用者確認',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: '確定刪除',
      rejectLabel: '取消',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => this.deleteUser(user),
    });
  }

  // ✅ 實際呼叫 API 的刪除
  private deleteUser(user: UserWithRolesDto) {
    this.savingUserId.set(user.id);
    this.error.set('');
    this.success.set('');

    this.admin
      .deleteUser(user.id)
      .pipe(finalize(() => this.savingUserId.set(null)))
      .subscribe({
        next: () => {
          // 從列表移除這個 user
          this.users.update((list) => list.filter((u) => u.id !== user.id));
          this.success.set('使用者已刪除 🗑️');
          setTimeout(() => this.success.set(''), 2000);
        },
        error: (err) => {
          if (err?.status === 400) {
            this.error.set(err.error?.message ?? '不能刪除自己帳號');
          } else {
            this.error.set('刪除失敗，請稍後再試');
          }
          setTimeout(() => this.error.set(''), 2000);
        },
      });
  }
}
