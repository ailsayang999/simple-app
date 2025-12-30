// src/app/core/services/chat-command-parser.service.ts
import { Injectable } from '@angular/core';

export type ChatCommandType = 'help' | 'useAccount' | 'buy' | 'sell' | 'summary' | 'unknown';

// ✅ 每種指令都有自己的 args 型別（避免 Record<string, any> 造成 index signature 問題）
export type ChatCommand =
  | { type: 'help'; raw: string; args: {} }
  | { type: 'summary'; raw: string; args: {} }
  | { type: 'useAccount'; raw: string; args: { accountId: string } }
  | {
      type: 'buy' | 'sell';
      raw: string;
      args: {
        symbol: string;
        quantity: number;
        price: number;
        tradeDate: string | null; // yyyy-mm-dd
        fee: number;
        tax: number;
        note: string | null;
      };
    }
  | { type: 'unknown'; raw: string; args: { reason?: string; example?: string } };

@Injectable({ providedIn: 'root' })
export class ChatCommandParserService {
  parse(input: string): ChatCommand {
    const raw = input.trim();
    if (!raw.startsWith('/')) {
      return { type: 'unknown', raw, args: { reason: 'not a command' } };
    }

    const tokens = this.tokenize(raw);
    const cmd = (tokens[0] ?? '').toLowerCase(); // e.g. "/buy"

    if (cmd === '/help') return { type: 'help', raw, args: {} };
    if (cmd === '/summary') return { type: 'summary', raw, args: {} };

    if (cmd === '/use') {
      // /use account <guid>
      const scope = (tokens[1] ?? '').toLowerCase();
      const value = tokens[2] ?? '';
      if (scope === 'account' && value) {
        return { type: 'useAccount', raw, args: { accountId: value } };
      }
      return { type: 'unknown', raw, args: { reason: 'use syntax invalid' } };
    }

    if (cmd === '/buy' || cmd === '/sell') {
      // /buy <symbol> <qty> <price> [date] [fee=] [tax=] [note="..."]
      const symbol = tokens[1];
      const qty = tokens[2];
      const price = tokens[3];

      if (!symbol || !qty || !price) {
        return {
          type: 'unknown',
          raw,
          args: {
            reason: `${cmd} syntax invalid`,
            example: `${cmd} 0050 1 64.4 2025-12-30 fee=1 tax=0 note="test"`,
          },
        };
      }

      const args = {
        symbol,
        quantity: Number(qty),
        price: Number(price),
        tradeDate: null as string | null,
        fee: 0,
        tax: 0,
        note: null as string | null,
      };

      // 第 4 個 token 若是日期（yyyy-mm-dd / yyyy/mm/dd）
      const maybeDate = tokens[4];
      if (maybeDate && this.isDateLike(maybeDate)) {
        args.tradeDate = this.normalizeDate(maybeDate);
      }

      // 其餘 key=value
      for (const t of tokens.slice(args.tradeDate ? 5 : 4)) {
        const kv = this.parseKeyValue(t);
        if (!kv) continue;
        const { key, value } = kv;

        if (key === 'fee') args.fee = Number(value);
        if (key === 'tax') args.tax = Number(value);
        if (key === 'note') args.note = String(value);
      }

      return { type: cmd === '/buy' ? 'buy' : 'sell', raw, args };
    }

    return { type: 'unknown', raw, args: { reason: 'unknown command' } };
  }

  // ✅ tokenize 支援雙引號：note="hello world"
  private tokenize(input: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < input.length; i++) {
      const ch = input[i];

      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (!inQuotes && /\s/.test(ch)) {
        if (cur) out.push(cur);
        cur = '';
        continue;
      }

      cur += ch;
    }

    if (cur) out.push(cur);
    return out;
  }

  private parseKeyValue(token: string): { key: string; value: string } | null {
    const idx = token.indexOf('=');
    if (idx <= 0) return null;
    const key = token.slice(0, idx).toLowerCase();
    const value = token.slice(idx + 1);
    return { key, value };
  }

  private isDateLike(s: string): boolean {
    // yyyy-mm-dd or yyyy/mm/dd
    return /^\d{4}[-/]\d{2}[-/]\d{2}$/.test(s);
  }

  private normalizeDate(s: string): string {
    // 轉成 yyyy-mm-dd
    return s.replaceAll('/', '-');
  }
}
