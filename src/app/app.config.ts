import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

// ✅ PrimeNG 設定相關
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';

// ✅ 選一個主題
import Aura from '@primeuix/themes/aura';
import Lara from '@primeuix/themes/lara'



export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),

    // ⭐️ 目前版本還是要放這個，接受警告，等 PrimeNG 官方 release 完整支援 animate.enter / animate.leave 的版本，再來一起大整理
    // ✅ PrimeNG 建議搭配動畫 (overlay、dialog 會用到)
    provideAnimationsAsync(),

    // ✅ 在這裡啟用 PrimeNG v20 theme
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.my-app-dark',
        },
      },
    }),
  ],
};
