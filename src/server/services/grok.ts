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
    console.log(`[Grok Trend Analysis] Web検索実行: ${searchQuery}`);
    const searchResults = await performWebSearch(searchQuery, 10);
    webSearchResults = formatSearchResults(searchResults);
    console.log(`[Grok Trend Analysis] Web検索結果: ${searchResults.length}件取得`);
  } catch (error) {
    console.warn("[Grok Trend Analysis] Web検索に失敗しましたが、続行します:", error);
    webSearchResults = `【注意】Web検索APIが設定されていないため、最新情報の取得に制限があります。\n${error instanceof Error ? error.message : "Unknown error"}\n`;
  }

  const defaultPrompt = `あなたは美容皮膚科クリニックの市場調査専門家です。
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

わかりやすく読みやすい形式で調査結果をまとめてください。最後に、トレンド分析の総括を記載してください。`;

  const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
  const template = await getPrompt("grok_research_trend_analysis", defaultPrompt);
  const prompt = replacePlaceholders(template, { 
    location,
    currentDate: currentDateStr,
    currentYear: currentYear.toString(),
    currentMonth: currentMonth.toString(),
    webSearchResults: webSearchResults || "【注意】Web検索結果が取得できませんでした。"
  });
  
  return callGrok(prompt);
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
    
    console.log(`[Grok Price Comparison] 入力パラメータ - 施術数: ${treatments.length}, 都市数: ${cities.length}`);
    
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
          console.warn(`[Grok Price Comparison] 商品「${treatment}」のWeb検索に失敗しましたが、続行します:`, error);
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
    console.warn("[Grok Price Comparison] Web検索に失敗しましたが、続行します:", error);
    webSearchResults = `【注意】Web検索APIが設定されていないため、最新情報の取得に制限があります。\n${error instanceof Error ? error.message : "Unknown error"}\n`;
  }

  const defaultPrompt = `あなたは美容皮膚科クリニックの価格調査専門家です。
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

最後に、価格比較の総括を記載してください。`;

  const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
  const template = await getPrompt("grok_research_price_comparison", defaultPrompt);
  const prompt = replacePlaceholders(template, { 
    cities: cities.join(", "),
    treatments: treatments.join(", "),
    currentDate: currentDateStr,
    webSearchResults: webSearchResults || "【注意】Web検索結果が取得できませんでした。"
  });
  
  return callGrok(prompt);
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
    console.log(`[Grok Competitor Analysis] Web検索実行: ${searchQuery}`);
    const searchResults = await performWebSearch(searchQuery, 10);
    webSearchResults = formatSearchResults(searchResults);
    console.log(`[Grok Competitor Analysis] Web検索結果: ${searchResults.length}件取得`);
  } catch (error) {
    console.warn("[Grok Competitor Analysis] Web検索に失敗しましたが、続行します:", error);
    webSearchResults = `【注意】Web検索APIが設定されていないため、最新情報の取得に制限があります。\n${error instanceof Error ? error.message : "Unknown error"}\n`;
  }

  const defaultPrompt = `あなたは美容皮膚科クリニックの競合調査専門家です。
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

各競合クリニックについて、わかりやすく読みやすい形式でまとめてください。最後に、競合分析の総括を記載してください。`;

  const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
  const template = await getPrompt("grok_research_competitor_analysis", defaultPrompt);
  const prompt = replacePlaceholders(template, { 
    location,
    radius: radius.toString(),
    webSearchResults: webSearchResults || "【注意】Web検索結果が取得できませんでした。"
  });
  
  return callGrok(prompt);
}

