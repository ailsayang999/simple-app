import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { AuthService, Role } from '../../core/services/auth.service';

@Directive({
  selector: '[appHasRole]',
  standalone: true,
})
export class HasRoleDirective {
  private auth = inject(AuthService);
  private viewContainer = inject(ViewContainerRef);
  private templateRef = inject(TemplateRef<any>);

  private roles: Role[] = [];

  @Input()
  set appHasRole(value: Role | Role[]) {
    this.roles = Array.isArray(value) ? value : [value];
    this.updateView();
  }

  constructor() {
    // ✅ 使用 Angular signals 的 effect：user 變動時自動刷新畫面
    effect(() => {
      this.updateView();
    });
  }

  private updateView() {
    const user = this.auth.userSignal();
    const canShow = !!user && (this.roles.length === 0 || this.roles.includes(user.role));

    this.viewContainer.clear();

    if (canShow) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
