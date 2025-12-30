// src/app/core/models/chat-message.model.ts

export type ChatMessageRole = 'system' | 'user' | 'assistant';

export type ChatEventType =
  | 'accountUpdated'
  | 'fxUpdated'
  | 'jobCompleted'
  | 'priceUpdated'
  | 'unknown';

export interface ChatMessageMeta {
  // ✅ 任何你想塞進去的上下文（不一定每則都有）
  eventType?: ChatEventType;
  accountId?: string;
  // fx / price / job payload 都可以先丟 any，Phase 2 再慢慢 type 化
  payload?: any;
}

export interface ChatMessage {
  id: string; // ✅ uuid
  role: ChatMessageRole; // system / user / assistant
  text: string;
  createdAt: string; // ✅ ISO string
  meta?: ChatMessageMeta;
}
