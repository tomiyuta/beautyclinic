/**
 * 動画生成サービスのリトライとエラー処理ユーティリティ
 */

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number; // ミリ秒
  exponentialBackoff?: boolean;
  retryableErrors?: string[];
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

/**
 * エラーがリトライ可能かどうかを判定
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorMessage = error.message.toLowerCase();
  const errorName = error.name.toLowerCase();

  // ネットワークエラー
  const networkErrors = ["network", "timeout", "econnreset", "econnrefused", "etimedout", "fetch"];
  if (networkErrors.some(keyword => errorMessage.includes(keyword) || errorName.includes(keyword))) {
    return true;
  }

  // レート制限エラー
  const rateLimitErrors = ["rate limit", "429", "too many requests", "quota"];
  if (rateLimitErrors.some(keyword => errorMessage.includes(keyword))) {
    return true;
  }

  // サーバーエラー（5xx）
  const serverErrors = ["500", "502", "503", "504", "internal server error", "bad gateway", "service unavailable"];
  if (serverErrors.some(keyword => errorMessage.includes(keyword))) {
    return true;
  }

  // 認証エラーやクライアントエラー（4xx、ただし429以外）はリトライ不可
  const clientErrors = ["401", "403", "404", "400", "unauthorized", "forbidden", "not found", "bad request"];
  if (clientErrors.some(keyword => errorMessage.includes(keyword))) {
    return false;
  }

  // その他のエラーはリトライ可能とみなす
  return true;
}

/**
 * 指数バックオフで待機時間を計算
 */
export function calculateBackoffDelay(attempt: number, baseDelay: number): number {
  return baseDelay * Math.pow(2, attempt - 1);
}

/**
 * 指定した時間だけ待機
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * リトライロジックを実行
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
  } = options;

  let lastError: Error | null = null;
  let attempts = 0;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    attempts = attempt;

    try {
      const result = await fn();
      return {
        success: true,
        data: result,
        attempts,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;

      // リトライ不可能なエラーの場合は即座に終了
      if (!isRetryableError(err)) {
        return {
          success: false,
          error: err,
          attempts,
        };
      }

      // 最後の試行でない場合のみ待機
      if (attempt < maxRetries) {
        const delay = exponentialBackoff
          ? calculateBackoffDelay(attempt, retryDelay)
          : retryDelay;

        console.log(`[Retry] Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`, {
          error: err.message,
          errorName: err.name,
        });

        await sleep(delay);
      }
    }
  }

  return {
    success: false,
    error: lastError || new Error("Unknown error"),
    attempts,
  };
}

/**
 * エラーメッセージをユーザーフレンドリーに変換
 */
export function formatVideoGenerationError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "動画生成中にエラーが発生しました";
  }

  const errorMessage = error.message.toLowerCase();

  // APIキー関連
  if (errorMessage.includes("api key") || errorMessage.includes("unauthorized") || errorMessage.includes("401")) {
    return "APIキーが無効または設定されていません。APIキー設定画面で確認してください。";
  }

  // レート制限
  if (errorMessage.includes("rate limit") || errorMessage.includes("429") || errorMessage.includes("quota")) {
    return "レート制限に達しました。しばらく待ってから再度お試しください。";
  }

  // ネットワークエラー
  if (errorMessage.includes("network") || errorMessage.includes("timeout") || errorMessage.includes("fetch")) {
    return "ネットワークエラーが発生しました。接続を確認して再度お試しください。";
  }

  // サーバーエラー
  if (errorMessage.includes("500") || errorMessage.includes("502") || errorMessage.includes("503")) {
    return "サーバーエラーが発生しました。しばらく待ってから再度お試しください。";
  }

  // その他
  return error.message || "動画生成中にエラーが発生しました";
}

