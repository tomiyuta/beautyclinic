import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn("OPENAI_API_KEY is not set. ChatGPT features will be disabled.");
}

const openai = apiKey ? new OpenAI({ apiKey }) : null;

/**
 * Claude用プロンプト（<SYS>, <DEV>, <USER>タグ付き）をChatGPT用に変換
 * - <SYS>の内容をsystemプロンプトとして抽出
 * - <DEV>と<USER>の内容をuserプロンプトとして統合
 * - タグ自体は削除
 */
function convertClaudePromptToChatGPT(claudePrompt: string): { systemPrompt: string; userPrompt: string } {
  if (!claudePrompt || typeof claudePrompt !== "string" || claudePrompt.trim().length === 0) {
    throw new Error("Claude prompt is empty or invalid");
  }

  // <SYS>タグの内容を抽出
  const sysMatch = claudePrompt.match(/<SYS>\s*([\s\S]*?)<\/SYS>/);
  const systemPrompt = sysMatch ? sysMatch[1]?.trim() || "" : "";

  // <DEV>タグの内容を抽出
  const devMatch = claudePrompt.match(/<DEV>\s*([\s\S]*?)<\/DEV>/);
  const devContent = devMatch ? devMatch[1]?.trim() || "" : "";

  // <USER>タグの内容を抽出
  const userMatch = claudePrompt.match(/<USER>\s*([\s\S]*?)<\/USER>/);
  const userContent = userMatch ? userMatch[1]?.trim() || "" : "";

  // <SYS>, <DEV>, <USER>タグがない場合は、プロンプト全体をuserプロンプトとして扱う
  if (!sysMatch && !devMatch && !userMatch) {
    return {
      systemPrompt: "あなたは美容クリニックの経営戦略コンサルタントです。小規模クリニックに最適化した実践的な戦略を提案してください。",
      userPrompt: claudePrompt.trim(),
    };
  }

  // DEVとUSERの内容を統合
  const userPromptParts = [devContent, userContent].filter(Boolean);
  const userPrompt = userPromptParts.length > 0 
    ? userPromptParts.join("\n\n").trim()
    : claudePrompt.trim(); // フォールバック: プロンプト全体を使用

  // userPromptが空の場合はエラー
  if (!userPrompt || userPrompt.length === 0) {
    console.error("[convertClaudePromptToChatGPT] userPrompt is empty after conversion");
    console.error("[convertClaudePromptToChatGPT] Original prompt length:", claudePrompt.length);
    console.error("[convertClaudePromptToChatGPT] devContent length:", devContent.length);
    console.error("[convertClaudePromptToChatGPT] userContent length:", userContent.length);
    throw new Error("Failed to extract user prompt from Claude format. userPrompt is empty.");
  }

  return {
    systemPrompt: systemPrompt || "あなたは美容クリニックの経営戦略コンサルタントです。小規模クリニックに最適化した実践的な戦略を提案してください。",
    userPrompt: userPrompt,
  };
}

export async function callChatGPT(
  prompt: string,
  systemPrompt?: string,
  maxTokens: number = 4096,
): Promise<string> {
  if (!openai) {
    throw new Error(
      "OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.",
    );
  }

  // プロンプトの検証
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    console.error("[ChatGPT API] Invalid prompt:", prompt);
    throw new Error("Prompt is empty or invalid");
  }

  try {
    const messages: Array<{ role: "system" | "user"; content: string }> = [];

    // systemプロンプトを追加
    const finalSystemPrompt = systemPrompt?.trim() || 
      "あなたは美容クリニックのマーケティングコンテンツ作成の専門家です。魅力的で効果的なマーケティング素材を作成してください。プロンプトに含まれるWeb検索結果を基に、最新の情報を活用してコンテンツを作成してください。";
    
    if (finalSystemPrompt) {
      messages.push({
        role: "system",
        content: finalSystemPrompt,
      });
    }

    // userプロンプトを追加
    messages.push({
      role: "user",
      content: prompt.trim(),
    });

    console.log(`[ChatGPT API] Calling with ${messages.length} messages, prompt length: ${prompt.length}, systemPrompt length: ${finalSystemPrompt.length}`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.7,
      max_tokens: maxTokens,
    });

    // レスポンスの検証
    if (!completion.choices || completion.choices.length === 0) {
      console.error("[ChatGPT API] No choices in response");
      throw new Error("ChatGPT API returned no choices");
    }

    const responseText = completion.choices[0]?.message?.content || "";

    if (!responseText || typeof responseText !== "string" || responseText.trim().length === 0) {
      console.warn("[ChatGPT API] Empty response text");
      console.warn("[ChatGPT API] Response object:", JSON.stringify(completion, null, 2));
      throw new Error("ChatGPT API returned empty response text");
    }

    console.log(`[ChatGPT API] Successfully received response, length: ${responseText.length}`);
    return responseText;
  } catch (error) {
    console.error("[ChatGPT API] Error details:", error);
    if (error && typeof error === "object" && "response" in error) {
      const apiError = error as { response?: { status?: number; data?: unknown } };
      console.error("[ChatGPT API] API error response:", apiError.response);
    }
    throw new Error(
      `Failed to call ChatGPT API: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function generateInstagramLP(
  campaign: {
    title: string;
    description: string;
    targetAudience?: string;
    promotion?: string;
  },
  designApproach: "minimal" | "bold" | "elegant" | "trendy" = "trendy",
): Promise<string> {
  // 現在の日付を取得（最新情報を取得するため）
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDateStr = `${currentYear}年${currentMonth}月`;

  const approachText = {
    minimal: "シンプルでミニマルなデザイン",
    bold: "大胆で目を引くデザイン",
    elegant: "エレガントで洗練されたデザイン",
    trendy: "トレンディで現代的なデザイン",
  }[designApproach];

  // Web検索を実行して最新情報を取得
  let webSearchResults = "";
  try {
    const { performWebSearch, formatSearchResults, generateInstagramLPSearchQuery } = await import("./web-search");
    const searchQuery = generateInstagramLPSearchQuery(campaign.title, currentYear, currentMonth);
    console.log(`[Instagram LP] Web検索実行: ${searchQuery}`);
    const searchResults = await performWebSearch(searchQuery, 10);
    webSearchResults = formatSearchResults(searchResults);
    console.log(`[Instagram LP] Web検索結果: ${searchResults.length}件取得`);
  } catch (error) {
    console.warn("[Instagram LP] Web検索に失敗しましたが、続行します:", error);
    webSearchResults = `【注意】Web検索APIが設定されていないため、最新情報の取得に制限があります。\n${error instanceof Error ? error.message : "Unknown error"}\n`;
  }

  const defaultPrompt = `以下のキャンペーン情報を基に、${approachText}のInstagram用LP案を作成してください。

【キャンペーン情報】
タイトル: ${campaign.title}
説明: ${campaign.description}
ターゲット層: ${campaign.targetAudience || "美容に興味のある20-50代の女性"}
プロモーション内容: ${campaign.promotion || "特典あり"}

【重要】以下のWeb検索結果を基に、最新のトレンドを取り入れたLP案を作成してください。
現在の日付は${currentDateStr}です。${currentYear}年${currentMonth}月時点の最新情報を優先的に使用してください。

${webSearchResults}

【作成指示】
以下の情報を含めて、上記のWeb検索結果を参考に、わかりやすく読みやすい形式で提案してください：

- LPのタイトル
- メインヘッドライン
- 説明文（3-4文程度）
- 主要ポイント（3つ程度）
- メリット（2つ程度）
- 行動喚起文（例：「今すぐ予約する」）
- 推奨ハッシュタグ（3つ程度）
- デザイン要素の詳細な指示
- 推奨カラースキーム
- トーン（例：親しみやすい、高級感のある）

【重要】
- Web検索結果に含まれる最新のトレンド情報を活用してください
- 2024年以前の古い情報は使用しないでください
- 情報の出典（URL）を可能な限り明記してください`;

  const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
  const template = await getPrompt("chatgpt_generate_instagram_lp", defaultPrompt);
  const prompt = replacePlaceholders(template, {
    campaignTitle: campaign.title,
    campaignDescription: campaign.description,
    targetAudience: campaign.targetAudience || "美容に興味のある20-50代の女性",
    promotion: campaign.promotion || "特典あり",
    approachText,
    currentDate: currentDateStr
  });

  return callChatGPT(prompt);
}

export async function generateWebsiteArticle(
  campaign: {
    title: string;
    description: string;
    targetAudience?: string;
  },
  seoKeywords: string[] = [],
): Promise<string> {
  // 現在の日付を取得（最新情報を取得するため）
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDateStr = `${currentYear}年${currentMonth}月`;

  const keywords = seoKeywords.length > 0 ? seoKeywords.join(", ") : "美容, 美容皮膚科, 施術";

  // Web検索を実行して最新情報を取得
  let webSearchResults = "";
  try {
    const { performWebSearch, formatSearchResults, generateWebsiteArticleSearchQuery } = await import("./web-search");
    const searchQuery = generateWebsiteArticleSearchQuery(campaign.title, seoKeywords.length > 0 ? seoKeywords : ["美容", "美容皮膚科"], currentYear, currentMonth);
    console.log(`[Website Article] Web検索実行: ${searchQuery}`);
    const searchResults = await performWebSearch(searchQuery, 10);
    webSearchResults = formatSearchResults(searchResults);
    console.log(`[Website Article] Web検索結果: ${searchResults.length}件取得`);
  } catch (error) {
    console.warn("[Website Article] Web検索に失敗しましたが、続行します:", error);
    webSearchResults = `【注意】Web検索APIが設定されていないため、最新情報の取得に制限があります。\n${error instanceof Error ? error.message : "Unknown error"}\n`;
  }

  const defaultPrompt = `以下のキャンペーン情報を基に、SEO最適化されたHP記事を作成してください。

【キャンペーン情報】
タイトル: ${campaign.title}
説明: ${campaign.description}
ターゲット層: ${campaign.targetAudience || "美容に興味のある20-50代の女性"}

【SEOキーワード】
${keywords}

【重要】以下のWeb検索結果を基に、最新の情報を含めたSEO最適化記事を作成してください。
現在の日付は${currentDateStr}です。${currentYear}年${currentMonth}月時点の最新情報を優先的に使用してください。

${webSearchResults}

【作成指示】
以下の要件を満たしてください：
- 見出しタグ（h1, h2, h3）を適切に使用
- SEOキーワードを自然に含める
- 読みやすく、情報価値の高い内容
- 800-1200文字程度
- 構造化されたHTML形式
- Web検索結果に含まれる最新の情報を活用してください
- 2024年以前の古い情報は使用しないでください

記事タイトル、メタディスクリプション（150文字以内）、主要キーワード、記事本文（HTML形式）、記事の要約（2-3文）を含めてください。`;

  const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
  const template = await getPrompt("chatgpt_generate_website_article", defaultPrompt);
  const prompt = replacePlaceholders(template, {
    campaignTitle: campaign.title,
    campaignDescription: campaign.description,
    targetAudience: campaign.targetAudience || "美容に興味のある20-50代の女性",
    keywords: keywords,
    currentDate: currentDateStr
  });

  return callChatGPT(prompt);
}

export async function generateCampaignCopy(
  campaign: {
    title: string;
    description: string;
    targetAudience?: string;
    promotion?: string;
  },
  tone: "professional" | "friendly" | "trendy" = "friendly",
): Promise<string> {
  // 現在の日付を取得（最新情報を取得するため）
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDateStr = `${currentYear}年${currentMonth}月`;

  const toneText = {
    professional: "プロフェッショナルで信頼感のある",
    friendly: "親しみやすく親近感のある",
    trendy: "トレンディで現代的な",
  }[tone];

  // Web検索を実行して最新情報を取得
  let webSearchResults = "";
  try {
    const { performWebSearch, formatSearchResults, generateCampaignCopySearchQuery } = await import("./web-search");
    const searchQuery = generateCampaignCopySearchQuery(campaign.title, currentYear, currentMonth);
    console.log(`[Campaign Copy] Web検索実行: ${searchQuery}`);
    const searchResults = await performWebSearch(searchQuery, 10);
    webSearchResults = formatSearchResults(searchResults);
    console.log(`[Campaign Copy] Web検索結果: ${searchResults.length}件取得`);
  } catch (error) {
    console.warn("[Campaign Copy] Web検索に失敗しましたが、続行します:", error);
    webSearchResults = `【注意】Web検索APIが設定されていないため、最新情報の取得に制限があります。\n${error instanceof Error ? error.message : "Unknown error"}\n`;
  }

  const defaultPrompt = `以下のキャンペーン情報を基に、${toneText}トーンのキャンペーンコピーを作成してください。

【キャンペーン情報】
タイトル: ${campaign.title}
説明: ${campaign.description}
ターゲット層: ${campaign.targetAudience || "美容に興味のある20-50代の女性"}
プロモーション内容: ${campaign.promotion || "特典あり"}

【重要】以下のWeb検索結果を基に、最新のトレンドを取り入れたキャンペーンコピーを作成してください。
現在の日付は${currentDateStr}です。${currentYear}年${currentMonth}月時点の最新情報を優先的に使用してください。

${webSearchResults}

【作成指示】
以下の情報を含めて、上記のWeb検索結果を参考に、わかりやすく読みやすい形式で提案してください：

- メインキャッチコピー
- サブキャッチコピー
- 本文（3-4段落）
- 行動喚起文
- キャッチフレーズ
- 主要メッセージ（3つ程度）

【重要】
- Web検索結果に含まれる最新のトレンド情報を活用してください
- 2024年以前の古い情報は使用しないでください
- 情報の出典（URL）を可能な限り明記してください`;

  const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
  const template = await getPrompt("chatgpt_generate_campaign_copy", defaultPrompt);
  const prompt = replacePlaceholders(template, {
    campaignTitle: campaign.title,
    campaignDescription: campaign.description,
    targetAudience: campaign.targetAudience || "美容に興味のある20-50代の女性",
    promotion: campaign.promotion || "特典あり",
    toneText,
    currentDate: currentDateStr
  });

  return callChatGPT(prompt);
}

// ==================== 戦略分析用関数 ====================

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
  try {
    const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
    const { performWebSearch, formatSearchResults, generateTrendSearchQuery } = await import("./web-search");
    
    // 現在の日付を取得
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Web検索を実行して最新情報を取得
    let webSearchResults = "";
    try {
      const searchQuery = generateTrendSearchQuery(location, currentYear, currentMonth);
      console.log(`[ChatGPT analyzeMarketPosition] Web検索実行: ${searchQuery}`);
      const searchResults = await performWebSearch(searchQuery, 10);
      webSearchResults = formatSearchResults(searchResults);
      console.log(`[ChatGPT analyzeMarketPosition] Web検索結果: ${searchResults.length}件取得`);
    } catch (error) {
      console.warn("[ChatGPT analyzeMarketPosition] Web検索に失敗しましたが、続行します:", error);
      webSearchResults = `【注意】Web検索APIが設定されていないため、最新情報の取得に制限があります。\n${error instanceof Error ? error.message : "Unknown error"}\n`;
    }
    
    // Claude用プロンプト（正式版）を取得
    const template = await getPrompt("claude_analyze_market_position", "");
    
    if (!template || template.trim().length === 0) {
      throw new Error("Failed to get prompt template for claude_analyze_market_position");
    }

    // データを構造化してフォーマット
    const clinicProductsFormatted = clinicProducts.map(p => ({
      商品名: p.name,
      原価: p.costPrice,
      販売価格: p.sellingPrice,
      カテゴリ: p.category || "未分類",
    }));
    
    // 市場データを詳細に構造化（CONSENSUS_JSONを優先的に使用）
    const marketDataFormatted: Record<string, unknown> = {};
    
    if (marketData.trends) {
      const trends = marketData.trends as Record<string, unknown>;
      marketDataFormatted.トレンド = {
        AI分析エージェント: trends.aiAgent || "unknown",
        分析日時: trends.createdAt || "unknown",
        構造化データ: trends.consensusJSON || null,
        レポート: trends.reportMarkdown ? "あり" : "なし",
        主要施術: trends.treatments || null,
        顧客ニーズ: trends.customerNeeds || null,
        情報源: trends.sources || null,
        生データ: trends.rawText ? "あり（構造化データを優先）" : "なし",
      };
    }
    
    if (marketData.pricing) {
      const pricing = marketData.pricing as Record<string, unknown>;
      marketDataFormatted.価格情報 = {
        AI分析エージェント: pricing.aiAgent || "unknown",
        分析日時: pricing.createdAt || "unknown",
        構造化データ: pricing.consensusJSON || null,
        レポート: pricing.reportMarkdown ? "あり" : "なし",
        価格テーブル: pricing.priceTable || null,
        エリアサマリー: pricing.areaSummary || null,
        情報源: pricing.sources || null,
        生データ: pricing.rawText ? "あり（構造化データを優先）" : "なし",
      };
    }
    
    if (marketData.competitors) {
      const competitors = marketData.competitors as Record<string, unknown>;
      marketDataFormatted.競合情報 = {
        AI分析エージェント: competitors.aiAgent || "unknown",
        分析日時: competitors.createdAt || "unknown",
        構造化データ: competitors.consensusJSON || null,
        レポート: competitors.reportMarkdown ? "あり" : "なし",
        競合クリニック一覧: competitors.competitors || null,
        エリアサマリー: competitors.areaSummary || null,
        情報源: competitors.sources || null,
        生データ: competitors.rawText ? "あり（構造化データを優先）" : "なし",
      };
    }
    
    // SNSデータを詳細に構造化（CONSENSUS_JSONを優先的に使用）
    const snsDataFormatted = snsData.map(s => {
      const data = s as Record<string, unknown>;
      return {
        プラットフォーム: data.platform || "unknown",
        AI分析エージェント: data.aiAgent || "unknown",
        分析日時: data.createdAt || "unknown",
        構造化データ: data.consensusJSON || null,
        レポート: data.reportMarkdown ? "あり" : "なし",
        ハッシュタグ: data.hashtags || [],
        インフルエンサー: data.influencers || [],
        人気投稿: data.topPosts || [],
        エンゲージメント傾向: data.engagementTrends || null,
        ユーザー動向: data.audienceSignals || null,
        情報源: data.sources || null,
        生データ: data.rawText ? "あり（構造化データを優先）" : "なし",
      };
    });

    const prompt = replacePlaceholders(template, {
      clinicProducts: JSON.stringify(clinicProductsFormatted, null, 2),
      marketData: JSON.stringify(marketDataFormatted, null, 2),
      snsData: JSON.stringify(snsDataFormatted, null, 2),
      location,
    });

    console.log(`[ChatGPT analyzeMarketPosition] Template length: ${template.length}, Prompt length: ${prompt.length} characters`);
    console.log(`[ChatGPT analyzeMarketPosition] 商品数: ${clinicProducts.length}, 市場データ: ${JSON.stringify(marketDataFormatted).length}文字, SNSデータ: ${snsData.length}件`);

    // Claude用プロンプト（タグ付き）をChatGPT用に変換
    const { systemPrompt, userPrompt } = convertClaudePromptToChatGPT(prompt);
    
    // Web検索結果をuserPromptに追加
    const userPromptWithWebSearch = `${userPrompt}\n\n${webSearchResults}`;
    
    console.log(`[ChatGPT analyzeMarketPosition] Using Claude prompt format (converted), systemPrompt length: ${systemPrompt.length}, userPrompt length: ${userPromptWithWebSearch.length}`);
    
    const result = await callChatGPT(userPromptWithWebSearch, systemPrompt, 4096);
    console.log(`[ChatGPT analyzeMarketPosition] Result length: ${result.length} characters`);
    return result;
  } catch (error) {
    console.error("[ChatGPT analyzeMarketPosition] Error:", error);
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
    const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
    const { performWebSearch, formatSearchResults, generatePriceSearchQuery } = await import("./web-search");
    
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
    
    // Web検索を実行して最新の価格情報を取得
    let webSearchResults = "";
    try {
      const searchQuery = generatePriceSearchQuery(productNames, cities, currentYear, currentMonth);
      console.log(`[ChatGPT generatePriceRecommendations] Web検索実行: ${searchQuery}`);
      const searchResults = await performWebSearch(searchQuery, 10);
      webSearchResults = formatSearchResults(searchResults);
      console.log(`[ChatGPT generatePriceRecommendations] Web検索結果: ${searchResults.length}件取得`);
    } catch (error) {
      console.warn("[ChatGPT generatePriceRecommendations] Web検索に失敗しましたが、続行します:", error);
      webSearchResults = `【注意】Web検索APIが設定されていないため、最新情報の取得に制限があります。\n${error instanceof Error ? error.message : "Unknown error"}\n`;
    }
    
    // Claude用プロンプト（正式版）を取得
    const template = await getPrompt("claude_generate_price_recommendations", "");
    
    if (!template || template.trim().length === 0) {
      throw new Error("Failed to get prompt template for claude_generate_price_recommendations");
    }

    // データを構造化してフォーマット
    const productsFormatted = products.map(p => ({
      商品名: p.name,
      現在価格: p.sellingPrice,
      原価: p.costPrice,
      カテゴリ: p.category || "未分類",
    }));

    // 市場価格データを詳細に構造化（CONSENSUS_JSONを優先的に使用）
    const marketPricingFormatted: Record<string, unknown> = {};
    
    if (marketPricing && typeof marketPricing === "object") {
      const pricing = marketPricing as Record<string, unknown>;
      marketPricingFormatted.AI分析エージェント = pricing.aiAgent || "unknown";
      marketPricingFormatted.分析日時 = pricing.createdAt || "unknown";
      marketPricingFormatted.構造化データ = pricing.consensusJSON || null;
      marketPricingFormatted.レポート = pricing.reportMarkdown ? "あり" : "なし";
      marketPricingFormatted.価格テーブル = pricing.priceTable || null;
      marketPricingFormatted.エリアサマリー = pricing.areaSummary || null;
      marketPricingFormatted.情報源 = pricing.sources || null;
      marketPricingFormatted.生データ = pricing.rawText ? "あり（構造化データを優先）" : "なし";
    }

    const prompt = replacePlaceholders(template, {
      products: JSON.stringify(productsFormatted, null, 2),
      marketPricing: JSON.stringify(marketPricingFormatted, null, 2),
    });

    console.log(`[ChatGPT generatePriceRecommendations] Template length: ${template.length}, Prompt length: ${prompt.length} characters`);
    console.log(`[ChatGPT generatePriceRecommendations] 商品数: ${products.length}, 市場価格データ: ${JSON.stringify(marketPricing).length}文字`);

    // Claude用プロンプト（タグ付き）をChatGPT用に変換
    const { systemPrompt, userPrompt } = convertClaudePromptToChatGPT(prompt);
    
    // Web検索結果をuserPromptに追加
    const userPromptWithWebSearch = `${userPrompt}\n\n${webSearchResults}`;
    
    console.log(`[ChatGPT generatePriceRecommendations] Using Claude prompt format (converted), systemPrompt length: ${systemPrompt.length}, userPrompt length: ${userPromptWithWebSearch.length}`);
    
    const result = await callChatGPT(userPromptWithWebSearch, systemPrompt, 4096);
    console.log(`[ChatGPT generatePriceRecommendations] Result length: ${result.length} characters`);
    return result;
  } catch (error) {
    console.error("[ChatGPT generatePriceRecommendations] Error:", error);
    throw error;
  }
}

export async function generateCampaignProposals(
  trends: Array<Record<string, unknown>>,
  snsData: Array<Record<string, unknown>>,
): Promise<string> {
  try {
    const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
    const { performWebSearch, formatSearchResults } = await import("./web-search");
    
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
    
    // Web検索を実行して最新のキャンペーントレンドを取得
    let webSearchResults = "";
    try {
      const searchQuery = `美容クリニック キャンペーン ${keywords.slice(0, 3).join(" ")} ${currentYear}年${currentMonth}月 トレンド`;
      console.log(`[ChatGPT generateCampaignProposals] Web検索実行: ${searchQuery}`);
      const searchResults = await performWebSearch(searchQuery, 10);
      webSearchResults = formatSearchResults(searchResults);
      console.log(`[ChatGPT generateCampaignProposals] Web検索結果: ${searchResults.length}件取得`);
    } catch (error) {
      console.warn("[ChatGPT generateCampaignProposals] Web検索に失敗しましたが、続行します:", error);
      webSearchResults = `【注意】Web検索APIが設定されていないため、最新情報の取得に制限があります。\n${error instanceof Error ? error.message : "Unknown error"}\n`;
    }
    
    // Claude用プロンプト（正式版）を取得
    const template = await getPrompt("claude_generate_campaign_proposals", "");
    
    if (!template || template.trim().length === 0) {
      throw new Error("Failed to get prompt template for claude_generate_campaign_proposals");
    }

    // データを構造化してフォーマット（CONSENSUS_JSONを優先的に使用）
    const trendsFormatted = trends.map(t => {
      const trendData = t as Record<string, unknown>;
      return {
        トレンド名: trendData.name || "不明",
        AI分析エージェント: trendData.aiAgent || "unknown",
        分析日時: trendData.createdAt || "unknown",
        構造化データ: trendData.consensusJSON || null,
        レポート: trendData.reportMarkdown ? "あり" : "なし",
        主要施術: trendData.treatments || null,
        顧客ニーズ: trendData.customerNeeds || null,
        情報源: trendData.sources || null,
        生データ: trendData.rawText ? "あり（構造化データを優先）" : "なし",
      };
    });
    
    const snsDataFormatted = snsData.map(s => {
      const snsDataItem = s as Record<string, unknown>;
      return {
        プラットフォーム: snsDataItem.platform || "不明",
        AI分析エージェント: snsDataItem.aiAgent || "unknown",
        分析日時: snsDataItem.createdAt || "unknown",
        構造化データ: snsDataItem.consensusJSON || null,
        レポート: snsDataItem.reportMarkdown ? "あり" : "なし",
        ハッシュタグ: snsDataItem.hashtags || [],
        インフルエンサー: snsDataItem.influencers || [],
        人気投稿: snsDataItem.topPosts || [],
        エンゲージメント傾向: snsDataItem.engagementTrends || null,
        ユーザー動向: snsDataItem.audienceSignals || null,
        情報源: snsDataItem.sources || null,
        生データ: snsDataItem.rawText ? "あり（構造化データを優先）" : "なし",
      };
    });

    const prompt = replacePlaceholders(template, {
      trends: JSON.stringify(trendsFormatted, null, 2),
      snsData: JSON.stringify(snsDataFormatted, null, 2),
    });

    console.log(`[ChatGPT generateCampaignProposals] trends: ${trends.length}件, snsData: ${snsData.length}件`);
    console.log(`[ChatGPT generateCampaignProposals] Template length: ${template.length}, Prompt length: ${prompt.length} characters`);

    // Claude用プロンプト（タグ付き）をChatGPT用に変換
    const { systemPrompt, userPrompt } = convertClaudePromptToChatGPT(prompt);
    
    // Web検索結果をuserPromptに追加
    const userPromptWithWebSearch = `${userPrompt}\n\n${webSearchResults}`;
    
    console.log(`[ChatGPT generateCampaignProposals] Using Claude prompt format (converted), systemPrompt length: ${systemPrompt.length}, userPrompt length: ${userPromptWithWebSearch.length}`);
    
    const result = await callChatGPT(userPromptWithWebSearch, systemPrompt, 4096);
    console.log(`[ChatGPT generateCampaignProposals] Result length: ${result.length} characters`);
    return result;
  } catch (error) {
    console.error("[ChatGPT generateCampaignProposals] Error:", error);
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
    const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
    const { performWebSearch, formatSearchResults } = await import("./web-search");
    
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
    
    // Web検索を実行して最新の施術トレンドを取得
    let webSearchResults = "";
    try {
      const searchQuery = `美容クリニック 新施術 ${keywords.slice(0, 3).join(" ")} ${currentYear}年${currentMonth}月 トレンド`;
      console.log(`[ChatGPT suggestNewTreatments] Web検索実行: ${searchQuery}`);
      const searchResults = await performWebSearch(searchQuery, 10);
      webSearchResults = formatSearchResults(searchResults);
      console.log(`[ChatGPT suggestNewTreatments] Web検索結果: ${searchResults.length}件取得`);
    } catch (error) {
      console.warn("[ChatGPT suggestNewTreatments] Web検索に失敗しましたが、続行します:", error);
      webSearchResults = `【注意】Web検索APIが設定されていないため、最新情報の取得に制限があります。\n${error instanceof Error ? error.message : "Unknown error"}\n`;
    }
    
    // Claude用プロンプト（正式版）を取得
    const template = await getPrompt("claude_suggest_new_treatments", "");
    
    if (!template || template.trim().length === 0) {
      throw new Error("Failed to get prompt template for claude_suggest_new_treatments");
    }

    // データを構造化してフォーマット（CONSENSUS_JSONを優先的に使用）
    const currentTreatmentsFormatted = currentTreatments.map(t => ({
      施術名: t.name,
      カテゴリ: t.category || "未分類",
    }));
    
    const marketTrendsFormatted = marketTrends.map(t => {
      const trendData = t as Record<string, unknown>;
      return {
        トレンド名: trendData.name || "不明",
        AI分析エージェント: trendData.aiAgent || "unknown",
        分析日時: trendData.createdAt || "unknown",
        構造化データ: trendData.consensusJSON || null,
        レポート: trendData.reportMarkdown ? "あり" : "なし",
        主要施術: trendData.treatments || null,
        顧客ニーズ: trendData.customerNeeds || null,
        情報源: trendData.sources || null,
        生データ: trendData.rawText ? "あり（構造化データを優先）" : "なし",
      };
    });
    
    const snsTrendsFormatted = snsTrends.map(s => {
      const snsDataItem = s as Record<string, unknown>;
      return {
        プラットフォーム: snsDataItem.platform || "不明",
        AI分析エージェント: snsDataItem.aiAgent || "unknown",
        分析日時: snsDataItem.createdAt || "unknown",
        構造化データ: snsDataItem.consensusJSON || null,
        レポート: snsDataItem.reportMarkdown ? "あり" : "なし",
        ハッシュタグ: snsDataItem.hashtags || [],
        インフルエンサー: snsDataItem.influencers || [],
        人気投稿: snsDataItem.topPosts || [],
        エンゲージメント傾向: snsDataItem.engagementTrends || null,
        ユーザー動向: snsDataItem.audienceSignals || null,
        情報源: snsDataItem.sources || null,
        生データ: snsDataItem.rawText ? "あり（構造化データを優先）" : "なし",
      };
    });

    const prompt = replacePlaceholders(template, {
      currentTreatments: JSON.stringify(currentTreatmentsFormatted, null, 2),
      marketTrends: JSON.stringify(marketTrendsFormatted, null, 2),
      snsTrends: JSON.stringify(snsTrendsFormatted, null, 2),
    });

    console.log(`[ChatGPT suggestNewTreatments] currentTreatments: ${currentTreatments.length}件, marketTrends: ${marketTrends.length}件, snsTrends: ${snsTrends.length}件`);
    console.log(`[ChatGPT suggestNewTreatments] Template length: ${template.length}, Prompt length: ${prompt.length} characters`);

    // Claude用プロンプト（タグ付き）をChatGPT用に変換
    const { systemPrompt, userPrompt } = convertClaudePromptToChatGPT(prompt);
    
    // Web検索結果をuserPromptに追加
    const userPromptWithWebSearch = `${userPrompt}\n\n${webSearchResults}`;
    
    console.log(`[ChatGPT suggestNewTreatments] Using Claude prompt format (converted), systemPrompt length: ${systemPrompt.length}, userPrompt length: ${userPromptWithWebSearch.length}`);
    
    const result = await callChatGPT(userPromptWithWebSearch, systemPrompt, 4096);
    console.log(`[ChatGPT suggestNewTreatments] Result length: ${result.length} characters`);
    return result;
  } catch (error) {
    console.error("[ChatGPT suggestNewTreatments] Error:", error);
    throw error;
  }
}

