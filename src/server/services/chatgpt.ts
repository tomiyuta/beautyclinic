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
            "あなたは美容クリニックのマーケティングコンテンツ作成の専門家です。魅力的で効果的なマーケティング素材を作成してください。",
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
  const approachText = {
    minimal: "シンプルでミニマルなデザイン",
    bold: "大胆で目を引くデザイン",
    elegant: "エレガントで洗練されたデザイン",
    trendy: "トレンディで現代的なデザイン",
  }[designApproach];

  const prompt = `以下のキャンペーン情報を基に、${approachText}のInstagram用LP案を作成してください。

【キャンペーン情報】
タイトル: ${campaign.title}
説明: ${campaign.description}
ターゲット層: ${campaign.targetAudience || "美容に興味のある20-50代の女性"}
プロモーション内容: ${campaign.promotion || "特典あり"}

以下のJSON形式で返してください：
{
  "title": "LPのタイトル",
  "headline": "メインヘッドライン",
  "description": "説明文（3-4文程度）",
  "keyPoints": ["ポイント1", "ポイント2", "ポイント3"],
  "benefits": ["メリット1", "メリット2"],
  "callToAction": "行動喚起文（例：「今すぐ予約する」）",
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2", "ハッシュタグ3"],
  "designNotes": "${approachText}のデザイン要素を含む詳細なデザイン指示",
  "colorScheme": "推奨カラースキーム",
  "tone": "トーン（例：親しみやすい、高級感のある）"
}`;

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
  const keywords = seoKeywords.length > 0 ? seoKeywords.join(", ") : "美容, 美容皮膚科, 施術";

  const prompt = `以下のキャンペーン情報を基に、SEO最適化されたHP記事を作成してください。

【キャンペーン情報】
タイトル: ${campaign.title}
説明: ${campaign.description}
ターゲット層: ${campaign.targetAudience || "美容に興味のある20-50代の女性"}

【SEOキーワード】
${keywords}

以下の要件を満たしてください：
- 見出しタグ（h1, h2, h3）を適切に使用
- SEOキーワードを自然に含める
- 読みやすく、情報価値の高い内容
- 800-1200文字程度
- 構造化されたHTML形式

以下のJSON形式で返してください：
{
  "title": "記事タイトル（SEO最適化済み）",
  "metaDescription": "メタディスクリプション（150文字以内）",
  "keywords": ["キーワード1", "キーワード2", "キーワード3"],
  "content": "HTML形式の記事本文",
  "summary": "記事の要約（2-3文）"
}`;

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
  const toneText = {
    professional: "プロフェッショナルで信頼感のある",
    friendly: "親しみやすく親近感のある",
    trendy: "トレンディで現代的な",
  }[tone];

  const prompt = `以下のキャンペーン情報を基に、${toneText}トーンのキャンペーンコピーを作成してください。

【キャンペーン情報】
タイトル: ${campaign.title}
説明: ${campaign.description}
ターゲット層: ${campaign.targetAudience || "美容に興味のある20-50代の女性"}
プロモーション内容: ${campaign.promotion || "特典あり"}

以下のJSON形式で返してください：
{
  "headline": "メインキャッチコピー",
  "subheadline": "サブキャッチコピー",
  "bodyCopy": "本文（3-4段落）",
  "callToAction": "行動喚起文",
  "slogan": "キャッチフレーズ",
  "tone": "${toneText}",
  "keyMessages": ["メッセージ1", "メッセージ2", "メッセージ3"]
}`;

  return callChatGPT(prompt);
}

