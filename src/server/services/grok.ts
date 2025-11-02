import axios from "axios";

const apiKey = process.env.GROK_API_KEY;
// Grok APIのエンドポイントとモデル名を確認して修正
// grok-betaは2025-09-15に廃止されたため、grok-3を使用
const apiUrl = process.env.GROK_API_URL || "https://api.x.ai/v1/chat/completions";
const grokModel = process.env.GROK_MODEL || "grok-3";

if (!apiKey) {
  console.warn("GROK_API_KEY is not set. Grok features will be disabled.");
}

export async function callGrok(prompt: string): Promise<string> {
  if (!apiKey) {
    throw new Error(
      "Grok API key is not configured. Please set GROK_API_KEY environment variable.",
    );
  }

  try {
    const response = await axios.post(
      apiUrl,
      {
        model: grokModel,
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

    return response.data.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Grok API error:", error);
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      const statusText = error.response?.statusText;
      const errorData = error.response?.data;
      
      console.error("Grok API error details:", {
        statusCode,
        statusText,
        url: apiUrl,
        model: grokModel,
        errorData,
      });
      
      if (statusCode === 404) {
        throw new Error(
          `Grok API エンドポイントが見つかりません (404)。エンドポイント: ${apiUrl}, モデル: ${grokModel}。APIキーが有効か、正しいエンドポイント/モデル名を使用しているか確認してください。詳細はサーバーログを確認してください。`,
        );
      }
      
      throw new Error(
        `Failed to call Grok API: ${errorData?.error?.message || error.message || `Status ${statusCode}: ${statusText}`}`,
      );
    }
    throw new Error(
      `Failed to call Grok API: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
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

  const prompt = `あなたはSNSマーケティングの専門家です。
Twitter/Xで以下のキーワードに関連する最新のトレンドを調査してください：

キーワード: ${keywords.join(", ")}
期間: ${timeRangeText}

以下の観点から分析してください：
1. 人気のハッシュタグ
2. 影響力のあるアカウントやインフルエンサー
3. 人気の投稿やコンテンツの特徴
4. エンゲージメント（いいね、リツイート、コメント）の傾向
5. 話題になっている美容施術や治療

**重要**: 回答は必ずJSON形式のみで返してください。Markdownの見出しや説明文は不要です。以下の形式のJSONのみを返してください：

{
  "platform": "twitter",
  "hashtags": [
    {
      "name": "ハッシュタグ名",
      "count": "使用回数（推定）",
      "trend": "up" | "stable" | "down"
    }
  ],
  "influencers": [
    {
      "name": "アカウント名",
      "followers": "フォロワー数（推定）",
      "topics": ["関連トピック"]
    }
  ],
  "popularContent": [
    {
      "type": "text" | "image" | "video",
      "theme": "コンテンツのテーマ",
      "engagement": "エンゲージメント説明"
    }
  ],
  "engagement": {
    "averageLikes": "平均いいね数",
    "averageRetweets": "平均リツイート数",
    "peakTimes": ["人気の時間帯"]
  },
  "summary": "トレンド分析の総括"
}`;

  return callGrok(prompt);
}

