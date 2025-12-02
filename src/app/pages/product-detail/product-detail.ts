import { Component, Input, computed, signal, inject, Signal } from '@angular/core';
import { numberAttribute } from '@angular/core'; // 轉成 number 用的 helper
// ⭐ 新增：拿 routerOutletData 用
import { ROUTER_OUTLET_DATA } from '@angular/router';
// ⭐ 新增：把 ShellContext 型別拿進來用
import type { ShellContext } from '../../layout/layout-shell';

@Component({
  standalone: true,
  selector: 'app-product-detail',
  template: `
    <section class="page">
      <header class="page-header">
        <!-- ⭐ 使用從 routerOutletData 傳來的 user -->
        @if (user(); as u) {
        <h1>RouterOutlet Input</h1>
        <p>
          User Name from RouterOutlet Input:
          <strong [style.color]="'blue'">{{ u?.name ?? 'Guest' }}</strong>
        </p>
        <p class="subtitle">
          User Email from RouterOutlet Input:<strong [style.color]="'blue'"> {{ u?.email }}</strong>
        </p>
        } @else {
        <h1>Hi, Guest 👋</h1>
        <p class="subtitle">Please login to see more details.</p>
        }

        <!-- ⭐ 使用 collapsed 狀態，做一點 UI 變化（只是示範） -->
        <p class="hint">
          Sidebar is @if(collapsed()) {
          <strong [style.color]="'red'">collapsed</strong>
          } @else {
          <strong [style.color]="'green'">expanded</strong>
          } now.
        </p>

        <button (click)="toggleSidebarFromPage()">toggle sidebar</button>
      </header>

      <h1>Router Inputs</h1>
      <p>
        product id from route： <strong [style.color]="'blue'">{{ id }}</strong>
      </p>
      <p>
        tab from route：<strong [style.color]="'blue'">{{ tab ?? 'overview' }}</strong>
      </p>
      <p>
        title from route.data : <strong [style.color]="'blue'">{{ title ?? 'No title' }}</strong>
      </p>
      <p>
        breadcrumb label from route.data:
        <strong [style.color]="'blue'">{{ breadcrumb.label ?? 'No label' }}</strong>
      </p>

      @if (loading()) {
      <p>Loading...</p>
      } @else {
      <pre>{{ product() }}</pre>
      }
    </section>
  `,
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

  // ⭐ 避免 template 一直 ?. ?. ?.：包成 computed 方便使用
  readonly user = computed(() => this._ctx()?.user ?? null);
  readonly collapsed = computed(() => this._ctx()?.collapsed ?? true);
  toggleSidebarFromPage() {
    this._ctx()?.toggleSidebar();
  }

  // 這裡示範你可能會用 signal 抓後端資料
  private _loading = signal(true);
  loading = this._loading.asReadonly();

  private _product = signal<any | null>(null);
  product = this._product.asReadonly();

  // 這裡假裝 call service，實作就略過
  ngOnInit() {
    // 這裡就可以直接用 this.id, this.tab
    // 不用再 inject ActivatedRoute + subscribe
    // ...發 request，最後 set product & loading
    this._loading.set(false);
    //this._product.set('My Product');
  }
}
