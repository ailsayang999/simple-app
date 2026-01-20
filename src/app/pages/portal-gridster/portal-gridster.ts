import { Component, inject, signal, type OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';

// gridster
import { GridsterModule, type GridsterConfig, type GridsterItem } from 'angular-gridster2';

interface CustomGridsterItem extends GridsterItem {
  type: 'flight' | 'cert' | 'repair' | 'edu' | 'permission';
}

@Component({
  standalone: true,
  selector: 'app-portal-gridster',
  imports: [CommonModule, TagModule, AvatarModule, TooltipModule, GridsterModule],
  styleUrl: './portal-gridster.scss',
  templateUrl: './portal-gridster.html',
})
export class PortalGridster {
  private readonly router = inject(Router);
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

  // 使用 Signal 定義配置與數據
  options = signal<GridsterConfig>({
    gridType: 'fit', //  'fit' 保持固定比例
    pushItems: true, // 拖拽時推開其他卡片
    draggable: { enabled: true }, // 開啟拖拽
    resizable: { enabled: true }, // 開啟縮放
    minCols: 4,
    maxCols: 4,
    margin: 24,
    displayGrid: 'none', // 平時隱藏網格線維持美感
    outerMargin: true,
  });

  // gridster-item 轉換成數據格式
  dashboard = signal<CustomGridsterItem[]>([
    { cols: 2, rows: 2, y: 0, x: 2, type: 'repair' }, // 資訊設備報修
    { cols: 1, rows: 1, y: 0, x: 0, type: 'flight' }, // 飛航管制系統
    { cols: 1, rows: 1, y: 1, x: 0, type: 'cert' }, // CERT 應變系統
    { cols: 1, rows: 1, y: 0, x: 1, type: 'edu' }, // 教務行政系統
    { cols: 1, rows: 1, y: 1, x: 1, type: 'permission' }, // 權限設定
  ]);

  // // scrollVertical
  // options = signal<GridsterConfig>({
  //   gridType: 'scrollVertical',
  //   pushItems: true, // 拖拽時推開其他卡片
  //   draggable: { enabled: true },
  //   resizable: { enabled: true },
  //   minCols: 12, // 業界標準通常設為 12 欄（類似 Bootstrap）
  //   maxCols: 12,
  //   margin: 16,
  //   outerMargin: true,
  //   displayGrid: 'none', // 平時隱藏網格線維持美感
  // });
  // // scrollVertical
  // dashboard = signal<CustomGridsterItem[]>([
  //   // 1. 飛航管制系統 (左上：佔 3 欄寬，高度建議設為 2 或更高視內容而定)
  //   { cols: 3, rows: 3, y: 0, x: 0, type: 'flight' },

  //   // 2. 教務行政系統 (左中：佔 3 欄寬，與飛航系統並排)
  //   { cols: 3, rows: 3, y: 0, x: 3, type: 'edu' },

  //   // 3. 資訊設備報修 (右側大方塊：佔 6 欄寬，即 12 欄的一半)
  //   { cols: 6, rows: 6, y: 0, x: 6, type: 'repair' },

  //   // 4. CERT 應變系統 (左下一：佔 3 欄寬)
  //   { cols: 3, rows: 3, y: 3, x: 0, type: 'cert' },

  //   // 5. 權限設定 (左下二：佔 3 欄寬)
  //   { cols: 3, rows: 3, y: 3, x: 3, type: 'permission' },
  // ]);

  navigateTo(path: string, isExternal = false): void {
    if (isExternal) {
      window.open(path, '_blank', 'noopener,noreferrer');
    } else {
      this.router.navigate([`/${path}`]);
    }
  }
}
