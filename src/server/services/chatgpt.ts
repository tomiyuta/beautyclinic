import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn("OPENAI_API_KEY is not set. ChatGPT features will be disabled.");
}

const openai = apiKey ? new OpenAI({ apiKey }) : null;

// 成功したモデル名をキャッシュ（サーバー起動中は保持）
let cachedModelName: string | null = null;

/**
 * Claude形式のプロンプトをChatGPT形式に変換
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
  maxTokens: number = 2000,
): Promise<string> {
  if (!openai) {
    throw new Error(
      "OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.",
    );
  }

  try {
    // 最新モデルを優先的に使用（2025年11月時点）
    // 環境変数でモデルが指定されている場合はそれを使用
    // 指定がない場合は、最新モデルから順に試行
    const envModel = process.env.OPENAI_MODEL;
    
    // 利用可能なモデル候補（優先順位順 - 最新版を最優先）
    const MODEL_CANDIDATES = [
      "gpt-5.1",                    // GPT-5.1（最新・2025年11月リリース・API経由で利用可能・確認済み）
      "gpt-5",                       // GPT-5（最新・API経由で利用可能・確認済み）
      "gpt-4o",                      // GPT-4o（2024年5月リリース・安定版）
      "gpt-4o-mini",                 // GPT-4o-mini（軽量版）
      "gpt-4-turbo",                 // GPT-4 Turbo（旧版）
    ];
    
    let lastError: Error | null = null;
    let triedModels: string[] = [];
    
    // 環境変数で指定されている場合はそのモデルのみを試行
    // 指定がない場合は候補リストから順に試行
    const modelsToTry = envModel ? [envModel] : MODEL_CANDIDATES;
    
    for (const model of modelsToTry) {
      triedModels.push(model);
      try {
        console.log(`[ChatGPT] Trying model: ${model}`);
        
        // GPT-5.1/5.0ではmax_completion_tokensを使用、それ以外はmax_tokensを使用
        const isGPT5 = model.startsWith("gpt-5");
        const requestParams: any = {
          model: model,
          messages: [
            {
              role: "system",
              content: systemPrompt || "あなたは美容クリニックのマーケティングコンテンツ作成の専門家です。魅力的で効果的なマーケティング素材を作成してください。プロンプトに含まれるWeb検索結果を基に、最新の情報を活用してコンテンツを作成してください。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.8,
        };
        
        // GPT-5.1/5.0ではmax_completion_tokens、それ以外はmax_tokensを使用
        if (isGPT5) {
          requestParams.max_completion_tokens = maxTokens;
        } else {
          requestParams.max_tokens = maxTokens;
        }
        
        const completion = await openai.chat.completions.create(requestParams);

        console.log(`✓ ChatGPT model selected: ${model}`);
        // 成功したモデルをキャッシュ
        if (!cachedModelName) {
          cachedModelName = model;
        }
        const content = completion.choices[0]?.message?.content || "";
        
        // 空のレスポンスの場合は警告をログに記録し、次のモデルを試行
        if (!content || content.trim().length === 0) {
          console.warn(`[ChatGPT] Empty response from model ${model}. Completion object:`, {
            choices: completion.choices,
            usage: completion.usage,
            finishReason: completion.choices[0]?.finish_reason,
          });
          
          // 空のレスポンスの場合は次のモデルを試行（最後のモデルでない場合）
          if (model !== modelsToTry[modelsToTry.length - 1]) {
            console.warn(`  ✗ Model ${model} returned empty response, trying next...`);
            continue;
          }
          
          // 最後のモデルでも空のレスポンスの場合はエラー
          throw new Error(`ChatGPT APIから空のレスポンスが返されました。モデル: ${model}`);
        }
        
        // 出力の冒頭に使用モデル情報を追加
        const modelInfo = `【使用AIモデル: ChatGPT ${model}】\n\n`;
        return modelInfo + content;
      } catch (modelError) {
        const error = modelError instanceof Error ? modelError : new Error(String(modelError));
        lastError = error;
        
        // エラーの詳細をログに記録
        console.error(`ChatGPT API error for model ${model}:`, {
          message: error.message,
          name: error.name,
        });
        
        // 404エラー（モデルが見つからない）の場合は次のモデルを試行
        const errorMsg = error.message.toLowerCase();
        const is404 = errorMsg.includes("404") || 
                     errorMsg.includes("not found") || 
                     errorMsg.includes("not_found") ||
                     errorMsg.includes("model_not_found");
        
        if (is404 && modelsToTry.length > 1 && model !== modelsToTry[modelsToTry.length - 1]) {
          console.warn(`  ✗ Model ${model} not found (404), trying next...`);
          continue;
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
          `OpenAI API モデルが見つかりません (404)。試行したモデル: ${triedModels.join(", ")}。OPENAI_MODEL環境変数で利用可能なモデル名を指定してください。`,
        );
      }
      throw new Error(
        `Failed to call ChatGPT API: ${lastError.message}`,
      );
    }
    
    throw new Error("ChatGPT API: 利用可能なモデルが見つかりませんでした");
  } catch (error) {
    // 既に形式化されたエラーはそのまま投げる
    if (error instanceof Error && error.message.includes("OpenAI API")) {
      throw error;
    }
    
    console.error("ChatGPT API error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    throw new Error(
      `ChatGPT APIエラー: ${errorMessage}`,
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

// 拡張されたテキスト生成オプション（要件定義書に基づく）
export interface TextGenerationOptions {
  campaignInfo: {
    title: string;
    description: string;
    targetAudience?: string;
    promotion?: string;
  };
  tone?: "formal" | "casual" | "friendly" | "professional";
  maxLength?: number;
  includeKeywords?: string[];
  ctaType?: "reserve" | "details" | "inquiry" | "check_now";
  seoKeywords?: string[];
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

/**
 * 戦略分析: 市場ポジション分析
 */
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
        // platformプロパティがある場合は、データをそのまま返す
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

/**
 * 戦略分析: 価格設定提案
 */
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

/**
 * 戦略分析: キャンペーン案生成
 */
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
      }
      return s;
    });

    // JSON.stringifyのインデントを削除してトークン量を削減
    const prompt = replacePlaceholders(template, {
      trends: JSON.stringify(trendsFormatted),
      snsData: JSON.stringify(snsDataFormatted),
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

/**
 * 戦略分析: 新施術提案
 */
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
      }
      return s;
    });

    // JSON.stringifyのインデントを削除してトークン量を削減
    const prompt = replacePlaceholders(template, {
      currentTreatments: JSON.stringify(currentTreatmentsFormatted),
      marketTrends: JSON.stringify(marketTrendsFormatted),
      snsTrends: JSON.stringify(snsTrendsFormatted),
    });

    console.log(`[ChatGPT suggestNewTreatments] currentTreatments: ${currentTreatments.length}件, marketTrends: ${marketTrends.length}件, snsTrends: ${snsTrends.length}件`);
    console.log(`[ChatGPT suggestNewTreatments] Template length: ${template.length}, Prompt length: ${prompt.length} characters`);

    // Claude用プロンプト（タグ付き）をChatGPT用に変換
    let systemPrompt: string;
    let userPrompt: string;
    try {
      const converted = convertClaudePromptToChatGPT(prompt);
      systemPrompt = converted.systemPrompt;
      userPrompt = converted.userPrompt;
      
      // userPromptが空の場合はエラー
      if (!userPrompt || userPrompt.trim().length === 0) {
        console.error("[ChatGPT suggestNewTreatments] userPrompt is empty after conversion");
        console.error("[ChatGPT suggestNewTreatments] Original prompt length:", prompt.length);
        throw new Error("プロンプトの変換に失敗しました。userPromptが空です。");
      }
    } catch (conversionError) {
      console.error("[ChatGPT suggestNewTreatments] Prompt conversion error:", conversionError);
      throw new Error(`プロンプトの変換に失敗しました: ${conversionError instanceof Error ? conversionError.message : String(conversionError)}`);
    }
    
    // Web検索結果をuserPromptに追加
    const userPromptWithWebSearch = `${userPrompt}\n\n${webSearchResults}`;
    
    console.log(`[ChatGPT suggestNewTreatments] Using Claude prompt format (converted), systemPrompt length: ${systemPrompt.length}, userPrompt length: ${userPromptWithWebSearch.length}`);
    console.log(`[ChatGPT suggestNewTreatments] userPrompt preview (first 200 chars): ${userPrompt.substring(0, 200)}`);
    
    let result: string;
    try {
      result = await callChatGPT(userPromptWithWebSearch, systemPrompt, 4096);
      console.log(`[ChatGPT suggestNewTreatments] Result length: ${result.length} characters`);
      console.log(`[ChatGPT suggestNewTreatments] Result preview (first 200 chars): ${result.substring(0, 200)}`);
    } catch (apiError) {
      console.error("[ChatGPT suggestNewTreatments] ChatGPT API call error:", apiError);
      const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
      throw new Error(`ChatGPT API呼び出しに失敗しました: ${errorMessage}`);
    }
    
    // 結果が空またはモデル情報のみの場合は警告
    const resultWithoutModelInfo = result.replace(/【使用AIモデル: ChatGPT .+?】\n\n/, "").trim();
    if (!result || result.trim().length === 0 || resultWithoutModelInfo.length === 0) {
      console.warn("[ChatGPT suggestNewTreatments] Result is empty or contains only model info");
      console.warn("[ChatGPT suggestNewTreatments] Full result:", result);
      throw new Error("ChatGPT APIから空のレスポンスが返されました。APIキーとモデルの設定を確認してください。");
    }
    
    return result;
  } catch (error) {
    console.error("[ChatGPT suggestNewTreatments] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[ChatGPT suggestNewTreatments] Error details:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      currentTreatmentsCount: currentTreatments.length,
      marketTrendsCount: marketTrends.length,
      snsTrendsCount: snsTrends.length,
    });
    throw error;
  }
}

/**
 * 現在使用中のChatGPTモデル名を取得（デバッグ用）
 */
export function getCurrentChatGPTModel(): string | null {
  return cachedModelName || process.env.OPENAI_MODEL || "gpt-5.1" || null;
}

/**
 * Instagram投稿文を生成（要件定義書3.1に基づく拡張版）
 */
export async function generateInstagramPostText(
  options: TextGenerationOptions,
): Promise<string> {
  const { campaignInfo, tone = "friendly", maxLength = 2200, includeKeywords = [], ctaType = "reserve" } = options;
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDateStr = `${currentYear}年${currentMonth}月`;

  const toneText = {
    formal: "フォーマルで丁寧な",
    casual: "カジュアルで親しみやすい",
    friendly: "親しみやすく親近感のある",
    professional: "プロフェッショナルで信頼感のある",
  }[tone];

  const ctaText = {
    reserve: "予約する",
    details: "詳細を見る",
    inquiry: "問い合わせる",
    check_now: "今すぐチェック",
  }[ctaType];

  // Web検索を実行
  let webSearchResults = "";
  try {
    const { performWebSearch, formatSearchResults, generateInstagramLPSearchQuery } = await import("./web-search");
    const searchQuery = generateInstagramLPSearchQuery(campaignInfo.title, currentYear, currentMonth);
    const searchResults = await performWebSearch(searchQuery, 10);
    webSearchResults = formatSearchResults(searchResults);
  } catch (error) {
    console.warn("[Instagram Post] Web検索に失敗しましたが、続行します:", error);
  }

  const keywordsText = includeKeywords.length > 0 ? `\n含めるキーワード: ${includeKeywords.join(", ")}` : "";
  const lengthNote = maxLength ? `\n文字数制限: ${maxLength}文字以内` : "";

  const prompt = `以下のキャンペーン情報を基に、${toneText}トーンのInstagram投稿文を作成してください。

【キャンペーン情報】
タイトル: ${campaignInfo.title}
説明: ${campaignInfo.description}
ターゲット層: ${campaignInfo.targetAudience || "美容に興味のある20-50代の女性"}
プロモーション内容: ${campaignInfo.promotion || "特典あり"}${keywordsText}${lengthNote}

${webSearchResults ? `【最新トレンド情報】\n${webSearchResults}\n` : ""}

【作成指示】
- 最大${maxLength}文字以内で作成してください
- ${toneText}トーンで、読みやすく魅力的な投稿文にしてください
- ハッシュタグを3-5個含めてください
- 行動喚起として「${ctaText}」を含めてください
${includeKeywords.length > 0 ? `- 以下のキーワードを自然に含めてください: ${includeKeywords.join(", ")}` : ""}
- 医療広告ガイドラインに準拠し、誇大表現を避けてください
- 現在の日付は${currentDateStr}です

【出力形式】
投稿文をそのまま出力してください（タイトルや説明は不要）。`;

  const result = await callChatGPT(prompt);
  
  // コンプライアンスチェック
  const { cleanTextForAdvertising } = await import("@/server/utils/advertising-guidelines");
  const { cleanedText, warnings } = cleanTextForAdvertising(result);
  
  if (warnings.length > 0) {
    console.warn("[Instagram Post] Compliance warnings:", warnings);
  }
  
  return cleanedText;
}

/**
 * 広告文（リスティング）を生成（要件定義書3.1に基づく）
 */
export async function generateAdCopy(
  options: TextGenerationOptions,
): Promise<string> {
  const { campaignInfo, tone = "professional", maxLength = 100, includeKeywords = [], ctaType = "details" } = options;
  
  const toneText = {
    formal: "フォーマルで丁寧な",
    casual: "カジュアルで親しみやすい",
    friendly: "親しみやすく親近感のある",
    professional: "プロフェッショナルで信頼感のある",
  }[tone];

  const ctaText = {
    reserve: "予約する",
    details: "詳細を見る",
    inquiry: "問い合わせる",
    check_now: "今すぐチェック",
  }[ctaType];

  const keywordsText = includeKeywords.length > 0 ? `\n含めるキーワード: ${includeKeywords.join(", ")}` : "";

  const prompt = `以下のキャンペーン情報を基に、${toneText}トーンの検索広告用の広告文を作成してください。

【キャンペーン情報】
タイトル: ${campaignInfo.title}
説明: ${campaignInfo.description}
ターゲット層: ${campaignInfo.targetAudience || "美容に興味のある20-50代の女性"}${keywordsText}

【作成指示】
- 最大${maxLength}文字以内で作成してください（20-100文字推奨）
- ${toneText}トーンで、簡潔で魅力的な広告文にしてください
- 行動喚起として「${ctaText}」を含めてください
${includeKeywords.length > 0 ? `- 以下のキーワードを自然に含めてください: ${includeKeywords.join(", ")}` : ""}
- 医療広告ガイドラインに準拠し、誇大表現を避けてください
- 検索広告向けに、クリックを促す内容にしてください

【出力形式】
広告文をそのまま出力してください。`;

  const result = await callChatGPT(prompt);
  
  // コンプライアンスチェック
  const { cleanTextForAdvertising } = await import("@/server/utils/advertising-guidelines");
  const { cleanedText, warnings } = cleanTextForAdvertising(result);
  
  if (warnings.length > 0) {
    console.warn("[Ad Copy] Compliance warnings:", warnings);
  }
  
  return cleanedText;
}

/**
 * ブログ記事を生成（要件定義書3.1に基づく）
 */
export async function generateBlogArticle(
  options: TextGenerationOptions,
): Promise<string> {
  const { campaignInfo, tone = "friendly", maxLength = 5000, includeKeywords = [], seoKeywords = [], ctaType = "details" } = options;
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDateStr = `${currentYear}年${currentMonth}月`;

  const toneText = {
    formal: "フォーマルで丁寧な",
    casual: "カジュアルで親しみやすい",
    friendly: "親しみやすく親近感のある",
    professional: "プロフェッショナルで信頼感のある",
  }[tone];

  const ctaText = {
    reserve: "予約する",
    details: "詳細を見る",
    inquiry: "問い合わせる",
    check_now: "今すぐチェック",
  }[ctaType];

  // Web検索を実行
  let webSearchResults = "";
  try {
    const { performWebSearch, formatSearchResults, generateWebsiteArticleSearchQuery } = await import("./web-search");
    const searchQuery = generateWebsiteArticleSearchQuery(
      campaignInfo.title, 
      seoKeywords.length > 0 ? seoKeywords : ["美容", "美容皮膚科"], 
      currentYear, 
      currentMonth
    );
    const searchResults = await performWebSearch(searchQuery, 10);
    webSearchResults = formatSearchResults(searchResults);
  } catch (error) {
    console.warn("[Blog Article] Web検索に失敗しましたが、続行します:", error);
  }

  const keywordsText = includeKeywords.length > 0 ? `\n含めるキーワード: ${includeKeywords.join(", ")}` : "";
  const seoKeywordsText = seoKeywords.length > 0 ? `\nSEOキーワード: ${seoKeywords.join(", ")}` : "";

  const prompt = `以下のキャンペーン情報を基に、${toneText}トーンのブログ記事を作成してください。

【キャンペーン情報】
タイトル: ${campaignInfo.title}
説明: ${campaignInfo.description}
ターゲット層: ${campaignInfo.targetAudience || "美容に興味のある20-50代の女性"}${keywordsText}${seoKeywordsText}

${webSearchResults ? `【最新トレンド情報】\n${webSearchResults}\n` : ""}

【作成指示】
- ${maxLength}文字程度で、読みやすいブログ記事を作成してください
- ${toneText}トーンで、専門的でありながら親しみやすい内容にしてください
- 見出し（H2, H3）を適切に使用し、構造化された記事にしてください
- SEOを意識し、${seoKeywords.length > 0 ? seoKeywords.join(", ") : "関連キーワード"}を自然に含めてください
${includeKeywords.length > 0 ? `- 以下のキーワードを自然に含めてください: ${includeKeywords.join(", ")}` : ""}
- 最後に行動喚起として「${ctaText}」を含めてください
- 医療広告ガイドラインに準拠し、誇大表現を避けてください
- 現在の日付は${currentDateStr}です

【出力形式】
タイトル、メタディスクリプション、見出し構造を含むブログ記事をMarkdown形式で出力してください。`;

  const result = await callChatGPT(prompt);
  
  // コンプライアンスチェック
  const { cleanTextForAdvertising } = await import("@/server/utils/advertising-guidelines");
  const { cleanedText, warnings } = cleanTextForAdvertising(result);
  
  if (warnings.length > 0) {
    console.warn("[Blog Article] Compliance warnings:", warnings);
  }
  
  return cleanedText;
}

