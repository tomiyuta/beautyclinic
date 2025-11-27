/**
 * 統一AI呼び出しサービス
 * 各AIを同じインターフェースで呼び出し可能にする
 */

import type { AIProvider } from "@/types/strategy";

// 既存のAIサービスをインポート
import { callClaude } from "../claude";
import { callChatGPT } from "../chatgpt";
import { callGemini } from "../gemini";
import { callGrok } from "../grok";

// ============================================================
// メイン関数
// ============================================================

/**
 * 統一インターフェースでAIを呼び出し
 *
 * @param provider AIプロバイダー
 * @param prompt プロンプト
 * @returns AIの回答
 */
export async function callAI(
  provider: AIProvider,
  prompt: string
): Promise<string> {
  console.log(`[AI] Calling ${provider}...`);
  const startTime = Date.now();

  try {
    let result: string;

    switch (provider) {
      case "claude":
        result = await callClaude(prompt);
        break;

      case "chatgpt":
        result = await callChatGPT(prompt);
        break;

      case "gemini":
        result = await callGemini(prompt);
        break;

      case "grok":
        result = await callGrok(prompt);
        break;

      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }

    const durationMs = Date.now() - startTime;
    console.log(`[AI] ${provider} responded in ${durationMs}ms`);

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`[AI] ${provider} failed after ${durationMs}ms:`, error);
    throw error;
  }
}

/**
 * タイムアウト付きでAI呼び出し
 *
 * @param provider AIプロバイダー
 * @param prompt プロンプト
 * @param timeoutMs タイムアウト（ミリ秒）
 * @returns AIの回答
 */
export async function callAIWithTimeout(
  provider: AIProvider,
  prompt: string,
  timeoutMs: number = 60000
): Promise<string> {
  return Promise.race([
    callAI(provider, prompt),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${provider} timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

// ============================================================
// ユーティリティ
// ============================================================

/**
 * 複数のAIに並列で問い合わせ
 *
 * @param providers AIプロバイダーのリスト
 * @param prompt プロンプト
 * @param timeoutMs 各AIのタイムアウト
 * @returns 各AIの結果（エラー含む）
 */
export async function callMultipleAIs(
  providers: AIProvider[],
  prompt: string,
  timeoutMs: number = 60000
): Promise<
  Array<{
    provider: AIProvider;
    content: string;
    error?: string;
    durationMs: number;
  }>
> {
  const startTime = Date.now();

  const promises = providers.map(async (provider) => {
    const providerStartTime = Date.now();
    try {
      const content = await callAIWithTimeout(provider, prompt, timeoutMs);
      return {
        provider,
        content,
        durationMs: Date.now() - providerStartTime,
      };
    } catch (error) {
      return {
        provider,
        content: "",
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - providerStartTime,
      };
    }
  });

  const results = await Promise.all(promises);
  const totalDuration = Date.now() - startTime;
  console.log(`[AI] All ${providers.length} AIs responded in ${totalDuration}ms`);

  return results;
}

/**
 * 利用可能なAIプロバイダーのリスト
 */
export const AVAILABLE_PROVIDERS: AIProvider[] = [
  "claude",
  "chatgpt",
  "gemini",
  "grok",
];

/**
 * AIプロバイダーの表示名
 */
export const PROVIDER_LABELS: Record<AIProvider, string> = {
  claude: "Claude",
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  grok: "Grok",
};

/**
 * AIプロバイダーのデフォルトタイムアウト
 */
export const DEFAULT_TIMEOUT_MS = 60000; // 60秒

/**
 * Councilのデフォルトタイムアウト（各Stage）
 */
export const COUNCIL_TIMEOUT_MS = 120000; // 120秒

