import { Component, inject, signal, type OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';

// gridster
import {
  GridsterModule,
  type GridsterConfig,
  type GridsterItem,
} from 'angular-gridster2';

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

  // 使用 Signal 定義配置與數據
  options = signal<GridsterConfig>({
    gridType: 'fit', //  'fit' 保持固定比例
    fixedColWidth: 280, // gridType 為fixed的時候 根據 4 欄佈局微調
    fixedRowHeight: 200, // gridType 為fixed的時候
    margin: 24,
    outerMargin: false,
    draggable: { enabled: true }, // 開啟拖拽
    resizable: { enabled: true }, // 開啟縮放
    displayGrid: 'none', // 平時隱藏網格線維持美感
    minCols: 4,
    maxCols: 4,
  });

  // gridster-item 轉換成數據格式
  dashboard = signal<CustomGridsterItem[]>([
    { cols: 2, rows: 2, y: 0, x: 2, type: 'repair' }, // 資訊設備報修
    { cols: 1, rows: 1, y: 0, x: 0, type: 'flight' }, // 飛航管制系統
    { cols: 1, rows: 1, y: 1, x: 0, type: 'cert' }, // CERT 應變系統
    { cols: 1, rows: 1, y: 0, x: 1, type: 'edu' }, // 教務行政系統
    { cols: 1, rows: 1, y: 1, x: 1, type: 'permission' }, // 權限設定
  ]);

  navigateTo(path: string, isExternal = false): void {
    if (isExternal) {
      window.open(path, '_blank', 'noopener,noreferrer');
    } else {
      this.router.navigate([`/${path}`]);
    }
  }
}
