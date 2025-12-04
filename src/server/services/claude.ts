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
    trends?: string | Record<string, unknown> | null;
    pricing?: string | Record<string, unknown> | null;
    competitors?: string | Record<string, unknown> | null;
  },
  snsData: Array<string | Record<string, unknown>>,
  location: string,
): Promise<string> {
  try {
    const { performWebSearchWithSerpAPIOnly, formatSearchResults, generateTrendSearchQuery } = await import("./web-search");
    
    // 現在の日付を取得
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Web検索を実行して最新情報を取得（SerpAPI必須）
    const searchQuery = generateTrendSearchQuery(location, currentYear, currentMonth);
    console.log(`[Claude analyzeMarketPosition] Web検索実行: ${searchQuery}`);
    const searchResults = await performWebSearchWithSerpAPIOnly(searchQuery, 10);
    const webSearchResults = formatSearchResults(searchResults);
    console.log(`[Claude analyzeMarketPosition] Web検索結果: ${searchResults.length}件取得`);

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
    
    // データを構造化してフォーマット（ChatGPT/Geminiと同様の処理）
    const clinicProductsFormatted = clinicProducts.map(p => ({
      商品名: p.name,
      原価: p.costPrice,
      販売価格: p.sellingPrice,
      カテゴリ: p.category || "未分類",
    }));
    
    // 市場データを処理（文字列の場合はそのまま使用、オブジェクトの場合は構造化）
    const marketDataFormatted: Record<string, unknown> = {};
    
    if (marketData.trends) {
      // 文字列の場合はそのまま使用（トークン量削減）
      if (typeof marketData.trends === "string") {
        marketDataFormatted.トレンド = marketData.trends;
      } else {
        // オブジェクトの場合は構造化データを優先的に使用
        const trends = marketData.trends as Record<string, unknown>;
        if (trends.consensusJSON) {
          marketDataFormatted.トレンド = trends.consensusJSON;
        } else if (trends.text) {
          marketDataFormatted.トレンド = trends.text;
        } else {
          marketDataFormatted.トレンド = trends;
        }
      }
    }
    
    if (marketData.pricing) {
      // 文字列の場合はそのまま使用（トークン量削減）
      if (typeof marketData.pricing === "string") {
        marketDataFormatted.価格情報 = marketData.pricing;
      } else {
        // オブジェクトの場合は構造化データを優先的に使用
        const pricing = marketData.pricing as Record<string, unknown>;
        if (pricing.consensusJSON) {
          marketDataFormatted.価格情報 = pricing.consensusJSON;
        } else if (pricing.text) {
          marketDataFormatted.価格情報 = pricing.text;
        } else {
          marketDataFormatted.価格情報 = pricing;
        }
      }
    }
    
    if (marketData.competitors) {
      // 文字列の場合はそのまま使用（トークン量削減）
      if (typeof marketData.competitors === "string") {
        marketDataFormatted.競合情報 = marketData.competitors;
      } else {
        // オブジェクトの場合は構造化データを優先的に使用
        const competitors = marketData.competitors as Record<string, unknown>;
        if (competitors.consensusJSON) {
          marketDataFormatted.競合情報 = competitors.consensusJSON;
        } else if (competitors.text) {
          marketDataFormatted.競合情報 = competitors.text;
        } else {
          marketDataFormatted.競合情報 = competitors;
        }
      }
    }
    
    // SNSデータを処理（文字列の場合はそのまま使用、オブジェクトの場合は構造化）
    const snsDataFormatted = snsData.map(s => {
      // 文字列の場合はそのまま使用（トークン量削減）
      if (typeof s === "string") {
        return s;
      }
      // オブジェクトの場合は構造化データを優先的に使用
      const data = s as Record<string, unknown>;
      if (data.consensusJSON) {
        return data.consensusJSON;
      } else if (data.text) {
        return data.text;
      } else if (data.platform) {
        // platformプロパティがある場合は、データをそのまま返す（Grokデータの識別のため）
        return data;
      }
      return s;
    });

    // JSON.stringifyのインデントを削除してトークン量を削減
    const prompt = replacePlaceholders(template, {
      clinicProducts: JSON.stringify(clinicProductsFormatted),
      marketData: JSON.stringify(marketDataFormatted),
      snsData: JSON.stringify(snsDataFormatted),
      location,
    });
    
    console.log(`[Claude analyzeMarketPosition] 商品数: ${clinicProducts.length}, 市場データ: ${JSON.stringify(marketDataFormatted).length}文字, SNSデータ: ${snsData.length}件`);

    // Web検索結果をプロンプトに追加
    const promptWithWebSearch = `${prompt}\n\n${webSearchResults}`;
    
    console.log(`[Claude analyzeMarketPosition] Prompt length: ${prompt.length} characters, with web search: ${promptWithWebSearch.length} characters`);

    // 総合分析はOpus 4.1を使用
    return callClaude(promptWithWebSearch, OPUS_4_1_CANDIDATES, "opus");
  } catch (error) {
    console.error("[Claude analyzeMarketPosition] Error:", error);
    throw error;
  }
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
  try {
    const { performWebSearchWithSerpAPIOnly, formatSearchResults, generatePriceSearchQuery } = await import("./web-search");
    
    // 現在の日付を取得
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // 商品名から検索クエリを生成
    const productNames = products.map(p => p.name);
    // 市場価格データから都市情報を抽出（可能な場合）
    const cities: string[] = [];
    if (marketPricing && typeof marketPricing === "object") {
      // marketPricingが配列の場合、各要素から都市情報を抽出
      if (Array.isArray(marketPricing)) {
        marketPricing.forEach(item => {
          if (item && typeof item === "object" && "city" in item && typeof item.city === "string") {
            if (!cities.includes(item.city)) {
              cities.push(item.city);
            }
          }
        });
      }
      // marketPricingがオブジェクトの場合、キーから都市情報を推測
      else {
        Object.keys(marketPricing).forEach(key => {
          if (key.includes("東京") || key.includes("大阪") || key.includes("名古屋") || key.includes("福岡")) {
            const city = key.match(/(東京|大阪|名古屋|福岡|横浜|京都|神戸|札幌|仙台|広島)/)?.[0];
            if (city && !cities.includes(city)) {
              cities.push(city);
            }
          }
        });
      }
    }
    // 都市情報が取得できない場合はデフォルトの都市を使用
    if (cities.length === 0) {
      cities.push("東京", "大阪", "名古屋");
    }
    
    // Web検索を実行して最新の価格情報を取得（SerpAPI必須）
    const searchQuery = generatePriceSearchQuery(productNames, cities, currentYear, currentMonth);
    console.log(`[Claude generatePriceRecommendations] Web検索実行: ${searchQuery}`);
    const searchResults = await performWebSearchWithSerpAPIOnly(searchQuery, 10);
    const webSearchResults = formatSearchResults(searchResults);
    console.log(`[Claude generatePriceRecommendations] Web検索結果: ${searchResults.length}件取得`);

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
    
    // データを構造化してフォーマット（ChatGPT/Geminiと同様の処理）
    const productsFormatted = products.map(p => ({
      商品名: p.name,
      現在価格: p.sellingPrice,
      原価: p.costPrice,
      カテゴリ: p.category || "未分類",
    }));

    // 市場価格データを処理（文字列の場合はそのまま使用、オブジェクトの場合は構造化）
    let marketPricingFormatted: unknown = marketPricing;
    
    if (marketPricing && typeof marketPricing === "object") {
      const pricing = marketPricing as Record<string, unknown>;
      // 構造化データを優先的に使用
      if (pricing.consensusJSON) {
        marketPricingFormatted = pricing.consensusJSON;
      } else if (pricing.text) {
        marketPricingFormatted = pricing.text;
      } else if (pricing.data && Array.isArray(pricing.data)) {
        // 配列データの場合はそのまま使用
        marketPricingFormatted = pricing.data;
      } else {
        marketPricingFormatted = pricing;
      }
    }

    // JSON.stringifyのインデントを削除してトークン量を削減
    const prompt = replacePlaceholders(template, {
      products: JSON.stringify(productsFormatted),
      marketPricing: JSON.stringify(marketPricingFormatted),
    });
    
    console.log(`[Claude generatePriceRecommendations] 商品数: ${products.length}, 市場価格データ: ${JSON.stringify(marketPricingFormatted).length}文字`);

    // Web検索結果をプロンプトに追加
    const promptWithWebSearch = `${prompt}\n\n${webSearchResults}`;
    
    console.log(`[Claude generatePriceRecommendations] Prompt length: ${prompt.length} characters, with web search: ${promptWithWebSearch.length} characters`);

    // 価格設定提案はSonnet 4.5を使用
    return callClaude(promptWithWebSearch, SONNET_4_5_CANDIDATES, "sonnet");
  } catch (error) {
    console.error("[Claude generatePriceRecommendations] Error:", error);
    throw error;
  }
}

export async function generateCampaignProposals(
  trends: Array<Record<string, unknown>>,
  snsData: Array<Record<string, unknown>>,
): Promise<string> {
  try {
    const { performWebSearchWithSerpAPIOnly, formatSearchResults } = await import("./web-search");
    
    // 現在の日付を取得
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // トレンドからキーワードを抽出してWeb検索クエリを生成
    const keywords: string[] = [];
    trends.forEach(trend => {
      const trendData = trend as Record<string, unknown>;
      // 構造化データからキーワードを抽出
      if (trendData.consensusJSON && typeof trendData.consensusJSON === "object") {
        const consensus = trendData.consensusJSON as Record<string, unknown>;
        if (consensus.treatments && Array.isArray(consensus.treatments)) {
          const treatments = consensus.treatments as Array<{ name?: string }>;
          treatments.forEach(t => {
            if (t.name && typeof t.name === "string") {
              keywords.push(t.name);
            }
          });
        }
      }
      // フォールバック: treatmentsプロパティから直接取得
      if (trendData.treatments && Array.isArray(trendData.treatments)) {
        const treatments = trendData.treatments as Array<{ name?: string }>;
        treatments.forEach(t => {
          if (t.name && typeof t.name === "string") {
            keywords.push(t.name);
          }
        });
      }
    });
    
    // Web検索を実行して最新のキャンペーントレンドを取得（SerpAPI必須）
    const searchQuery = `美容クリニック キャンペーン ${keywords.slice(0, 3).join(" ")} ${currentYear}年${currentMonth}月 トレンド`;
    console.log(`[Claude generateCampaignProposals] Web検索実行: ${searchQuery}`);
    const searchResults = await performWebSearchWithSerpAPIOnly(searchQuery, 10);
    const webSearchResults = formatSearchResults(searchResults);
    console.log(`[Claude generateCampaignProposals] Web検索結果: ${searchResults.length}件取得`);

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
    
    // データを処理（文字列の場合はそのまま使用、オブジェクトの場合は構造化データを優先）
    const trendsFormatted = trends.map(t => {
      // 文字列の場合はそのまま使用（トークン量削減）
      if (typeof t === "string") {
        return t;
      }
      // オブジェクトの場合は構造化データを優先的に使用
      const trendData = t as Record<string, unknown>;
      if (trendData.consensusJSON) {
        return trendData.consensusJSON;
      } else if (trendData.text) {
        return trendData.text;
      }
      return t;
    });
    
    const snsDataFormatted = snsData.map(s => {
      // 文字列の場合はそのまま使用（トークン量削減）
      if (typeof s === "string") {
        return s;
      }
      // オブジェクトの場合は構造化データを優先的に使用
      const snsDataItem = s as Record<string, unknown>;
      if (snsDataItem.consensusJSON) {
        return snsDataItem.consensusJSON;
      } else if (snsDataItem.text) {
        return snsDataItem.text;
      } else if (snsDataItem.platform) {
        // platformプロパティがある場合は、データをそのまま返す（Grokデータの識別のため）
        return snsDataItem;
      }
      return s;
    });

    // JSON.stringifyのインデントを削除してトークン量を削減
    const prompt = replacePlaceholders(template, {
      trends: JSON.stringify(trendsFormatted),
      snsData: JSON.stringify(snsDataFormatted),
    });
    
    console.log(`[Claude generateCampaignProposals] trends: ${trends.length}件, snsData: ${snsData.length}件`);

    // Web検索結果をプロンプトに追加
    const promptWithWebSearch = `${prompt}\n\n${webSearchResults}`;
    
    console.log(`[Claude generateCampaignProposals] Prompt length: ${prompt.length} characters, with web search: ${promptWithWebSearch.length} characters`);

    // キャンペーン案はSonnet 4.5を使用
    return callClaude(promptWithWebSearch, SONNET_4_5_CANDIDATES, "sonnet");
  } catch (error) {
    console.error("[Claude generateCampaignProposals] Error:", error);
    throw error;
  }
}

export async function suggestNewTreatments(
  currentTreatments: Array<{
    name: string;
    category?: string | null;
  }>,
  marketTrends: Array<Record<string, unknown>>,
  snsTrends: Array<Record<string, unknown>>,
): Promise<string> {
  try {
    const { performWebSearchWithSerpAPIOnly, formatSearchResults } = await import("./web-search");
    
    // 現在の日付を取得
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // 市場トレンドとSNSトレンドからキーワードを抽出してWeb検索クエリを生成
    const keywords: string[] = [];
    marketTrends.forEach(trend => {
      const trendData = trend as Record<string, unknown>;
      // 構造化データからキーワードを抽出
      if (trendData.consensusJSON && typeof trendData.consensusJSON === "object") {
        const consensus = trendData.consensusJSON as Record<string, unknown>;
        if (consensus.treatments && Array.isArray(consensus.treatments)) {
          const treatments = consensus.treatments as Array<{ name?: string }>;
          treatments.forEach(t => {
            if (t.name && typeof t.name === "string") {
              keywords.push(t.name);
            }
          });
        }
      }
      // フォールバック: treatmentsプロパティから直接取得
      if (trendData.treatments && Array.isArray(trendData.treatments)) {
        const treatments = trendData.treatments as Array<{ name?: string }>;
        treatments.forEach(t => {
          if (t.name && typeof t.name === "string") {
            keywords.push(t.name);
          }
        });
      }
    });
    
    // Web検索を実行して最新の施術トレンドを取得（SerpAPI必須）
    const searchQuery = `美容クリニック 新施術 ${keywords.slice(0, 3).join(" ")} ${currentYear}年${currentMonth}月 トレンド`;
    console.log(`[Claude suggestNewTreatments] Web検索実行: ${searchQuery}`);
    const searchResults = await performWebSearchWithSerpAPIOnly(searchQuery, 10);
    const webSearchResults = formatSearchResults(searchResults);
    console.log(`[Claude suggestNewTreatments] Web検索結果: ${searchResults.length}件取得`);

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
    
    // データを処理（文字列の場合はそのまま使用、オブジェクトの場合は構造化データを優先）
    const currentTreatmentsFormatted = currentTreatments.map(t => ({
      施術名: t.name,
      カテゴリ: t.category || "未分類",
    }));
    
    const marketTrendsFormatted = marketTrends.map(t => {
      // 文字列の場合はそのまま使用（トークン量削減）
      if (typeof t === "string") {
        return t;
      }
      // オブジェクトの場合は構造化データを優先的に使用
      const trendData = t as Record<string, unknown>;
      if (trendData.consensusJSON) {
        return trendData.consensusJSON;
      } else if (trendData.text) {
        return trendData.text;
      }
      return t;
    });
    
    const snsTrendsFormatted = snsTrends.map(s => {
      // 文字列の場合はそのまま使用（トークン量削減）
      if (typeof s === "string") {
        return s;
      }
      // オブジェクトの場合は構造化データを優先的に使用
      const snsDataItem = s as Record<string, unknown>;
      if (snsDataItem.consensusJSON) {
        return snsDataItem.consensusJSON;
      } else if (snsDataItem.text) {
        return snsDataItem.text;
      } else if (snsDataItem.platform) {
        // platformプロパティがある場合は、データをそのまま返す（Grokデータの識別のため）
        return snsDataItem;
      }
      return s;
    });

    // JSON.stringifyのインデントを削除してトークン量を削減
    const prompt = replacePlaceholders(template, {
      currentTreatments: JSON.stringify(currentTreatmentsFormatted),
      marketTrends: JSON.stringify(marketTrendsFormatted),
      snsTrends: JSON.stringify(snsTrendsFormatted),
    });
    
    console.log(`[Claude suggestNewTreatments] currentTreatments: ${currentTreatments.length}件, marketTrends: ${marketTrends.length}件, snsTrends: ${snsTrends.length}件`);

    // Web検索結果をプロンプトに追加
    const promptWithWebSearch = `${prompt}\n\n${webSearchResults}`;
    
    console.log(`[Claude suggestNewTreatments] Prompt length: ${prompt.length} characters, with web search: ${promptWithWebSearch.length} characters`);

    // 新規導入提案はOpus 4.1を使用
    return callClaude(promptWithWebSearch, OPUS_4_1_CANDIDATES, "opus");
  } catch (error) {
    console.error("[Claude suggestNewTreatments] Error:", error);
    throw error;
  }
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

/**
 * 市場調査: トレンド分析
 */
export async function researchTrendAnalysis(location: string): Promise<string> {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDateStr = `${currentYear}年${currentMonth}月`;

  // Web検索を実行して最新情報を取得
  let webSearchResults = "";
  try {
    const { performWebSearch, formatSearchResults, generateTrendSearchQuery } = await import("./web-search");
    const searchQuery = generateTrendSearchQuery(location, currentYear, currentMonth);
    console.log(`[Claude Trend Analysis] Web検索実行: ${searchQuery}`);
    const searchResults = await performWebSearch(searchQuery, 10);
    webSearchResults = formatSearchResults(searchResults);
    console.log(`[Claude Trend Analysis] Web検索結果: ${searchResults.length}件取得`);
  } catch (error) {
    console.warn("[Claude Trend Analysis] Web検索に失敗しましたが、続行します:", error);
    webSearchResults = `【注意】Web検索APIが設定されていないため、最新情報の取得に制限があります。\n${error instanceof Error ? error.message : "Unknown error"}\n`;
  }

  const defaultPrompt = `<SYS>
あなたは美容皮膚科クリニックの市場調査専門家です。
</SYS>

<USER>
${location}で現在流行している美容施術・治療について調査してください。

【重要】以下のWeb検索結果を基に、最新の情報を分析してください。
現在の日付は${currentDateStr}です。${currentYear}年${currentMonth}月時点の最新情報を優先的に使用してください。

${webSearchResults}

【分析指示】
以下の観点から、上記のWeb検索結果を基に分析してください：
1. 人気の高い施術（ダーマペン、ボツリヌス注射、ヒアルロン酸注入など）
2. 各施術の平均価格帯
3. 新しく注目されている施術や技術
4. 顧客ニーズの傾向

【重要】
- Web検索結果に含まれる最新の情報を優先的に使用してください
- 2024年以前の古い情報は使用しないでください
- 情報の出典（URL）を可能な限り明記してください
- 調査結果のタイトルや冒頭には「${currentDateStr}時点のWeb情報に基づき実施」と記載してください

わかりやすく読みやすい形式で調査結果をまとめてください。最後に、トレンド分析の総括を記載してください。
</USER>`;

  const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
  const template = await getPrompt("claude_research_trend_analysis", defaultPrompt);
  const prompt = replacePlaceholders(template, { 
    location,
    currentDate: currentDateStr,
    currentYear: currentYear.toString(),
    currentMonth: currentMonth.toString(),
    webSearchResults: webSearchResults || "【注意】Web検索結果が取得できませんでした。"
  });
  
  return callClaude(prompt);
}

/**
 * 市場調査: 価格比較
 */
export async function researchPriceComparison(
  treatments: string[],
  cities: string[],
): Promise<string> {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDateStr = `${currentYear}年${currentMonth}月`;

  // Web検索を実行して最新情報を取得
  let webSearchResults = "";
  try {
    const { performWebSearch, formatSearchResults, generatePriceSearchQuery } = await import("./web-search");
    
    console.log(`[Claude Price Comparison] 入力パラメータ - 施術数: ${treatments.length}, 都市数: ${cities.length}`);
    
    // 複数の商品がある場合は、各商品ごとに検索を実行
    const allSearchResults: Array<{ title: string; link: string; snippet: string; date?: string }> = [];
    
    if (treatments.length > 1) {
      for (const treatment of treatments) {
        try {
          const searchQuery = generatePriceSearchQuery([treatment], cities, currentYear, currentMonth);
          const searchResults = await performWebSearch(searchQuery, 10);
          const enrichedResults = searchResults.map(result => ({
            ...result,
            snippet: `[商品: ${treatment}] ${result.snippet}`,
          }));
          allSearchResults.push(...enrichedResults);
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.warn(`[Claude Price Comparison] 商品「${treatment}」のWeb検索に失敗しましたが、続行します:`, error);
        }
      }
      
      const uniqueResults = Array.from(
        new Map(allSearchResults.map(result => [result.link, result])).values()
      );
      webSearchResults = formatSearchResults(uniqueResults);
    } else {
      const searchQuery = generatePriceSearchQuery(treatments, cities, currentYear, currentMonth);
      const searchResults = await performWebSearch(searchQuery, 10);
      webSearchResults = formatSearchResults(searchResults);
    }
  } catch (error) {
    console.warn("[Claude Price Comparison] Web検索に失敗しましたが、続行します:", error);
    webSearchResults = `【注意】Web検索APIが設定されていないため、最新情報の取得に制限があります。\n${error instanceof Error ? error.message : "Unknown error"}\n`;
  }

  const defaultPrompt = `<SYS>
あなたは美容皮膚科クリニックの価格調査専門家です。
</SYS>

<USER>
以下の都市の美容クリニックでの施術価格を調査してください：

都市: ${cities.join(", ")}
施術: ${treatments.join(", ")}

【重要】以下のWeb検索結果を基に、最新の価格情報を分析してください。
現在の日付は${currentDateStr}です。${currentYear}年${currentMonth}月時点の最新情報を優先的に使用してください。

${webSearchResults}

【分析指示】
各都市・各施術について、上記のWeb検索結果を基に以下の情報を含めてわかりやすくまとめてください：
- 都市名
- 施術名
- 平均価格（数値）
- 価格帯の説明
- 調査件数（推定）
- 情報の出典（URL）

【重要】
- Web検索結果に含まれる最新の価格情報を優先的に使用してください
- 2024年以前の古い情報は使用しないでください
- 情報の出典（URL）を可能な限り明記してください
- 調査結果のタイトルや冒頭には「${currentDateStr}時点のWeb情報に基づき実施」と記載してください
- 複数の施術が指定されている場合、各施術について個別に価格情報を調査・記載してください

最後に、価格比較の総括を記載してください。
</USER>`;

  const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
  const template = await getPrompt("claude_research_price_comparison", defaultPrompt);
  const prompt = replacePlaceholders(template, { 
    cities: cities.join(", "),
    treatments: treatments.join(", "),
    currentDate: currentDateStr,
    webSearchResults: webSearchResults || "【注意】Web検索結果が取得できませんでした。"
  });
  
  return callClaude(prompt);
}

/**
 * 市場調査: 競合分析
 */
export async function researchCompetitorAnalysis(
  location: string,
  radius: number = 5,
): Promise<string> {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDateStr = `${currentYear}年${currentMonth}月`;

  // Web検索を実行して最新情報を取得
  let webSearchResults = "";
  try {
    const { performWebSearch, formatSearchResults, generateCompetitorSearchQuery } = await import("./web-search");
    const searchQuery = generateCompetitorSearchQuery(location, radius, currentYear, currentMonth);
    console.log(`[Claude Competitor Analysis] Web検索実行: ${searchQuery}`);
    const searchResults = await performWebSearch(searchQuery, 10);
    webSearchResults = formatSearchResults(searchResults);
    console.log(`[Claude Competitor Analysis] Web検索結果: ${searchResults.length}件取得`);
  } catch (error) {
    console.warn("[Claude Competitor Analysis] Web検索に失敗しましたが、続行します:", error);
    webSearchResults = `【注意】Web検索APIが設定されていないため、最新情報の取得に制限があります。\n${error instanceof Error ? error.message : "Unknown error"}\n`;
  }

  const defaultPrompt = `<SYS>
あなたは美容皮膚科クリニックの競合調査専門家です。
</SYS>

<USER>
${location}周辺${radius}km圏内の競合クリニックについて調査してください。

【重要】以下のWeb検索結果を基に、最新の競合情報を分析してください。
現在の日付は${currentDateStr}です。${currentYear}年${currentMonth}月時点の最新情報を優先的に使用してください。

${webSearchResults}

【分析指示】
以下の情報を、上記のWeb検索結果を基に収集してください：
1. 競合クリニックの名前と場所
2. 提供している主要な施術・治療
3. 各施術の価格設定
4. 特徴や強み

【重要】
- Web検索結果に含まれる最新の情報を優先的に使用してください
- 2024年以前の古い情報は使用しないでください
- 情報の出典（URL）を可能な限り明記してください
- 調査結果のタイトルや冒頭には「${currentDateStr}時点のWeb情報に基づき実施」と記載してください

各競合クリニックについて、わかりやすく読みやすい形式でまとめてください。最後に、競合分析の総括を記載してください。
</USER>`;

  const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
  const template = await getPrompt("claude_research_competitor_analysis", defaultPrompt);
  const prompt = replacePlaceholders(template, { 
    location,
    radius: radius.toString(),
    webSearchResults: webSearchResults || "【注意】Web検索結果が取得できませんでした。"
  });
  
  return callClaude(prompt);
}

