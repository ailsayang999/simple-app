import {
  Component,
  inject,
  OnInit,
  signal, // 引入 signal
  WritableSignal, // 引入 WritableSignal
  computed, // 引入 computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { AdminService, UserWithRolesDto } from '../../core/services/admin.service';

@Component({
  standalone: true,
  selector: 'app-user-role-management',
  templateUrl: './user-role-management.html',
  styleUrls: ['./user-role-management.scss'],
  imports: [CommonModule, FormsModule],
  // 💡 建議：切換到 OnPush 策略，因為所有狀態都由 Signals 管理，效能更佳！
  // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserRoleManagementComponent implements OnInit {
  private admin = inject(AdminService);
  // private cdr = inject(ChangeDetectorRef); // 轉換為 Signals 後，不再需要 ChangeDetectorRef

  // ⭐️ 狀態轉換為 WritableSignal
  users: WritableSignal<UserWithRolesDto[]> = signal([]);
  allRoles: WritableSignal<string[]> = signal([]);

  loading: WritableSignal<boolean> = signal(false);
  savingUserId: WritableSignal<string | null> = signal(null);
  error: WritableSignal<string> = signal('');
  success: WritableSignal<string> = signal('');

  // 移除 constructor

  ngOnInit() {
    // 初始資料載入，不需要 setTimeout 來避免 NG0100 錯誤！
    this.loadData();
  }

  private loadData() {
    this.loading.set(true); // 使用 .set() 來更新 Signal
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
      // 這裡直接修改 user 對象的 roles 數組，這是一個內部修改。
      // 注意：如果您希望 Angular 知道這個數組變了，可能需要複製一份並重新賦值給 user 對象，
      // 但在您的表格邏輯中，這通常是可接受的。
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

        // ⭐️ Signal 的優勢：setTimeout 內更新狀態是安全的！
        setTimeout(() => {
          this.success.set('');
        }, 2000);
      },
      error: () => {
        this.savingUserId.set(null);
        this.error.set('儲存失敗，請稍後再試');
      },
    });
  }
}
