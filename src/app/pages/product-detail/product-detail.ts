import { Component, Input, computed, signal, inject, Signal } from '@angular/core';
import { numberAttribute } from '@angular/core'; // 轉成 number 用的 helper
// ⭐ 新增：拿 routerOutletData 用
import { ROUTER_OUTLET_DATA } from '@angular/router';
// ⭐ 新增：把 ShellContext 型別拿進來用
import type { ShellContext } from '../../layout/layout-shell';

@Component({
  standalone: true,
  selector: 'app-product-detail',
  templateUrl: './product-detail.html',
})

export class ProductDetail {
  // 不用 ActivatedRoute、不需要手動訂閱 / 退訂
  // input 名稱和路由 key 對應就好
  // type 很清楚（id: number、tab?: string
  @Input({ transform: numberAttribute }) id!: number; // /products/123 → id = 123
  @Input() tab?: string; // /products/123?tab=price → tab = 'price'
  @Input() title?: string; // 從route的data來
  @Input() breadcrumb?: any; // 從route的data來

  // ⭐ 新增：從 router-outlet 拿到 context（user + collapsed）
  private readonly _ctx = inject(ROUTER_OUTLET_DATA) as Signal<ShellContext | null>;

  // ⭐ 包成 computed 方便使用
  readonly user = computed(() => this._ctx()?.user ?? null);
  readonly collapsed = computed(() => this._ctx()?.collapsed ?? true);
  toggleSidebarFromPage() {
    this._ctx()?.toggleSidebar();
  }

  // 這裡示範你可能會用 signal 抓後端資料
  private _loading = signal(true);
  loading = this._loading.asReadonly();

  // 這裡假裝 call service，實作就略過
  ngOnInit() {
    // 這裡就可以直接用 this.id, this.tab
    // 不用再 inject ActivatedRoute + subscribe
    // ...發 request，最後 set product & loading
    this._loading.set(false);
    //this._product.set('My Product');
  }
}
