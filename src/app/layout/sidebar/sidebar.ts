import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HasRoleDirective } from '../../shared/directives/has-role.directive';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { Permission } from '../../auth/rbac';
import { Role } from '../../auth/rbac';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  imports: [RouterLink, RouterLinkActive, HasRoleDirective, HasPermissionDirective],
})
export class Sidebar {
  @Input() collapsed: boolean = true;
  @Output() toggle = new EventEmitter<void>();

  Permission = Permission; // ✅ 給 HTML 用
  Role = Role; // ⭐⭐ 這行超重要，讓 HTML 可以用 Role.Admin

  onToggle() {
    this.toggle.emit();
  }
}
