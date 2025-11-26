// src/app/shared/directives/has-permission.directive.ts
import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Permission } from '../../auth/rbac';

@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private auth = inject(AuthService);
  private viewContainer = inject(ViewContainerRef);
  private templateRef = inject(TemplateRef<any>);

  private requiredPermissions: Permission[] = [];

  @Input()
  set appHasPermission(value: Permission | Permission[]) {
    this.requiredPermissions = Array.isArray(value) ? value : [value];
    this.updateView();
  }

  constructor() {
    // userSignal 變動時會自動 re-run
    effect(() => {
      this.updateView();
    });
  }

  private updateView() {
    const user = this.auth.userSignal();
    const userPerms: Permission[] = user?.permissions ?? []; // ⭐ 防守 undefined

    const canShow =
      !!user &&
      // 如果沒有設定 requiredPermissions，就只要有登入就顯示
      (this.requiredPermissions.length === 0
        ? true
        : this.requiredPermissions.some((p) => userPerms.includes(p)));

    this.viewContainer.clear();

    if (canShow) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
