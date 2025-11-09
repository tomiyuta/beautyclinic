import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn("OPENAI_API_KEY is not set. ChatGPT features will be disabled.");
}

const openai = apiKey ? new OpenAI({ apiKey }) : null;

export async function callChatGPT(prompt: string): Promise<string> {
  if (!openai) {
    throw new Error(
      "OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.",
    );
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "あなたは美容クリニックのマーケティングコンテンツ作成の専門家です。魅力的で効果的なマーケティング素材を作成してください。プロンプトに含まれるWeb検索結果を基に、最新の情報を活用してコンテンツを作成してください。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("ChatGPT API error:", error);
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

