import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Role } from '../../auth/rbac';

@Directive({
  selector: '[appHasRole]',
  standalone: true,
})
export class HasRoleDirective {
  private auth = inject(AuthService);
  private viewContainer = inject(ViewContainerRef);
  private templateRef = inject(TemplateRef<any>);

  // 這個指令要求的「角色條件」
  private requiredRoles: Role[] = [];

  // 用法：
  // *appHasRole="'ADMIN'"
  // *appHasRole="[Role.Admin, Role.Manager]"
  @Input()
  set appHasRole(value: Role | Role[]) {
    this.requiredRoles = Array.isArray(value) ? value : [value];
    this.updateView();
  }

  constructor() {
    // 讓 userSignal 變動時會自動重算
    effect(() => {
      this.updateView();
    });
  }

  private updateView() {
    const user = this.auth.userSignal();

    const canShow =
      !!user &&
      // 沒設任何 requiredRoles = 全部可看
      (this.requiredRoles.length === 0 ||
        // 只要 user.roles 中有其中一個 requiredRoles 就可以
        this.requiredRoles.some((r) => user.roles?.includes(r)));

    this.viewContainer.clear();

    if (canShow) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
