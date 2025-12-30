// src/app/core/services/chat-store.service.ts
import { Injectable, signal, computed } from '@angular/core';
import type { ChatMessage, ChatMessageMeta } from '../models/chat-message.model';

@Injectable({ providedIn: 'root' })
export class ChatStoreService {
  // ✅ 全站共用聊天訊息
  readonly messages = signal<ChatMessage[]>([]);

  // ✅ 你之後要做「未讀」也可以從這裡延伸
  readonly messageCount = computed(() => this.messages().length);

  // ✅ 這裡用 crypto.randomUUID()，瀏覽器支援度很好（現代最佳實務）
  private newId(): string {
    return crypto.randomUUID();
  }

  addSystemMessage(text: string, meta?: ChatMessageMeta): void {
    const msg: ChatMessage = {
      id: this.newId(),
      role: 'system',
      text,
      createdAt: new Date().toISOString(),
      meta,
    };
    this.messages.update((arr) => [...arr, msg]);
  }

  addUserMessage(text: string, meta?: ChatMessageMeta): void {
    const msg: ChatMessage = {
      id: this.newId(),
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
      meta,
    };
    this.messages.update((arr) => [...arr, msg]);
  }

  addAssistantMessage(text: string, meta?: ChatMessageMeta): void {
    const msg: ChatMessage = {
      id: this.newId(),
      role: 'assistant',
      text,
      createdAt: new Date().toISOString(),
      meta,
    };
    this.messages.update((arr) => [...arr, msg]);
  }

  clear(): void {
    this.messages.set([]);
  }
}
