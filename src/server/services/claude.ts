import Anthropic from "@anthropic-ai/sdk";

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
  const prompt = `あなたは美容クリニックの経営戦略コンサルタントです。
以下のデータを総合的に分析し、戦略的な提案を行ってください。

【自院の商品情報】
${JSON.stringify(clinicProducts, null, 2)}

【市場調査データ】
${JSON.stringify(marketData, null, 2)}

【SNS調査データ】
${JSON.stringify(snsData, null, 2)}

【所在地】
${location}

以下の観点から総合分析を行い、以下のJSON形式で提案を返してください：
{
  "marketPosition": {
    "strengths": ["強み1", "強み2"],
    "weaknesses": ["弱み1", "弱み2"],
    "opportunities": ["機会1", "機会2"],
    "threats": ["脅威1", "脅威2"]
  },
  "priceAdjustments": [
    {
      "productName": "商品名",
      "currentPrice": "現在の価格",
      "recommendedPrice": "推奨価格",
      "reason": "理由",
      "priority": "high" | "medium" | "low"
    }
  ],
  "campaignProposals": [
    {
      "title": "キャンペーン名",
      "description": "キャンペーン説明",
      "targetAudience": "ターゲット層",
      "period": "実施期間",
      "promotion": "プロモーション内容",
      "expectedResult": "期待される効果",
      "snsPlatforms": ["推奨SNSプラットフォーム"]
    }
  ],
  "newTreatmentSuggestions": [
    {
      "treatmentName": "施術名",
      "reason": "導入理由",
      "marketDemand": "市場需要",
      "expectedPrice": "想定価格",
      "competitiveness": "競争力"
    }
  ],
  "marketingStrategy": {
    "overallDirection": "全体的な方向性",
    "keyInitiatives": ["主要施策1", "主要施策2"],
    "timeline": "タイムライン",
    "successMetrics": ["成功指標1", "成功指標2"]
  },
  "summary": "分析総括"
}`;

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
  const prompt = `あなたは美容クリニックの価格戦略専門家です。
以下の商品情報と市場価格データを基に、価格設定の提案を行ってください。

【自院商品】
${JSON.stringify(products, null, 2)}

【市場価格データ】
${JSON.stringify(marketPricing, null, 2)}

以下のJSON形式で価格提案を返してください：
{
  "recommendations": [
    {
      "productName": "商品名",
      "currentPrice": "現在の価格",
      "recommendedPrice": "推奨価格",
      "priceChange": "価格変動（%増減）",
      "reason": "価格調整の理由",
      "priority": "high" | "medium" | "low",
      "risks": "リスク要因",
      "opportunities": "機会要因"
    }
  ],
  "summary": "価格戦略の総括",
  "overallRecommendation": "全体的な推奨事項"
}`;

  return callClaude(prompt);
}

export async function generateCampaignProposals(
  trends: Array<Record<string, unknown>>,
  snsData: Array<Record<string, unknown>>,
): Promise<string> {
  const prompt = `あなたは美容クリニックのマーケティングキャンペーン企画専門家です。
以下のトレンドデータとSNSデータを基に、効果的な月次キャンペーン案を2つ以上提案してください。

【市場トレンド】
${JSON.stringify(trends, null, 2)}

【SNSトレンド】
${JSON.stringify(snsData, null, 2)}

以下のJSON形式でキャンペーン案を返してください（最低2つ以上）：
{
  "campaigns": [
    {
      "title": "キャンペーン名",
      "description": "キャンペーン説明",
      "targetAudience": "ターゲット層",
      "period": "実施期間（例：2024年11月）",
      "promotion": "プロモーション内容（割引率、特典など）",
      "channels": ["実施チャンネル"],
      "snsStrategy": "SNS戦略",
      "expectedResult": "期待される効果",
      "budget": "予算の目安",
      "priority": "high" | "medium" | "low"
    }
  ],
  "summary": "キャンペーン戦略の総括",
  "recommendedTiming": "推奨実施時期"
}`;

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
  const prompt = `あなたは美容クリニックの施術開発コンサルタントです。
以下の情報を基に、未導入の有望な施術・治療の導入提案を行ってください。

【現在導入済み施術】
${JSON.stringify(currentTreatments, null, 2)}

【市場トレンド】
${JSON.stringify(marketTrends, null, 2)}

【SNSトレンド】
${JSON.stringify(snsTrends, null, 2)}

以下のJSON形式で新施術提案を返してください：
{
  "suggestions": [
    {
      "treatmentName": "施術名",
      "category": "カテゴリ",
      "reason": "導入理由",
      "marketDemand": "市場需要（高/中/低）",
      "trend": "トレンド状況",
      "expectedPrice": {
        "costPrice": "原価の目安",
        "sellingPrice": "販売価格の目安",
        "priceRange": "市場価格帯"
      },
      "competitiveness": "競争力の評価",
      "investment": "導入に必要な投資",
      "roi": "投資対効果",
      "priority": "high" | "medium" | "low",
      "implementation": "導入方法・スケジュール"
    }
  ],
  "summary": "新施術導入戦略の総括",
  "recommendedTimeline": "推奨導入タイムライン"
}`;

  return callClaude(prompt);
}

