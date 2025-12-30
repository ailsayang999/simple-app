// src/app/core/services/signalr.service.ts
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

// ✅ SignalR client
import * as signalR from '@microsoft/signalr';

@Injectable({ providedIn: 'root' })
export class SignalrService {
  private connection: signalR.HubConnection | null = null;

  // 你其實同時可能想 join：Dashboard（fxUpdated）、Account A（accountUpdated）
  private joinedGroups = new Set<string>();
  // 例： "account:xxxx", "dashboard"

  // ✅ 用來避免重複 start
  private starting: Promise<void> | null = null;

  //讓事件 handler 支援「多個 listener」: service 內部只對 connection 註冊一次，然後自己 fan-out 給 listeners。
  private accountUpdatedListeners = new Set<(accountId: string) => void>();
  private fxUpdatedListeners = new Set<(rates: any[]) => void>();

  private accountUpdatedBound?: (accountId: string) => void;
  private fxUpdatedBound?: (rates: any[]) => void;

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
        // ✅ 用 set 清掉
        this.joinedGroups.clear();
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

  // ✅ 監聽 server 推播（accountUpdated、fxUpdated）
  onAccountUpdated(handler: (accountId: string) => void): () => void {
    if (!this.connection) {
      // 連線還沒建立：先加入 listeners，等 ensureConnected 後再 bind
      this.accountUpdatedListeners.add(handler);
      return () => this.accountUpdatedListeners.delete(handler);
    }

    this.accountUpdatedListeners.add(handler);

    // ✅ 確保 connection 只綁一次
    if (!this.accountUpdatedBound) {
      this.accountUpdatedBound = (accountId: string) => {
        for (const fn of this.accountUpdatedListeners) fn(accountId);
      };
      this.connection.on('accountUpdated', this.accountUpdatedBound);
    }

    return () => this.accountUpdatedListeners.delete(handler);
  }

  // ✅ Join account group（server 會用 group 推播更新完成）
  async joinAccount(accountId: string): Promise<void> {
    if (!this.connection) return;
    if (this.connection.state !== signalR.HubConnectionState.Connected) return;

    const key = `account:${accountId}`;
    if (this.joinedGroups.has(key)) return;

    try {
      await this.connection.invoke('JoinAccount', accountId);
      this.joinedGroups.add(key);
    } catch (e) {
      console.debug('JoinAccount ignored error', e);
    }
  }

  // ✅ Leave account group
  async leaveAccount(accountId: string): Promise<void> {
    if (!this.connection) return;

    const key = `account:${accountId}`;
    if (!this.joinedGroups.has(key)) return;

    if (this.connection.state !== signalR.HubConnectionState.Connected) {
      this.joinedGroups.delete(key);
      return;
    }

    try {
      await this.connection.invoke('LeaveAccount', accountId);
    } catch (e) {
      console.debug('LeaveAccount ignored error', e);
    } finally {
      this.joinedGroups.delete(key);
    }
  }

  // 匯率 SignalR

  onFxUpdated(handler: (rates: any[]) => void): () => void {
    if (!this.connection) {
      this.fxUpdatedListeners.add(handler);
      return () => this.fxUpdatedListeners.delete(handler);
    }

    this.fxUpdatedListeners.add(handler);

    if (!this.fxUpdatedBound) {
      this.fxUpdatedBound = (rates: any[]) => {
        for (const fn of this.fxUpdatedListeners) fn(rates);
      };
      this.connection.on('fxUpdated', this.fxUpdatedBound);
    }

    return () => this.fxUpdatedListeners.delete(handler);
  }

  async joinDashboard(): Promise<void> {
    if (!this.connection) return;
    if (this.connection.state !== signalR.HubConnectionState.Connected) return;

    const key = 'dashboard';
    if (this.joinedGroups.has(key)) return;

    try {
      await this.connection.invoke('JoinDashboard');
      this.joinedGroups.add(key);
    } catch (e) {
      console.debug('JoinDashboard ignored error', e);
    }
  }

  async leaveDashboard(): Promise<void> {
    if (!this.connection) return;

    const key = 'dashboard';
    if (!this.joinedGroups.has(key)) return;

    // ✅ 非 Connected 就別 invoke（避免 canceled）
    if (this.connection.state !== signalR.HubConnectionState.Connected) {
      this.joinedGroups.delete(key);
      return;
    }

    try {
      await this.connection.invoke('LeaveDashboard');
    } catch (e) {
      console.debug('LeaveDashboard ignored error', e);
    } finally {
      this.joinedGroups.delete(key);
    }
  }

  async stop(): Promise<void> {
    if (!this.connection) return;

    // ✅ 不用 invoke Leave：斷線 server 會自動清 group
    this.joinedGroups.clear();

    try {
      await this.connection.stop();
    } catch (e) {
      console.debug('SignalR stop ignored error', e);
    } finally {
      // 清理全部
      this.connection = null;
      this.starting = null;

      this.accountUpdatedListeners.clear();
      this.fxUpdatedListeners.clear();
      this.accountUpdatedBound = undefined;
      this.fxUpdatedBound = undefined;
    }
  }
}
