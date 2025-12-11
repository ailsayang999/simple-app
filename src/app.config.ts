import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withViewTransitions, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';

import { routes } from './app.routes';

// ✅ PrimeNG 設定相關
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api'; // primeng 的Service得要在這裡提供


// ✅ 選一個主題
import Aura from '@primeuix/themes/aura';
import Lara from '@primeuix/themes/lara';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    // HttpClient 在這裡加進來就可以全專案注入 HttpClient 了
    provideHttpClient(withInterceptors([authInterceptor])), // ✨ 加入 authInterceptor，就可以所有 HTTP 呼叫都會自動走過這個 interceptor，Bearer token 會自動帶上
    provideRouter(
      routes,
      withComponentInputBinding(), // ✨ 開啟 Router Inputs
      withViewTransitions() // ✨ 新 Router 功能：route 切換有漂亮動畫)
    ),
    // ⭐️ 目前版本還是要放這個，接受警告，等 PrimeNG 官方 release 完整支援 animate.enter / animate.leave 的版本，再來一起大整理
    // ✅ PrimeNG 建議搭配動畫 (overlay、dialog 會用到)
    provideAnimationsAsync(),

    // ✅ 在這裡啟用 PrimeNG v20 theme，自行定義亮暗
    providePrimeNG({
      // 你原本就有的設定（theme、ripple、inputVariant...）
      ripple: true,
      inputVariant: 'filled',
      overlayAppendTo: 'body', // ⭐ 所有 overlay（select / dropdown / calendar…）都掛在 body，就不會下拉被困在dialog內
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.my-app-dark',
        },
      },
    }),
    MessageService, // 🔔 給 ToastService 用
    // providePrimeNG({
    //   theme: {
    //     preset: Aura,
    //     options: {
    //       darkModeSelector: 'system', // 亮暗模式跟系統 偵測系統亮暗模式
    //     },
    //   },
    // }),
    // providePrimeNG({
    //   theme: {
    //     preset: Aura,
    //     options: {
    //       darkModeSelector: 'html.light', // 不管系統模式 指定亮模式
    //     },
    //   },
    // }),
  ],
};
