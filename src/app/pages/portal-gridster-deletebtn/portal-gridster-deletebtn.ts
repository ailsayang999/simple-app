import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import {   GridsterModule,
  type GridsterConfig,
  type GridsterItem,} from 'angular-gridster2';

interface CustomGridsterItem {
  type: 'flight' | 'cert' | 'repair' | 'edu' | 'permission';
  cols: number;
  rows: number;
  y: number;
  x: number;
}

@Component({
  standalone: true,
  selector: 'app-portal-gridster-deletebtn',
  imports: [CommonModule, TagModule, AvatarModule, GridsterModule],
  styleUrl: './portal-gridster-deletebtn.scss',
  templateUrl: './portal-gridster-deletebtn.html',
})
export class PortalGridsterDeleteBtn {
  private router = inject(Router);

  // // 使用 Signal 定義配置與數據
  // options = signal<GridsterConfig>({
  //   gridType: 'fit', //  'fit' 保持固定比例
  //   fixedColWidth: 280, // gridType 為fixed的時候 根據 4 欄佈局微調
  //   fixedRowHeight: 200, // gridType 為fixed的時候
  //   margin: 24,
  //   outerMargin: false,
  //   draggable: { enabled: false }, // 💡 拖拽初始設為 false
  //   resizable: { enabled: false }, // 💡 縮放初始設為 false
  //   displayGrid: 'none', // 平時隱藏網格線維持美感
  //   minCols: 4,
  //   maxCols: 4,
  // });

  // // gridster-item 轉換成數據格式
  // dashboard = signal<CustomGridsterItem[]>([
  //   { cols: 2, rows: 2, y: 0, x: 2, type: 'repair' }, // 資訊設備報修
  //   { cols: 1, rows: 1, y: 0, x: 0, type: 'flight' }, // 飛航管制系統
  //   { cols: 1, rows: 1, y: 1, x: 0, type: 'cert' }, // CERT 應變系統
  //   { cols: 1, rows: 1, y: 0, x: 1, type: 'edu' }, // 教務行政系統
  //   { cols: 1, rows: 1, y: 1, x: 1, type: 'permission' }, // 權限設定
  // ]);

  // scrollVertical
  options = signal<GridsterConfig>({
    gridType: 'scrollVertical',
    pushItems: true, // 拖拽時推開其他卡片
    draggable: { enabled: false },
    resizable: { enabled: false },
    minCols: 12, // 業界標準通常設為 12 欄（類似 Bootstrap）
    maxCols: 12,
    margin: 16,
    outerMargin: true,
    displayGrid: 'none', // 平時隱藏網格線維持美感
  });
  // scrollVertical
  dashboard = signal<CustomGridsterItem[]>([
    // 1. 飛航管制系統 (左上：佔 3 欄寬，高度建議設為 2 或更高視內容而定)
    { cols: 3, rows: 3, y: 0, x: 0, type: 'flight' },

    // 2. 教務行政系統 (左中：佔 3 欄寬，與飛航系統並排)
    { cols: 3, rows: 3, y: 0, x: 3, type: 'edu' },

    // 3. 資訊設備報修 (右側大方塊：佔 6 欄寬，即 12 欄的一半)
    { cols: 6, rows: 6, y: 0, x: 6, type: 'repair' },

    // 4. CERT 應變系統 (左下一：佔 3 欄寬)
    { cols: 3, rows: 3, y: 3, x: 0, type: 'cert' },

    // 5. 權限設定 (左下二：佔 3 欄寬)
    { cols: 3, rows: 3, y: 3, x: 3, type: 'permission' },
  ]);

  /**
   * 導航邏輯
   * @param path 路由路徑或完整 URL
   * @param isExternal 是否開啟新分頁（TypeScript 自動推斷 boolean）
   */
  navigateTo(path: string, isExternal = false): void {
    if (isExternal) {
      // 安全地開啟新分頁
      window.open(path, '_blank', 'noopener,noreferrer');
    } else {
      this.router.navigate([`/${path}`]);
    }
  }

  isEditMode = signal(false); // 控制是否為編輯模式

  toggleEditMode() {
    this.isEditMode.update((v) => !v);
    // 更新 gridster 配置，只在編輯模式允許拖拽與縮放
    this.options.update((opt) => ({
      ...opt,
      draggable: { enabled: this.isEditMode() },
      resizable: { enabled: this.isEditMode() },
      displayGrid: this.isEditMode() ? 'always' : 'none',
    }));
  }

  // 移除項目
  removeItem(item: CustomGridsterItem) {
    this.dashboard.update((items) => items.filter((i) => i !== item));
  }

  // 新增項目 (範例：預設新增一個飛航模組)
  addItem(type: CustomGridsterItem['type']) {
    const newItem: CustomGridsterItem = {
      cols: 1,
      rows: 1,
      x: 0,
      y: 0, // Gridster 會自動尋找空位
      type: type,
    };
    this.dashboard.update((items) => [...items, newItem]);
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

  showAddMenu = signal(false); // 控制選單顯示

  // 切換選單
  toggleAddMenu() {
    this.showAddMenu.update((v) => !v);
  }
}
