/**
 * コンテンツ生成サービス（要件定義書に基づく拡張版）
 * Instagram投稿、ブログ記事、LPテキストの生成と画像生成を統合
 */

import { db } from "@/server/db";
import { callChatGPT } from "./chatgpt";
import { generateImage, ImagePreset, ImageTheme } from "./image-generation";
import { cleanTextForAdvertising } from "@/server/utils/advertising-guidelines";

// 型定義
export type InstagramContentJson = {
  caption: string;
  hook: string;
  body: string;
  caution: string;
  callToAction: string;
  hashtags: string[];
};

export type BlogArticleJson = {
  title: string;
  outline: { heading: string; content: string }[];
  faq: { question: string; answer: string }[];
  seoKeywords: string[];
};

export type LpContentJson = {
  hero: {
    catchCopy: string;
    subCopy: string;
    primaryCta: string;
  };
  sections: {
    id: string;
    title: string;
    bodyMarkdown: string;
  }[];
  priceSection?: {
    normalPrice?: string;
    campaignPrice?: string;
    notes?: string;
  };
};

/**
 * SNS調査結果を取得してプロンプトに組み込む
 */
async function getSNSResearchContext(
  userId: number,
  snsResearchIds?: number[],
  relatedTreatmentIds?: number[],
): Promise<string> {
  let context = "";

  try {
    if (snsResearchIds && snsResearchIds.length > 0) {
      // 指定されたSNS調査結果を取得
      const researchResults = await db.sNSResearchResult.findMany({
        where: {
          id: { in: snsResearchIds },
          userId,
        },
        orderBy: { createdAt: "desc" },
      });

      if (researchResults.length > 0) {
        context += "【SNS調査結果（指定）】\n";
        for (const result of researchResults) {
          context += `プラットフォーム: ${result.platform}\n`;
          context += `キーワード: ${result.keywords}\n`;
          context += `トレンドデータ: ${result.trendData.substring(0, 500)}...\n\n`;
        }
      }
    } else if (relatedTreatmentIds && relatedTreatmentIds.length > 0) {
      // 関連する施術に基づいて直近のSNS調査結果を取得
      const recentResearch = await db.sNSResearchResult.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 直近30日
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      if (recentResearch.length > 0) {
        context += "【SNS調査結果（関連・直近）】\n";
        for (const result of recentResearch) {
          context += `プラットフォーム: ${result.platform}\n`;
          context += `キーワード: ${result.keywords}\n`;
          context += `トレンドデータ: ${result.trendData.substring(0, 300)}...\n\n`;
        }
      }
    }

    if (!context) {
      context = "【SNS調査結果】\nSNSトレンド情報は利用できません。一般的な美容クリニック向けのトレンドを考慮してください。\n\n";
    }
  } catch (error) {
    console.warn("[Content Generation] SNS調査結果の取得に失敗:", error);
    context = "【SNS調査結果】\nSNSトレンド情報の取得に失敗しました。一般的な美容クリニック向けのトレンドを考慮してください。\n\n";
  }

  return context;
}

/**
 * Instagram投稿を生成（構造化JSON + Markdown）
 */
export async function generateInstagramPost(
  campaign: {
    title: string;
    description: string;
    targetAudience?: string;
    promotion?: string;
  },
  options: {
    tone?: string;
    hashtagsPreference?: { maxCount: number };
    callToActionType?: "予約" | "カウンセリング" | "LINE登録" | "なし";
    snsResearchIds?: number[];
    relatedTreatmentIds?: number[];
    userId: number;
  },
): Promise<{ text: string; json: InstagramContentJson; markdown: string }> {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDateStr = `${currentYear}年${currentMonth}月`;

  const tone = options.tone || "上品で誠実";
  const maxHashtags = options.hashtagsPreference?.maxCount || 10;
  const ctaType = options.callToActionType || "予約";

  // SNS調査結果を取得
  const snsContext = await getSNSResearchContext(
    options.userId,
    options.snsResearchIds,
    options.relatedTreatmentIds,
  );

  const prompt = `以下のキャンペーン情報を基に、${tone}トーンのInstagram投稿を作成してください。

【キャンペーン情報】
タイトル: ${campaign.title}
説明: ${campaign.description}
ターゲット層: ${campaign.targetAudience || "美容に興味のある20-50代の女性"}
プロモーション内容: ${campaign.promotion || "特典あり"}

${snsContext}

【作成指示】
以下の構造で、JSON形式とMarkdown形式の両方で出力してください。

1. まず、<CONSENSUS_JSON>タグで囲まれたJSON形式で出力：
{
  "caption": "投稿全体のキャプション（ハッシュタグ含む）",
  "hook": "冒頭フック（悩みへの共感）",
  "body": "施術またはキャンペーンの紹介",
  "caution": "注意事項（「効果には個人差があります」等）",
  "callToAction": "${ctaType}に関するCTA文",
  "hashtags": ["#ハッシュタグ1", "#ハッシュタグ2", ...] // ${maxHashtags}個程度
}

2. 次に、<REPORT_MARKDOWN>タグで囲まれたMarkdown形式で出力：
# Instagram投稿案

## キャプション
[キャプション全文]

## 構成要素
- **冒頭フック**: [hook]
- **本文**: [body]
- **注意事項**: [caution]
- **行動喚起**: [callToAction]
- **ハッシュタグ**: [hashtagsを列挙]

【重要】
- 医療広告ガイドラインに準拠（誇大表現禁止）
- 「完全に治る」「必ず」「絶対」等の表現は使用しない
- 「効果には個人差があります」等の注意書きを含める
- SNS調査結果を参考に、トレンドに合った内容にする
- 現在の日付は${currentDateStr}です。${currentYear}年${currentMonth}月時点の最新情報を優先的に使用してください`;

  const response = await callChatGPT(prompt, undefined, 2000, "gpt-5.1");

  // JSONとMarkdownを抽出
  const jsonMatch = response.match(/<CONSENSUS_JSON>\s*([\s\S]*?)\s*<\/CONSENSUS_JSON>/);
  const markdownMatch = response.match(/<REPORT_MARKDOWN>\s*([\s\S]*?)\s*<\/REPORT_MARKDOWN>/);

  let json: InstagramContentJson;
  let markdown: string;

  if (jsonMatch) {
    try {
      json = JSON.parse(jsonMatch[1]!.trim()) as InstagramContentJson;
    } catch (error) {
      console.error("[Content Generation] JSON parse error:", error);
      // フォールバック: レスポンス全体をMarkdownとして扱う
      json = {
        caption: response.substring(0, 200),
        hook: "",
        body: response,
        caution: "※効果には個人差があります",
        callToAction: ctaType === "予約" ? "今すぐ予約する" : ctaType === "カウンセリング" ? "無料カウンセリングを受ける" : ctaType === "LINE登録" ? "LINEで友だち追加" : "",
        hashtags: [],
      };
      markdown = response;
    }
  } else {
    // JSONが見つからない場合のフォールバック
    json = {
      caption: response.substring(0, 200),
      hook: "",
      body: response,
      caution: "※効果には個人差があります",
      callToAction: ctaType === "予約" ? "今すぐ予約する" : ctaType === "カウンセリング" ? "無料カウンセリングを受ける" : ctaType === "LINE登録" ? "LINEで友だち追加" : "",
      hashtags: [],
    };
    markdown = response;
  }

  if (markdownMatch) {
    markdown = markdownMatch[1]!.trim();
  } else {
    markdown = response;
  }

  // 医療広告ガイドライン対応
  const cleaned = cleanTextForAdvertising(markdown);
  markdown = cleaned.cleanedText;

  return {
    text: markdown,
    json,
    markdown,
  };
}

/**
 * ブログ記事を生成（構造化JSON + Markdown）
 */
export async function generateBlogArticle(
  campaign: {
    title: string;
    description: string;
    targetAudience?: string;
  },
  options: {
    seoKeywords: string[];
    desiredLength?: "short" | "medium" | "long";
    tone?: string;
    snsResearchIds?: number[];
    relatedTreatmentIds?: number[];
    userId: number;
  },
): Promise<{ text: string; json: BlogArticleJson; markdown: string }> {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDateStr = `${currentYear}年${currentMonth}月`;

  const lengthMap = {
    short: "800文字程度",
    medium: "1500文字程度",
    long: "2500文字程度",
  };
  const desiredLengthText = lengthMap[options.desiredLength || "medium"];
  const tone = options.tone || "上品で誠実";
  const keywords = options.seoKeywords.join(", ");

  // SNS調査結果を取得
  const snsContext = await getSNSResearchContext(
    options.userId,
    options.snsResearchIds,
    options.relatedTreatmentIds,
  );

  const prompt = `以下のキャンペーン情報を基に、SEO最適化されたブログ記事を作成してください。

【キャンペーン情報】
タイトル: ${campaign.title}
説明: ${campaign.description}
ターゲット層: ${campaign.targetAudience || "美容に興味のある20-50代の女性"}

【SEOキーワード】
${keywords}

${snsContext}

【作成指示】
以下の構造で、JSON形式とMarkdown形式の両方で出力してください。

1. まず、<CONSENSUS_JSON>タグで囲まれたJSON形式で出力：
{
  "title": "記事タイトル",
  "outline": [
    { "heading": "H2見出し", "content": "セクション内容" },
    ...
  ],
  "faq": [
    { "question": "質問", "answer": "回答" },
    ...
  ],
  "seoKeywords": ["キーワード1", "キーワード2", ...]
}

2. 次に、<REPORT_MARKDOWN>タグで囲まれたMarkdown形式で出力：
# [記事タイトル]

## 読者の悩み・背景
[内容]

## 施術/キャンペーンの特徴
[内容]

## メリット・デメリット
[内容]

## よくある質問（Q&A）
[Q&A形式]

## まとめ & CTA
[まとめと行動喚起]

【重要】
- 見出しタグ（h1, h2, h3）を適切に使用
- SEOキーワードを自然に含める
- 読みやすく、情報価値の高い内容
- ${desiredLengthText}
- 医療広告ガイドラインに準拠（誇大表現禁止）
- 現在の日付は${currentDateStr}です。${currentYear}年${currentMonth}月時点の最新情報を優先的に使用してください`;

  const response = await callChatGPT(prompt, undefined, 2000, "gpt-5.1");

  // JSONとMarkdownを抽出
  const jsonMatch = response.match(/<CONSENSUS_JSON>\s*([\s\S]*?)\s*<\/CONSENSUS_JSON>/);
  const markdownMatch = response.match(/<REPORT_MARKDOWN>\s*([\s\S]*?)\s*<\/REPORT_MARKDOWN>/);

  let json: BlogArticleJson;
  let markdown: string;

  if (jsonMatch) {
    try {
      json = JSON.parse(jsonMatch[1]!.trim()) as BlogArticleJson;
    } catch (error) {
      console.error("[Content Generation] JSON parse error:", error);
      json = {
        title: campaign.title,
        outline: [],
        faq: [],
        seoKeywords: options.seoKeywords,
      };
      markdown = response;
    }
  } else {
    json = {
      title: campaign.title,
      outline: [],
      faq: [],
      seoKeywords: options.seoKeywords,
    };
    markdown = response;
  }

  if (markdownMatch) {
    markdown = markdownMatch[1]!.trim();
  } else {
    markdown = response;
  }

  // 医療広告ガイドライン対応
  const cleaned = cleanTextForAdvertising(markdown);
  markdown = cleaned.cleanedText;

  return {
    text: markdown,
    json,
    markdown,
  };
}

/**
 * LPテキストを生成（構造化JSON + Markdown）
 */
export async function generateLpContent(
  campaign: {
    title: string;
    description: string;
    targetAudience?: string;
    promotion?: string;
  },
  options: {
    primaryGoal?: "新規予約" | "LINE登録" | "キャンペーン認知";
    priceInfo?: {
      normalPrice?: string;
      campaignPrice?: string;
    };
    tone?: string;
    snsResearchIds?: number[];
    relatedTreatmentIds?: number[];
    userId: number;
  },
): Promise<{ text: string; json: LpContentJson; markdown: string }> {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDateStr = `${currentYear}年${currentMonth}月`;

  const tone = options.tone || "上品で誠実";
  const primaryGoal = options.primaryGoal || "新規予約";

  // SNS調査結果を取得
  const snsContext = await getSNSResearchContext(
    options.userId,
    options.snsResearchIds,
    options.relatedTreatmentIds,
  );

  const prompt = `以下のキャンペーン情報を基に、${tone}トーンのLP（ランディングページ）テキストを作成してください。

【キャンペーン情報】
タイトル: ${campaign.title}
説明: ${campaign.description}
ターゲット層: ${campaign.targetAudience || "美容に興味のある20-50代の女性"}
プロモーション内容: ${campaign.promotion || "特典あり"}
主な目的: ${primaryGoal}
${options.priceInfo ? `通常価格: ${options.priceInfo.normalPrice || "未設定"}\nキャンペーン価格: ${options.priceInfo.campaignPrice || "未設定"}` : ""}

${snsContext}

【作成指示】
以下の構造で、JSON形式とMarkdown形式の両方で出力してください。

1. まず、<CONSENSUS_JSON>タグで囲まれたJSON形式で出力：
{
  "hero": {
    "catchCopy": "キャッチコピー",
    "subCopy": "サブコピー",
    "primaryCta": "一次CTAボタン文言"
  },
  "sections": [
    {
      "id": "section1",
      "title": "セクションタイトル",
      "bodyMarkdown": "セクション内容（Markdown形式）"
    },
    ...
  ],
  "priceSection": {
    "normalPrice": "通常価格",
    "campaignPrice": "キャンペーン価格",
    "notes": "備考"
  }
}

2. 次に、<REPORT_MARKDOWN>タグで囲まれたMarkdown形式で出力：
# [キャンペーンタイトル]

## ファーストビュー
[キャッチコピー、サブコピー、CTA]

## 悩み・共感セクション
[内容]

## 施術/サービス説明セクション
[内容]

## 実績・症例/口コミセクション
[内容（実際の数字がないときは表現をぼかす）]

## 料金・プラン
[価格情報]

## 安心・安全に関する説明
[内容]

## フッターCTA
[行動喚起]

【重要】
- 医療広告ガイドラインに準拠（誇大表現禁止）
- 実績がない場合は表現をぼかす
- 現在の日付は${currentDateStr}です。${currentYear}年${currentMonth}月時点の最新情報を優先的に使用してください`;

  const response = await callChatGPT(prompt, undefined, 2000, "gpt-5.1");

  // JSONとMarkdownを抽出
  const jsonMatch = response.match(/<CONSENSUS_JSON>\s*([\s\S]*?)\s*<\/CONSENSUS_JSON>/);
  const markdownMatch = response.match(/<REPORT_MARKDOWN>\s*([\s\S]*?)\s*<\/REPORT_MARKDOWN>/);

  let json: LpContentJson;
  let markdown: string;

  if (jsonMatch) {
    try {
      json = JSON.parse(jsonMatch[1]!.trim()) as LpContentJson;
    } catch (error) {
      console.error("[Content Generation] JSON parse error:", error);
      json = {
        hero: {
          catchCopy: campaign.title,
          subCopy: campaign.description,
          primaryCta: primaryGoal === "新規予約" ? "今すぐ予約する" : primaryGoal === "LINE登録" ? "LINEで友だち追加" : "詳細を見る",
        },
        sections: [],
      };
      markdown = response;
    }
  } else {
    json = {
      hero: {
        catchCopy: campaign.title,
        subCopy: campaign.description,
        primaryCta: primaryGoal === "新規予約" ? "今すぐ予約する" : primaryGoal === "LINE登録" ? "LINEで友だち追加" : "詳細を見る",
      },
      sections: [],
    };
    markdown = response;
  }

  if (markdownMatch) {
    markdown = markdownMatch[1]!.trim();
  } else {
    markdown = response;
  }

  // 医療広告ガイドライン対応
  const cleaned = cleanTextForAdvertising(markdown);
  markdown = cleaned.cleanedText;

  return {
    text: markdown,
    json,
    markdown,
  };
}

