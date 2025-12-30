// src/app/shared/copilot-chat/copilot-chat.component.ts
import {
  Component,
  OnInit,
  inject,
  signal,
  effect,
  viewChild,
  ElementRef,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

import { ChatStoreService } from '../../core/services/chat-store.service';
import { CopilotChatService } from '../../core/services/copilot-chat.service';

@Component({
  selector: 'app-copilot-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, TooltipModule],
  templateUrl: './copilot-chat.html',
  styleUrl: './copilot-chat.scss',
})
export class CopilotChatComponent implements OnInit {
  private chatStore = inject(ChatStoreService);
  private copilot = inject(CopilotChatService);

  readonly opened = signal(false);
  readonly input = signal('');

  readonly messages = this.chatStore.messages;

  // ✅ Angular 20：用 viewChild() 取代 @ViewChild
  readonly scrollAnchor = viewChild<ElementRef<HTMLDivElement>>('scrollAnchor');

  // ✅ 每次 messages 變動就自動捲到底（輕量版本）
  // 將 effect 移出 ngOnInit 並放在這裡，以符合 Injection Context 要求
  private scrollEffect = effect(() => {
    const _ = this.messages(); // 讀取依賴
    untracked(() => {
      queueMicrotask(() => this.scrollToBottom());
    });
  });

  ngOnInit(): void {
    // ✅ 全站只要初始化一次（內部有 guard）
    void this.copilot.initGlobal();
  }

  open(): void {
    this.opened.set(true);
    queueMicrotask(() => this.scrollToBottom());
  }

  close(): void {
    this.opened.set(false);
  }

  async send(): Promise<void> {
    const text = this.input().trim();
    if (!text) return;

    // ✅ Phase 2：交給 CopilotChatService 統一處理（指令 / AI / fallback）
    await this.copilot.handleUserInput(text);

    this.input.set('');
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    const anchor = this.scrollAnchor();
    const el = anchor?.nativeElement;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  onEnter(event: Event): void {
    // ⭐ Angular template 傳進來的是 Event，需要自行 narrowing
    if (!(event instanceof KeyboardEvent)) {
      return;
    }

    // ⭐ Shift + Enter：允許換行
    if (event.shiftKey) {
      return;
    }

    // ⭐ Enter：送出訊息
    event.preventDefault();
    void this.send();
  }
}
