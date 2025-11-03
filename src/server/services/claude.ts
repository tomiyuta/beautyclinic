import Anthropic from "@anthropic-ai/sdk";
import { getPrompt, replacePlaceholders } from "./prompt-helper";

const apiKey = process.env.CLAUDE_API_KEY;

if (!apiKey) {
  console.warn("CLAUDE_API_KEY is not set. Claude features will be disabled.");
}

const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

// 利用可能なモデル名のリスト（優先順位順）
// APIキーの権限によって利用可能なモデルが異なる場合があります
const DEFAULT_MODEL_CANDIDATES = [
  "claude-3-5-sonnet",           // 日付なし（最も互換性が高い）
  "claude-3-5-sonnet-20241022",  // 2024年10月リリース
  "claude-3-5-sonnet-20240620",  // 2024年6月リリース
  "claude-3-opus-20240229",      // Opusモデル
  "claude-3-sonnet-20240229",    // Sonnetモデル
  "claude-3-haiku-20240307",     // Haikuモデル（高速・低コスト）
];

// 成功したモデル名をキャッシュ（サーバー起動中は保持）
let cachedModelName: string | null = null;

/**
 * 利用可能なClaudeモデルを自動的に選択します
 * 1. 環境変数 CLAUDE_MODEL が設定されている場合はそれを使用
 * 2. キャッシュされたモデルがある場合はそれを使用
 * 3. それ以外の場合は候補リストから順に試行して最初に成功したものを使用
 */
async function selectClaudeModel(): Promise<string> {
  // 環境変数で指定されている場合はそれを使用
  const envModel = process.env.CLAUDE_MODEL;
  if (envModel) {
    console.log(`Using Claude model from environment: ${envModel}`);
    return envModel;
  }

  // キャッシュされたモデルがある場合はそれを使用
  if (cachedModelName) {
    return cachedModelName;
  }

  // デフォルトは最初の候補を使用（実際のエラーはAPI呼び出し時に検出）
  return DEFAULT_MODEL_CANDIDATES[0]!;
}

export async function callClaude(prompt: string): Promise<string> {
  if (!anthropic) {
    throw new Error(
      "Claude API key is not configured. Please set CLAUDE_API_KEY environment variable.",
    );
  }

  // 全ての候補モデルを順に試行
  let lastError: Error | null = null;
  const triedModels: string[] = [];

  for (const modelName of DEFAULT_MODEL_CANDIDATES) {
    // 環境変数で指定されている場合はそれのみを試行
    if (process.env.CLAUDE_MODEL && modelName !== process.env.CLAUDE_MODEL) {
      continue;
    }

    // キャッシュされたモデルがある場合はそれのみを試行
    if (cachedModelName && modelName !== cachedModelName) {
      continue;
    }

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
      if (!cachedModelName) {
        cachedModelName = modelName;
        console.log(`Claude model cached: ${modelName}`);
      }

      return message.content[0]?.type === "text"
        ? message.content[0].text
        : "";
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

  return callClaude(prompt);
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

  return callClaude(prompt);
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

  return callClaude(prompt);
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

  return callClaude(prompt);
}

