import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy, signal } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { GridStackOptions, GridStackWidget } from 'gridstack';
import { GridstackComponent, GridstackItemComponent, elementCB } from 'gridstack/dist/angular';

// portal-gridstack.ts
import { ViewEncapsulation } from '@angular/core';

import { nodesCB } from 'gridstack/dist/angular';
let ids = 4;
interface GridItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  content: string;
}

interface CustomGridstackItem extends GridStackWidget {
  type: 'flight' | 'cert' | 'repair' | 'edu' | 'permission';
}

@Component({
  selector: 'app-grid',
  templateUrl: './portal-gridstack.html',
  styleUrls: ['./portal-gridstack.scss'],
  encapsulation: ViewEncapsulation.None, // 加入這一行，讓 CSS 作用於全域
  imports: [
    TagModule,
    // SKIP if doing module import instead (next)
    GridstackComponent,
    GridstackItemComponent,
  ],
})
export class PortalGridstack {
  @ViewChild(GridstackComponent) gridComp?: GridstackComponent;

  // 定義當前時間
  public now = new Date();
  constructor() {
    // 如果你希望時間會隨著鐘擺跳動（例如每一分鐘更新一次），可以加上定時器
    setInterval(() => {
      this.now = new Date();
    }, 60000); // 每 60 秒更新一次
  }

  get formattedDate(): string {
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }).format(this.now);
  }

  public gridOptions: GridStackOptions = {
    margin: 6,
    // float: true,
    minRow: 1,
    cellHeight: 70,
    columnOpts: { breakpoints: [{ w: 768, c: 1 }] },
    staticGrid: true, // 預設初始化為靜態（非編輯模式）
  };

  public items: CustomGridstackItem[] = [
    { x: 0, y: 0, minW: 3, minH: 3, id: '1', type: 'flight' },
    { x: 3, y: 0, minW: 3, minH: 3, id: '2', type: 'cert' },
    { x: 6, y: 0, minW: 6, minH: 6, id: '3', type: 'repair' },
    { x: 0, y: 1, minW: 3, minH: 3, id: '4', type: 'edu' },
    { x: 3, y: 1, minW: 3, minH: 3, id: '5', type: 'permission' },
  ];

  // called whenever items change size/position/etc..
  public onChange(data: nodesCB) {
    // TODO: update our TEMPLATE list to match ?
    // NOTE: no need for dynamic as we can always use grid.save() to get latest layout, or grid.engine.nodes
    console.log('change ', data.nodes.length > 1 ? data.nodes : data.nodes[0]);
  }

  public addNgFor() {
    //this.items.push({ w: 2, content: `Item ${ids}`, id: String(ids++) });
  }
  public deleteNgFor() {
    this.items.pop();
  }
  public modifyNgFor() {
    // this will not update the DOM nor trigger gridstackItems.changes for GS to auto-update, so set new option of the gridItem instead
    // this.items[0].w = 3;
    const gridItem = this.gridComp?.gridstackItems?.get(0);
    if (gridItem) gridItem.options = { w: 3 };
  }

  public onResizeStop(data: elementCB) {
    console.log('resizestop ', data.el.gridstackNode);
  }

  // ngFor unique node id to have correct match between our items used and GS

  public identify(index: number, w: GridStackWidget) {
    return w.id; // or use index if no id is set and you only modify at the end...
  }

  isEditMode = signal(false); // 控制是否為編輯模式

  toggleEditMode() {
    this.isEditMode.update((v) => !v);
    const grid = this.gridComp?.grid; // 獲取底層 GridStack 實例

    if (grid) {
      const mode = this.isEditMode();
      grid.setStatic(!mode); // static(true) 會禁用拖拽與縮放

      // 如果想要更細緻的控制：
      // grid.enableMove(mode);
      // grid.enableResize(mode);
    }
  }

  showAddMenu = signal(false); // 控制選單顯示
  // 切換選單
  toggleAddMenu() {
    this.showAddMenu.update((v) => !v);
  }

  // 定義可選清單
  readonly availableItems = [
    { label: '飛航管制系統', type: 'flight' as const, icon: 'pi pi-send' },
    { label: 'CERT 應變系統', type: 'cert' as const, icon: 'pi pi-shield' },
    { label: '資訊設備報修', type: 'repair' as const, icon: 'pi pi-wrench' },
    {
      label: '教務行政系統',
      type: 'edu' as const,
      icon: 'pi pi-graduation-cap',
    },
    { label: '權限設定', type: 'permission' as const, icon: 'pi pi-cog' },
  ];

  addItem(type: 'flight' | 'cert' | 'repair' | 'edu' | 'permission') {
    // 1. 尋找對應類型的預設配置（可根據需求調整寬高）
    const itemConfig = this.availableItems.find((i) => i.type === type);

    const newItem: CustomGridstackItem = {
      id: `item-${Date.now()}`, // 使用時間戳記確保唯一性
      x: 0, // GridStack 會自動尋找適合的空位放進去
      y: 0,
      w: 3,
      h: 3,
      minW: 2,
      minH: 2,
      type: type,
    };

    // 2. 更新陣列，觸發 Angular 渲染
    this.items = [...this.items, newItem];

    // 3. (選邊) 關閉選單
    this.showAddMenu.set(false);
  }

  removeItem(n: CustomGridstackItem) {
    // 過濾掉被點擊的 item id
    this.items = this.items.filter((item) => item.id !== n.id);

    // 註：GridstackComponent 會監控 items 的變化並自動呼叫 grid.removeWidget()
  }
}
