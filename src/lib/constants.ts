/**
 * アプリケーション全体で使用する定数定義
 */

/**
 * ユーザーIDのプレースホルダー
 * 
 * 現在は認証機能が未実装のため、固定値を使用しています。
 * 将来的に認証実装時は、この定数を削除し、
 * セッションやJWTトークンから実際のユーザーIDを取得するように変更してください。
 * 
 * @example
 * ```typescript
 * // 現在の使い方
 * const userId = USER_ID_PLACEHOLDER;
 * 
 * // 将来の実装例
 * import { getCurrentUserId } from '@/lib/auth';
 * const userId = getCurrentUserId();
 * ```
 */
export const USER_ID_PLACEHOLDER = 1;

/**
 * 将来的な認証実装時に使用する関数（コメントアウト）
 * 
 * export const getCurrentUserId = (): number => {
 *   // セッションやJWTから実際のユーザーIDを取得
 *   const session = getSession();
 *   return session?.userId ?? USER_ID_PLACEHOLDER;
 * };
 */

