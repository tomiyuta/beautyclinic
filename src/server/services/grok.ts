import axios from "axios";

const apiKey = process.env.GROK_API_KEY;
// Grok APIのエンドポイントとモデル名を確認して修正
// 2025年11月時点で利用可能な最新モデル
const apiUrl = process.env.GROK_API_URL || "https://api.x.ai/v1/chat/completions";

// 利用可能なモデル候補（優先順位順 - 最新版を最優先）
const GROK_MODEL_CANDIDATES = [
  "grok-4",          // Grok-4（最新・API経由で利用可能・確認済み）
  "grok-3",          // Grok-3（2025年リリース・安定版）
  "grok-beta",        // Grok Beta（廃止予定・非推奨）
];

// 成功したモデル名をキャッシュ（サーバー起動中は保持）
let cachedModelName: string | null = null;

if (!apiKey) {
  console.warn("GROK_API_KEY is not set. Grok features will be disabled.");
}

export async function callGrok(prompt: string): Promise<string> {
  if (!apiKey) {
    throw new Error(
      "Grok API key is not configured. Please set GROK_API_KEY environment variable.",
    );
  }

  // 環境変数で指定されている場合はそれを使用、なければ候補リストから順に試行
  const envModel = process.env.GROK_MODEL;
  const modelsToTry = envModel ? [envModel] : GROK_MODEL_CANDIDATES;
  
  let lastError: Error | null = null;
  const triedModels: string[] = [];

  for (const model of modelsToTry) {
    triedModels.push(model);
    try {
      console.log(`[Grok] Trying model: ${model}`);
      
      const response = await axios.post(
        apiUrl,
        {
          model: model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      console.log(`✓ Grok model selected: ${model}`);
      // 成功したモデルをキャッシュ
      if (!cachedModelName) {
        cachedModelName = model;
      }
      const content = response.data.choices[0]?.message?.content || "";
      // 出力の冒頭に使用モデル情報を追加
      const modelInfo = `【使用AIモデル: Grok ${model}】\n\n`;
      return modelInfo + content;
    } catch (error) {
      const errorObj = axios.isAxiosError(error) ? error : null;
      const statusCode = errorObj?.response?.status;
      const errorData = errorObj?.response?.data;
      const errorMessage = errorData?.error?.message || errorObj?.message || String(error);
      const errorLower = errorMessage.toLowerCase();
      
      lastError = new Error(errorMessage);
      
      console.error(`Grok API error for model ${model}:`, {
        statusCode,
        errorMessage,
      });
      
      // 404エラー（モデルが見つからない）の場合は次のモデルを試行
      if (statusCode === 404 || errorLower.includes("not found") || errorLower.includes("not_found")) {
        if (model !== modelsToTry[modelsToTry.length - 1]) {
          console.warn(`  ✗ Model ${model} not found (404), trying next...`);
          continue;
        }
      }
      
      // 401/403エラーの場合は即座にエラーを投げる
      if (statusCode === 401 || statusCode === 403) {
        throw new Error(
          `Grok API認証エラー (${statusCode}): ${errorMessage}`,
        );
      }
      
      // 最後のモデルでない限り、次のモデルを試す
      if (model !== modelsToTry[modelsToTry.length - 1]) {
        continue;
      }
      
      // 最後のモデルでも失敗した場合
      throw error;
    }
  }
  
  // 全てのモデルが失敗した場合
  if (lastError) {
    const errorMsg = lastError.message.toLowerCase();
    if (errorMsg.includes("404") || errorMsg.includes("not found")) {
      throw new Error(
        `Grok API モデルが見つかりません (404)。試行したモデル: ${triedModels.join(", ")}。GROK_MODEL環境変数で利用可能なモデル名を指定してください。`,
      );
    }
    throw new Error(
      `Failed to call Grok API: ${lastError.message}`,
    );
  }
  
  throw new Error("Grok API: 利用可能なモデルが見つかりませんでした");
}

export async function analyzeTwitterTrends(
  keywords: string[],
  timeRange: "last_week" | "last_month" | "last_3months" = "last_month",
): Promise<string> {
  const timeRangeText = {
    last_week: "過去1週間",
    last_month: "過去1ヶ月",
    last_3months: "過去3ヶ月",
  }[timeRange];

  const defaultPrompt = `あなたはSNSマーケティングの専門家です。
Twitter/Xで以下のキーワードに関連する最新のトレンドを調査してください：

キーワード: ${keywords.join(", ")}
期間: ${timeRangeText}

以下の観点から分析してください：
1. 人気のハッシュタグ
2. 影響力のあるアカウントやインフルエンサー
3. 人気の投稿やコンテンツの特徴
4. エンゲージメント（いいね、リツイート、コメント）の傾向
5. 話題になっている美容施術や治療

わかりやすく読みやすい形式で、調査結果をまとめてください。最後に、トレンド分析の総括を記載してください。`;

  const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
  const template = await getPrompt("grok_analyze_twitter_trends", defaultPrompt);
  const prompt = replacePlaceholders(template, { 
    keywords: keywords.join(", "),
    timeRange: timeRangeText
  });
  
  return callGrok(prompt);
}

/**
 * 現在使用中のGrokモデル名を取得（デバッグ用）
 */
export function getCurrentGrokModel(): string | null {
  return cachedModelName || process.env.GROK_MODEL || GROK_MODEL_CANDIDATES[0] || null;
}

