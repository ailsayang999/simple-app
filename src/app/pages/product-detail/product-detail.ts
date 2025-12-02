import { Component, Input, computed, signal } from '@angular/core';
import { numberAttribute } from '@angular/core'; // 轉成 number 用的 helper

@Component({
  standalone: true,
  selector: 'app-product-detail',
  template: `
    <section class="page">
      <h1>Product #{{ id }}</h1>
      <p>目前 tab：{{ tab ?? 'overview' }}</p>
      <p>目前 title: {{ title ?? 'No title' }}</p>
      <p>目前 breadcrumb label: {{ breadcrumb.label ?? 'No label' }}</p>

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

  // /products/123 → id = 123
  @Input({ transform: numberAttribute }) // 用 Input 收 route 資料
  id!: number;

  // /products/123?tab=price → tab = 'price'
  @Input() tab?: string;

  @Input() title?: string;

  @Input() breadcrumb?: any;

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
    this._product.set('My Product');

    console.log('id', this.id);
    console.log('tab', this.tab);
  }
}
