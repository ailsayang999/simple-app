// src/app/core/services/toast.service.ts
import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class ToastService {
  constructor(private messageService: MessageService) {}

  success(msg: string) {
    this.messageService.add({
      severity: 'success',
      summary: '成功',
      detail: msg,
    });
  }

  error(msg: string) {
    this.messageService.add({
      severity: 'error',
      summary: '錯誤',
      detail: msg,
    });
  }

  warn(msg: string) {
    this.messageService.add({
      severity: 'warn',
      summary: '注意',
      detail: msg,
    });
  }

  // ✅ NEW：資訊提示（不算錯誤、不需要使用者緊張）
  info(msg: string) {
    this.messageService.add({
      severity: 'info',
      summary: '資訊',
      detail: msg,
    });
  }
}
