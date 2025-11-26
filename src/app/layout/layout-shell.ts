import { Component, signal, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './sidebar/sidebar';
import { Topbar } from './topbar/topbar';
import { AppBreadcrumb } from '../shared/breadcrumb/app-breadcrumb';

@Component({
  standalone: true,
  selector: 'app-layout-shell',
  imports: [RouterOutlet, Sidebar, Topbar, AppBreadcrumb],
  templateUrl: './layout-shell.html',
  styleUrl: './layout-shell.scss',
})
export class LayoutShell {
  readonly collapsed = signal(true);
  readonly sidebarWidth = computed(() => (this.collapsed() ? '72px' : '240px'));

  toggleSidebar(): void {
    this.collapsed.update((v) => !v);
  }
}
