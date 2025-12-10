import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service'; // ⭐ 新增
import { catchError, filter, switchMap, take, throwError, Subject } from 'rxjs';

function addAuthHeader(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// ⭐ 全域狀態：是否正在 refresh，以及等候中的 request
let isRefreshing = false;
const refreshTokenSubject = new Subject<string | null>();

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);

  const accessToken = auth.getAccessToken();

  let authReq = req;

  // 1️⃣ 排除 /api/auth/... 這些 endpoint，不要自己加 header
  const isAuthEndpoint = req.url.includes('/api/auth');

  if (accessToken && !isAuthEndpoint) {
    authReq = addAuthHeader(req, accessToken);
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 1️⃣ 如果是 網路 / CORS 問題
      if (error.status === 0) {
        console.error('Network/CORS error', error);
        toast.error('連線失敗，請確認 API 是否有啟動或 CORS 設定。');
        return throwError(() => error);
      }

      // 2️⃣ 如果是 401，且不是 auth 本身的呼叫，才考慮 refresh
      if (error.status === 401 && !isAuthEndpoint) {
        const refreshToken = auth.getRefreshToken();

        if (!refreshToken) {
          auth.logout();
          toast.warn('登入已過期，請重新登入。');
          return throwError(() => error);
        }

        // 2-1. 如果目前沒有正在 refresh，先自己來一發
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return auth.refreshToken(refreshToken).pipe(
            switchMap((res) => {
              isRefreshing = false;
              const newAccessToken = auth.getAccessToken(); // 剛剛 refresh 裡已經存好了

              if (!newAccessToken) {
                auth.logout();
                toast.warn('登入已過期，請重新登入。');
                return throwError(() => error);
              }

              // 通知其他等候中的 request：已經有新 token 了
              refreshTokenSubject.next(newAccessToken);

              // 🔁 用新的 token 重送原本 request
              const newReq = addAuthHeader(req, newAccessToken);
              return next(newReq);
            }),
            catchError((refreshError) => {
              isRefreshing = false;
              auth.logout();
              toast.warn('登入已過期，請重新登入。');
              return throwError(() => refreshError);
            })
          );
        } else {
          // 2-2. 已經有 refresh 在進行 → 其他 request 等 refresh 完成
          return refreshTokenSubject.pipe(
            filter((token) => token != null),
            take(1),
            switchMap((token) => {
              const newReq = addAuthHeader(req, token!);
              return next(newReq);
            })
          );
        }
      }

      // 3️⃣ 其他錯誤（包含 auth endpoint 的 400 / 401 / 500）
      //    嘗試從後端拿 message, Message, error 等欄位
      const backendMessage =
        (error.error && (error.error.Message || error.error.message)) ||
        error.statusText ||
        '發生錯誤，請稍後再試。';

      toast.error(backendMessage);

      // 非 401 或 auth endpoint 的錯誤，直接丟回去
      return throwError(() => error);
    })
  );
};
