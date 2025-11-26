import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';
import { filter } from 'rxjs';

type BreadcrumbData =
  | string
  | {
      label: string;
      icon?: string;
      routerLink?: string | any[];
      disableLink?: boolean;
      skip?: boolean;
    };

@Component({
  standalone: true,
  selector: 'app-breadcrumb',
  imports: [CommonModule, BreadcrumbModule],
  template: `
    <p-breadcrumb
      *ngIf="items().length"
      [model]="items()"
      [home]="home"
      styleClass="app-breadcrumb"
    ></p-breadcrumb>
  `,
})

// 樣式設定在global.scss
export class AppBreadcrumb {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly home: MenuItem = {
    icon: 'pi pi-home',
    routerLink: ['/dashboard'], // 你預設的首頁
  };

  readonly items = signal<MenuItem[]>([]);

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.items.set(this.buildBreadcrumbItems(this.route.root));
    });
  }

  private buildBreadcrumbItems(route: ActivatedRoute): MenuItem[] {
    const result: MenuItem[] = [];
    let current: ActivatedRoute | null = route;

    while (current) {
      const config = current.routeConfig;
      const data = config?.data as { breadcrumb?: BreadcrumbData } | undefined;
      const breadcrumb = data?.breadcrumb;

      if (breadcrumb) {
        const menuItem = this.toMenuItem(current, breadcrumb);
        if (menuItem) {
          result.push(menuItem);
        }
      }

      current = current.firstChild ?? null;
    }

    return result;
  }

  private toMenuItem(route: ActivatedRoute, breadcrumb: BreadcrumbData): MenuItem | null {
    // 文字簡寫： data: { breadcrumb: 'Dashboard' }
    if (typeof breadcrumb === 'string') {
      return {
        label: breadcrumb,
        routerLink: this.getFullUrl(route),
      };
    }

    // skip = true 代表這層不要顯示在麵包屑
    if (breadcrumb.skip) {
      return null;
    }

    const item: MenuItem = {
      label: breadcrumb.label,
    };

    // icon（可選）
    if (breadcrumb.icon) {
      item.icon = breadcrumb.icon;
    }

    // 是否可點
    if (!breadcrumb.disableLink) {
      if (breadcrumb.routerLink) {
        item.routerLink = breadcrumb.routerLink;
      } else {
        item.routerLink = this.getFullUrl(route);
      }
    }

    return item;
  }

  private getFullUrl(route: ActivatedRoute): string[] {
    const segments: string[] = [];
    let current: ActivatedRoute | null = route;

    while (current && current.routeConfig?.path) {
      segments.unshift(current.routeConfig.path);
      current = current.parent;
    }

    return ['/', ...segments];
  }
}
