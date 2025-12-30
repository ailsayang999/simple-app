// src/app/core/services/signalr.service.ts
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

// ✅ SignalR client
import * as signalR from '@microsoft/signalr';

@Injectable({ providedIn: 'root' })
export class SignalrService {
  private connection: signalR.HubConnection | null = null;

  // ✅ 用來避免重複 start
  private starting: Promise<void> | null = null;

  // ✅ 目前 join 的 account group（方便 cleanup）
  private joinedAccountId: string | null = null;

  // ✅ 事件 handler 參考（避免重複註冊）
  private accountUpdatedHandler: ((accountId: string) => void) | null = null;

  // ✅ Hub URL：API base + /hubs/market
  // private hubUrl = `${environment.apiUrl}/hubs/market`;
  private hubUrl = `http://localhost:5225/hubs/market`;

  /**
   * ✅ 建立連線（若已建立就復用）
   * @param getAccessToken 由呼叫端傳入（通常讀 localStorage / AuthService）
   */
  async ensureConnected(getAccessToken: () => string | null): Promise<void> {
    // ✅ 連線狀態
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      console.log('Already connected to SignalR');
      return;
    }

    if (!this.connection) {
      console.log('Creating new SignalR connection...');
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(this.hubUrl, {
          accessTokenFactory: () => getAccessToken() ?? '',
        })
        // ✅ 自動重連
        .withAutomaticReconnect([0, 2000, 5000, 10000])
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // 連線斷線時，清掉 group 記錄（避免誤判）
      this.connection.onreconnected(() => {
        // ✅ 連線成功後，註冊相關事件
        console.log('SignalR connection re-established.');
        // reconnected 後，需要重新 join group（由外層 AccountDetailPage 會再次 join）
      });

      this.connection.onclose(() => {
        console.log('SignalR connection closed.');
        this.joinedAccountId = null;
      });
    }

    // ✅ 避免同時多次呼叫 start()
    if (!this.starting) {
      this.starting = this.connection
        .start()
        .then(() => {
          console.log('SignalR connection established successfully.');
        })
        .finally(() => {
          this.starting = null;
        });
    }

    await this.starting;
  }

  /**
   * ✅ 監聽 server 推播（accountUpdated）
   * 只會註冊一次 handler
   */
  onAccountUpdated(handler: (accountId: string) => void) {
    if (!this.connection) return;

    // ✅ 若之前有 handler，先移除（避免重複觸發）
    if (this.accountUpdatedHandler) {
      this.connection.off('accountUpdated', this.accountUpdatedHandler);
      console.log('Previous handler removed.');
    }

    // ✅ 註冊新的事件處理器
    this.accountUpdatedHandler = (accountId: string) => handler(accountId);

    this.connection.on('accountUpdated', this.accountUpdatedHandler);
    console.log('SignalR: onAccountUpdated handler registered successfully');
  }

  /**
   * ✅ Join account group（server 會用 group 推播更新完成）
   */
  async joinAccount(accountId: string): Promise<void> {
    if (!this.connection) return;

    // 已 join 就不重複 invoke
    if (this.joinedAccountId === accountId) return;

    // 如果之前 join 另一個 account，先 leave
    if (this.joinedAccountId && this.joinedAccountId !== accountId) {
      await this.leaveAccount(this.joinedAccountId);
    }

    try {
      await this.connection.invoke('JoinAccount', accountId);
      this.joinedAccountId = accountId;
      console.log(`Successfully joined account group: ${accountId}`);
    } catch (error) {
      console.error('Error joining account group:', error);
    }
  }

  /**
   * ✅ Leave account group
   */
  async leaveAccount(accountId: string): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.invoke('LeaveAccount', accountId);
    } finally {
      if (this.joinedAccountId === accountId) {
        this.joinedAccountId = null;
      }
    }
  }

  /**
   * ✅ 停止連線（離開頁面用）
   */
  async stop(): Promise<void> {
    if (!this.connection) return;

    // ✅ 清掉 handler
    if (this.accountUpdatedHandler) {
      this.connection.off('accountUpdated', this.accountUpdatedHandler);
      this.accountUpdatedHandler = null;
    }

    // ✅ 如果有 join 過 group，先 leave（乾淨）
    if (this.joinedAccountId) {
      try {
        await this.leaveAccount(this.joinedAccountId);
      } catch {
        // ignore
      }
    }

    try {
      await this.connection.stop();
    } finally {
      this.connection = null;
      this.starting = null;
      this.joinedAccountId = null;
    }
  }

  // 匯率 SignalR
  private fxUpdatedHandler: ((payload: any) => void) | null = null;
  
  onFxUpdated(handler: (rates: any[]) => void) {
    if (!this.connection) return;

    if (this.fxUpdatedHandler) {
      this.connection.off('fxUpdated', this.fxUpdatedHandler);
    }

    this.fxUpdatedHandler = (rates: any[]) => handler(rates);
    this.connection.on('fxUpdated', this.fxUpdatedHandler);
  }

  async joinDashboard(): Promise<void> {
    if (!this.connection) return;
    await this.connection.invoke('JoinDashboard');
  }

  async leaveDashboard(): Promise<void> {
    if (!this.connection) return;
    await this.connection.invoke('LeaveDashboard');
  }
}
