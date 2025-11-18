import Anthropic from "@anthropic-ai/sdk";
import { getPrompt, replacePlaceholders } from "./prompt-helper";

const apiKey = process.env.CLAUDE_API_KEY;

if (!apiKey) {
  console.warn("CLAUDE_API_KEY is not set. Claude features will be disabled.");
}

const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

// 利用可能なモデル名のリスト（優先順位順 - 最新版を最優先）
// APIキーの権限によって利用可能なモデルが異なる場合があります
// 2025年11月時点で利用可能な最新モデル

// Opus 4.1用のモデル候補（総合分析・新規導入提案用）
const OPUS_4_1_CANDIDATES = [
  "claude-opus-4-1",              // Claude Opus 4.1（最新版・2025年8月リリース・最高性能・確認済み）
  "claude-3-opus-20240229",      // Claude 3 Opus（高性能版・非推奨・2026年1月5日終了予定・確認済み）
  "claude-sonnet-4-5-20250929",  // Claude Sonnet 4.5（フォールバック）
  "claude-3-5-sonnet-20241022",  // Claude 3.5 Sonnet（フォールバック）
];

// Sonnet 4.5用のモデル候補（価格設定提案・キャンペーン案用）
const SONNET_4_5_CANDIDATES = [
  "claude-sonnet-4-5-20250929",  // Claude Sonnet 4.5（2025年9月リリース・高性能・確認済み）
  "claude-3-5-sonnet-20241022",  // Claude 3.5 Sonnet（2024年10月リリース・高性能）
  "claude-3-5-sonnet",            // Claude 3.5 Sonnet（日付なし・互換性重視）
  "claude-3-5-sonnet-20240620",  // Claude 3.5 Sonnet（2024年6月リリース）
  "claude-3-sonnet-20240229",    // Claude 3 Sonnet（標準版）
];

// デフォルトのモデル候補（後方互換性のため）
const DEFAULT_MODEL_CANDIDATES = [
  "claude-opus-4-1",              // Claude Opus 4.1（最新版・2025年8月リリース・最高性能・確認済み）
  "claude-sonnet-4-5-20250929",  // Claude Sonnet 4.5（2025年9月リリース・高性能・確認済み）
  "claude-3-5-sonnet-20241022",  // Claude 3.5 Sonnet（2024年10月リリース・高性能）
  "claude-3-5-haiku-20241022",   // Claude 3.5 Haiku（2024年10月リリース・高速・低コスト・確認済み）
  "claude-3-5-sonnet",            // Claude 3.5 Sonnet（日付なし・互換性重視）
  "claude-3-5-haiku",             // Claude 3.5 Haiku（日付なし・互換性重視）
  "claude-3-5-sonnet-20240620",  // Claude 3.5 Sonnet（2024年6月リリース）
  "claude-3-opus-20240229",      // Claude 3 Opus（高性能版・非推奨・2026年1月5日終了予定・確認済み）
  "claude-3-sonnet-20240229",    // Claude 3 Sonnet（標準版）
  "claude-3-haiku-20240307",     // Claude 3 Haiku（旧版・高速・低コスト）
];

// 成功したモデル名をキャッシュ（サーバー起動中は保持）
// 用途別にキャッシュを分ける
const cachedModelNames: Record<string, string | null> = {
  opus: null,
  sonnet: null,
  default: null,
};

/**
 * Claude APIを呼び出します
 * @param prompt - プロンプトテキスト
 * @param preferredModelCandidates - 使用するモデル候補リスト（オプション）
 * @param cacheKey - キャッシュキー（"opus", "sonnet", "default"など）
 */
export async function callClaude(
  prompt: string,
  preferredModelCandidates?: string[],
  cacheKey: string = "default",
): Promise<string> {
  if (!anthropic) {
    throw new Error(
      "Claude API key is not configured. Please set CLAUDE_API_KEY environment variable.",
    );
  }

  // 使用するモデル候補リストを決定
  const modelCandidates = preferredModelCandidates || DEFAULT_MODEL_CANDIDATES;

  // 環境変数で指定されている場合はそれのみを試行
  const envModel = process.env.CLAUDE_MODEL;
  if (envModel) {
    console.log(`Using Claude model from environment: ${envModel}`);
    // 環境変数で指定されている場合は、そのモデルのみを試行
    const candidates = [envModel];
    return tryModels(candidates, prompt, cacheKey);
  }

  // キャッシュされたモデルがある場合はそれのみを試行
  const cachedModel = cachedModelNames[cacheKey];
  if (cachedModel && modelCandidates.includes(cachedModel)) {
    console.log(`Using cached Claude model for ${cacheKey}: ${cachedModel}`);
    return tryModels([cachedModel], prompt, cacheKey);
  }

  // 全ての候補モデルを順に試行
  return tryModels(modelCandidates, prompt, cacheKey);
}

/**
 * モデル候補リストを順に試行します
 */
async function tryModels(
  modelCandidates: string[],
  prompt: string,
  cacheKey: string,
): Promise<string> {
  if (!anthropic) {
    throw new Error(
      "Claude API key is not configured. Please set CLAUDE_API_KEY environment variable.",
    );
  }

  let lastError: Error | null = null;
  const triedModels: string[] = [];

  for (const modelName of modelCandidates) {
    triedModels.push(modelName);

    try {
      const message = await anthropic.messages.create({
        model: modelName,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      // 成功したモデルをキャッシュ
      if (!cachedModelNames[cacheKey]) {
        cachedModelNames[cacheKey] = modelName;
        console.log(`Claude model cached for ${cacheKey}: ${modelName}`);
      }

      const content = message.content[0]?.type === "text"
        ? message.content[0].text
        : "";
      
      // 出力の冒頭に使用モデル情報を追加
      const modelInfo = `【使用AIモデル: Claude ${modelName}】\n\n`;
      return modelInfo + content;
    } catch (error) {
      console.error(`Claude API error with model ${modelName}:`, error);

      // 404エラー以外の場合は即座にエラーを投げる
      const errorObj = error && typeof error === "object"
        ? (error as { status?: number; message?: string; error?: { message?: string } })
        : null;

      if (errorObj && (errorObj.status === 404 || errorObj.error?.message?.includes("not_found"))) {
        // 404エラーの場合、次のモデルを試行
        lastError = new Error(
          `Model ${modelName} not found (404). Trying next model...`,
        );
        continue;
      }

      // 404以外のエラーの場合は即座にエラーを投げる
      throw new Error(
        `Failed to call Claude API: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // 全てのモデルが利用できない場合
  const errorMessage = lastError?.message || "All model candidates failed";
  throw new Error(
    `Claude API モデルが見つかりません (404)。試行したモデル: ${triedModels.join(", ")}。CLAUDE_MODEL環境変数で利用可能なモデル名を指定してください。詳細: ${errorMessage}`,
  );
}

export async function analyzeMarketPosition(
  clinicProducts: Array<{
    name: string;
    costPrice: number;
    sellingPrice: number;
    category?: string | null;
  }>,
  marketData: {
    trends?: Record<string, unknown> | null;
    pricing?: Record<string, unknown> | null;
    competitors?: Record<string, unknown> | null;
  },
  snsData: Array<{
    platform: string;
    hashtags?: unknown[];
    influencers?: unknown[];
    popularContent?: unknown[];
    engagement?: Record<string, unknown>;
  }>,
  location: string,
): Promise<string> {
  const defaultPrompt = `あなたは美容クリニックの経営戦略コンサルタントです。
以下のデータを総合的に分析し、戦略的な提案を行ってください。

【自院の商品情報】
\${clinicProducts}

【市場調査データ】
\${marketData}

【SNS調査データ】
\${snsData}

【所在地】
\${location}

以下の観点から総合分析を行い、わかりやすく読みやすい形式で提案を返してください：

1. 市場ポジション分析
   - 強み
   - 弱み
   - 機会
   - 脅威

2. 価格調整の提案
   - 各商品の現在価格と推奨価格
   - 価格調整の理由
   - 優先度

3. キャンペーン案
   - キャンペーン名と説明
   - ターゲット層
   - 実施期間
   - プロモーション内容
   - 期待される効果
   - 推奨SNSプラットフォーム

4. 新施術提案
   - 施術名
   - 導入理由
   - 市場需要
   - 想定価格
   - 競争力

5. マーケティング戦略
   - 全体的な方向性
   - 主要施策
   - タイムライン
   - 成功指標

6. 分析総括`;

  const template = await getPrompt("claude_analyze_market_position", defaultPrompt);
  const prompt = replacePlaceholders(template, {
    clinicProducts: JSON.stringify(clinicProducts, null, 2),
    marketData: JSON.stringify(marketData, null, 2),
    snsData: JSON.stringify(snsData, null, 2),
    location,
  });

  // 総合分析はOpus 4.1を使用
  return callClaude(prompt, OPUS_4_1_CANDIDATES, "opus");
}

export async function generatePriceRecommendations(
  products: Array<{
    name: string;
    costPrice: number;
    sellingPrice: number;
    category?: string | null;
  }>,
  marketPricing: Record<string, unknown>,
): Promise<string> {
  const defaultPrompt = `あなたは美容クリニックの価格戦略専門家です。
以下の商品情報と市場価格データを基に、価格設定の提案を行ってください。

【自院商品】
\${products}

【市場価格データ】
\${marketPricing}

各商品について、以下の情報を含めてわかりやすく提案してください：

- 商品名
- 現在の価格
- 推奨価格
- 価格変動（%増減）
- 価格調整の理由
- 優先度（高/中/低）
- リスク要因
- 機会要因

最後に、価格戦略の総括と全体的な推奨事項を記載してください。`;

  const template = await getPrompt("claude_generate_price_recommendations", defaultPrompt);
  const prompt = replacePlaceholders(template, {
    products: JSON.stringify(products, null, 2),
    marketPricing: JSON.stringify(marketPricing, null, 2),
  });

  // 価格設定提案はSonnet 4.5を使用
  return callClaude(prompt, SONNET_4_5_CANDIDATES, "sonnet");
}

export async function generateCampaignProposals(
  trends: Array<Record<string, unknown>>,
  snsData: Array<Record<string, unknown>>,
): Promise<string> {
  const defaultPrompt = `あなたは美容クリニックのマーケティングキャンペーン企画専門家です。
以下のトレンドデータとSNSデータを基に、効果的な月次キャンペーン案を2つ以上提案してください。

【市場トレンド】
\${trends}

【SNSトレンド】
\${snsData}

各キャンペーン案について、以下の情報を含めてわかりやすく提案してください：

- キャンペーン名
- キャンペーン説明
- ターゲット層
- 実施期間（例：2024年11月）
- プロモーション内容（割引率、特典など）
- 実施チャンネル
- SNS戦略
- 期待される効果
- 予算の目安
- 優先度（高/中/低）

最後に、キャンペーン戦略の総括と推奨実施時期を記載してください。`;

  const template = await getPrompt("claude_generate_campaign_proposals", defaultPrompt);
  const prompt = replacePlaceholders(template, {
    trends: JSON.stringify(trends, null, 2),
    snsData: JSON.stringify(snsData, null, 2),
  });

  // キャンペーン案はSonnet 4.5を使用
  return callClaude(prompt, SONNET_4_5_CANDIDATES, "sonnet");
}

export async function suggestNewTreatments(
  currentTreatments: Array<{
    name: string;
    category?: string | null;
  }>,
  marketTrends: Array<Record<string, unknown>>,
  snsTrends: Array<Record<string, unknown>>,
): Promise<string> {
  const defaultPrompt = `あなたは美容クリニックの施術開発コンサルタントです。
以下の情報を基に、未導入の有望な施術・治療の導入提案を行ってください。

【現在導入済み施術】
\${currentTreatments}

【市場トレンド】
\${marketTrends}

【SNSトレンド】
\${snsTrends}

各新施術提案について、以下の情報を含めてわかりやすく提案してください：

- 施術名
- カテゴリ
- 導入理由
- 市場需要（高/中/低）
- トレンド状況
- 価格情報
  - 原価の目安
  - 販売価格の目安
  - 市場価格帯
- 競争力の評価
- 導入に必要な投資
- 投資対効果
- 優先度（高/中/低）
- 導入方法・スケジュール

最後に、新施術導入戦略の総括と推奨導入タイムラインを記載してください。`;

  const template = await getPrompt("claude_suggest_new_treatments", defaultPrompt);
  const prompt = replacePlaceholders(template, {
    currentTreatments: JSON.stringify(currentTreatments, null, 2),
    marketTrends: JSON.stringify(marketTrends, null, 2),
    snsTrends: JSON.stringify(snsTrends, null, 2),
  });

  // 新規導入提案はOpus 4.1を使用
  return callClaude(prompt, OPUS_4_1_CANDIDATES, "opus");
}

/**
 * 現在使用中のClaudeモデル名を取得（用途別）
 * @param cacheKey - キャッシュキー（"opus", "sonnet", "default"）
 */
export function getCurrentClaudeModel(cacheKey: string = "default"): string | null {
  const envModel = process.env.CLAUDE_MODEL;
  if (envModel) {
    return envModel;
  }
  
  const cachedModel = cachedModelNames[cacheKey];
  if (cachedModel) {
    return cachedModel;
  }
  
  // デフォルトの候補リストから最初のものを返す
  if (cacheKey === "opus") {
    return OPUS_4_1_CANDIDATES[0] || null;
  } else if (cacheKey === "sonnet") {
    return SONNET_4_5_CANDIDATES[0] || null;
  }
  
  return DEFAULT_MODEL_CANDIDATES[0] || null;
}

