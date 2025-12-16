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
      // ✅ 先照原本方式建立「路由鏈」breadcrumb
      const base = this.buildBreadcrumbItems(this.route.root);

      // ✅ 補 breadcrumbParent（即使 routes 並列，也能有階層）
      const finalItems = this.applyBreadcrumbParent(base, this.route.root);

      this.items.set(finalItems);
    });
  }

  private buildBreadcrumbItems(route: ActivatedRoute): MenuItem[] {
    const result: MenuItem[] = [];
    let current: ActivatedRoute | null = route;

    while (current) {
      const config = current.routeConfig;
      const data = config?.data as
        | { breadcrumb?: BreadcrumbData; breadcrumbParent?: string; breadcrumbKey?: string }
        | undefined;

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
    // ✅ 小修：用 snapshot.url 會比 routeConfig.path 更準（會帶入真實參數值）
    // 但你原本用 routeConfig.path 也能跑，只是遇到 :id 會變成 ':id' 而非真實值
    const segments: string[] = [];
    let current: ActivatedRoute | null = route;

    while (current) {
      // 使用「真實 url segment」
      const urlParts = current.snapshot.url.map((s) => s.path);
      if (urlParts.length) {
        segments.unshift(...urlParts);
      }
      current = current.parent;
    }

    return ['/', ...segments];
  }

  // ✅ 核心：支援 breadcrumbParent
  // 你的 routes 設定要像這樣：
  // accounts: data: { breadcrumb: {...}, breadcrumbKey: 'accounts' }
  // accounts/:id: data: { breadcrumb: {...}, breadcrumbParent: 'accounts' }
  private applyBreadcrumbParent(base: MenuItem[], root: ActivatedRoute): MenuItem[] {
    const leaf = this.getLeafRoute(root);

    const leafData = leaf.routeConfig?.data as
      | { breadcrumb?: BreadcrumbData; breadcrumbParent?: string }
      | undefined;

    const parentKey = leafData?.breadcrumbParent;
    if (!parentKey) return base;

    const parentRoute = this.findRouteByBreadcrumbKey(parentKey);
    if (!parentRoute) return base;

    const parentData = parentRoute.data as
      | { breadcrumb?: BreadcrumbData; breadcrumbKey?: string }
      | undefined;

    const parentBreadcrumb = parentData?.breadcrumb;
    if (!parentBreadcrumb) return base;

    // 用「假 ActivatedRoute」不太好做，所以這裡直接把 parent 轉 MenuItem
    const parentItem = this.toMenuItemFromRouteConfig(parentRoute.path ?? '', parentBreadcrumb);
    if (!parentItem) return base;

    // 如果 base 裡已經有 Accounts List（例如你又把 routes 改回 children），就不要重複插
    const exists = base.some(
      (x) =>
        String(x.label) === String(parentItem.label) ||
        this.sameRouterLink(x.routerLink, parentItem.routerLink)
    );
    if (exists) return base;

    // 插到最後一個（通常是 Detail）之前 → Home > Accounts List > Account's Detail
    const result = [...base];
    const insertIndex = Math.max(0, result.length - 1);
    result.splice(insertIndex, 0, parentItem);

    return result;
  }

  private getLeafRoute(root: ActivatedRoute): ActivatedRoute {
    let current: ActivatedRoute = root;
    while (current.firstChild) current = current.firstChild;
    return current;
  }

  private findRouteByBreadcrumbKey(key: string) {
    // 從 router.config 走訪找 data.breadcrumbKey === key
    return this.findInRoutes(this.router.config, key);
  }

  private findInRoutes(routes: any[], key: string): any | null {
    for (const r of routes) {
      const data = r?.data;
      if (data?.breadcrumbKey === key) return r;

      if (r?.children?.length) {
        const found = this.findInRoutes(r.children, key);
        if (found) return found;
      }
    }
    return null;
  }

  private toMenuItemFromRouteConfig(path: string, breadcrumb: BreadcrumbData): MenuItem | null {
    // 文字簡寫： data: { breadcrumb: 'Accounts List' }
    if (typeof breadcrumb === 'string') {
      return {
        label: breadcrumb,
        routerLink: ['/', path],
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
    if (breadcrumb.icon) item.icon = breadcrumb.icon;

    // 是否可點
    if (!breadcrumb.disableLink) {
      if (breadcrumb.routerLink) {
        item.routerLink = breadcrumb.routerLink;
      } else {
        item.routerLink = ['/', path];
      }
    }

    return item;
  }

  private sameRouterLink(a: any, b: any) {
    // RouterLink 可能是 string 或 array
    if (Array.isArray(a) && Array.isArray(b)) return a.join('/') === b.join('/');
    return String(a) === String(b);
  }
}
