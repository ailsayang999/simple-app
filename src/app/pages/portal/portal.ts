import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  standalone: true,
  selector: 'app-portal',
  imports: [CommonModule, TagModule, AvatarModule, TooltipModule],
  styleUrl: './portal.scss',
  templateUrl: './portal.html',
})
export class Portal {
  private router = inject(Router);

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
}
