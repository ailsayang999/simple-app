import { Component, Input, computed, signal, inject, Signal, ViewChild } from '@angular/core';
import { numberAttribute } from '@angular/core'; // 轉成 number 用的 helper
// ⭐ 新增：拿 routerOutletData 用
import { ROUTER_OUTLET_DATA } from '@angular/router';
// ⭐ 新增：把 ShellContext 型別拿進來用
import type { ShellContext } from '../../layout/layout-shell';

// Directive
import { HighlightDirective } from '../../shared/directives/high-light.directive';

@Component({
  standalone: true,
  selector: 'app-product-detail',
  templateUrl: './product-detail.html',
  // ⬇⬇⬇ 這裡很關鍵
  imports: [
    HighlightDirective, // 給 appHighlight 用
  ],
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

  //Directive
  @ViewChild(HighlightDirective) hl!: HighlightDirective;

  doHighlight() {
    this.hl.highlight();
  }

  clearHighlight() {
    this.hl.clear();
  }

  showInput() {
    this.hl.input();
  }
}
