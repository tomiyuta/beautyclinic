import { PrismaClient } from "../src/generated/prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

const defaultPrompts = [
  {
    promptType: "claude_analyze_market_position",
    aiAgent: "claude",
    name: "市場ポジション分析",
    description: "自院商品、市場データ、SNSデータを総合的に分析し、戦略的な提案を行います",
    prompt: `あなたは美容クリニックの経営戦略コンサルタントです。
以下のデータを総合的に分析し、戦略的な提案を行ってください。

【自院の商品情報】
\${clinicProducts}

【市場調査データ】
\${marketData}

【SNS調査データ】
\${snsData}

【所在地】
\${location}

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
}`,
  },
  {
    promptType: "claude_generate_price_recommendations",
    aiAgent: "claude",
    name: "価格推奨",
    description: "商品情報と市場価格データを基に、価格設定の提案を行います",
    prompt: `あなたは美容クリニックの価格戦略専門家です。
以下の商品情報と市場価格データを基に、価格設定の提案を行ってください。

【自院商品】
\${products}

【市場価格データ】
\${marketPricing}

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
}`,
  },
  {
    promptType: "claude_generate_campaign_proposals",
    aiAgent: "claude",
    name: "キャンペーン案生成",
    description: "トレンドデータとSNSデータを基に、効果的な月次キャンペーン案を提案します",
    prompt: `あなたは美容クリニックのマーケティングキャンペーン企画専門家です。
以下のトレンドデータとSNSデータを基に、効果的な月次キャンペーン案を2つ以上提案してください。

【市場トレンド】
\${trends}

【SNSトレンド】
\${snsData}

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
}`,
  },
  {
    promptType: "claude_suggest_new_treatments",
    aiAgent: "claude",
    name: "新施術提案",
    description: "市場トレンドとSNSトレンドを基に、未導入の有望な施術・治療の導入提案を行います",
    prompt: `あなたは美容クリニックの施術開発コンサルタントです。
以下の情報を基に、未導入の有望な施術・治療の導入提案を行ってください。

【現在導入済み施術】
\${currentTreatments}

【市場トレンド】
\${marketTrends}

【SNSトレンド】
\${snsTrends}

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
}`,
  },
  {
    promptType: "gemini_research_trend_analysis",
    aiAgent: "gemini",
    name: "トレンド分析調査",
    description: "指定地域で流行している美容施術・治療について調査します",
    prompt: `あなたは美容皮膚科クリニックの市場調査専門家です。
\${location}で現在流行している美容施術・治療について調査してください。

以下の観点から分析してください：
1. 人気の高い施術（ダーマペン、ボツリヌス注射、ヒアルロン酸注入など）
2. 各施術の平均価格帯
3. 新しく注目されている施術や技術
4. 顧客ニーズの傾向

**重要**: 回答は必ずJSON形式のみで返してください。Markdownの見出しや説明文は不要です。以下の形式のJSONのみを返してください：

{
  "trends": [
    {
      "treatmentName": "施術名",
      "popularity": "high" | "medium" | "low",
      "averagePrice": "価格帯の説明",
      "description": "説明"
    }
  ],
  "summary": "総括"
}`,
  },
  {
    promptType: "gemini_research_price_comparison",
    aiAgent: "gemini",
    name: "価格比較調査",
    description: "複数の都市での美容クリニックの施術価格を調査します",
    prompt: `あなたは美容皮膚科クリニックの価格調査専門家です。
以下の都市の美容クリニックでの施術価格を調査してください：

都市: \${cities}
施術: \${treatments}

**重要**: 回答は必ずJSON形式のみで返してください。Markdownの見出しや説明文は不要です。以下の形式のJSONのみを返してください：

{
  "pricing": [
    {
      "city": "都市名",
      "treatment": "施術名",
      "averagePrice": "平均価格（数値）",
      "priceRange": "価格帯の説明",
      "sampleSize": "調査件数（推定）"
    }
  ],
  "summary": "価格比較の総括"
}`,
  },
  {
    promptType: "gemini_analyze_instagram_trends",
    aiAgent: "gemini",
    name: "Instagramトレンド分析",
    description: "Instagramで最新のトレンドを調査します",
    prompt: `あなたはInstagramマーケティングの専門家です。
Instagramで以下のキーワードに関連する最新のトレンドを調査してください：

キーワード: \${keywords}
期間: \${timeRangeText}

以下の観点から分析してください：
1. 人気のハッシュタグ
2. 影響力のあるアカウントやインフルエンサー
3. 人気の投稿タイプ（写真、リール、ストーリー）
4. エンゲージメント（いいね、コメント）の傾向
5. ビジュアルトレンド（配色、スタイルなど）

**重要**: 回答は必ずJSON形式のみで返してください。Markdownの見出しや説明文は不要です。以下の形式のJSONのみを返してください：

{
  "platform": "instagram",
  "hashtags": [
    {
      "name": "ハッシュタグ名",
      "postCount": "投稿数（推定）",
      "trend": "up" | "stable" | "down"
    }
  ],
  "influencers": [
    {
      "name": "アカウント名",
      "followers": "フォロワー数（推定）",
      "engagementRate": "エンゲージメント率",
      "topics": ["関連トピック"]
    }
  ],
  "popularContent": [
    {
      "type": "photo" | "reel" | "story",
      "theme": "コンテンツのテーマ",
      "visualStyle": "ビジュアルスタイル",
      "engagement": "エンゲージメント説明"
    }
  ],
  "engagement": {
    "averageLikes": "平均いいね数",
    "averageComments": "平均コメント数",
    "optimalPostingTimes": ["最適な投稿時間帯"]
  },
  "summary": "トレンド分析の総括"
}`,
  },
  {
    promptType: "gemini_analyze_youtube_trends",
    aiAgent: "gemini",
    name: "YouTubeトレンド分析",
    description: "YouTubeで最新のトレンドを調査します",
    prompt: `あなたはYouTubeマーケティングの専門家です。
YouTubeで以下のキーワードに関連する最新のトレンドを調査してください：

キーワード: \${keywords}
期間: \${timeRangeText}

以下の観点から分析してください：
1. 人気の動画タイトルやキーワード
2. 影響力のあるチャンネルやクリエイター
3. 人気の動画ジャンルやフォーマット
4. エンゲージメント（視聴回数、いいね、コメント）の傾向
5. 動画の長さや構成のトレンド

**重要**: 回答は必ずJSON形式のみで返してください。Markdownの見出しや説明文は不要です。以下の形式のJSONのみを返してください：

{
  "platform": "youtube",
  "hashtags": [
    {
      "name": "タグ名",
      "videoCount": "動画数（推定）",
      "trend": "up" | "stable" | "down"
    }
  ],
  "influencers": [
    {
      "name": "チャンネル名",
      "subscribers": "登録者数（推定）",
      "averageViews": "平均視聴回数",
      "topics": ["関連トピック"]
    }
  ],
  "popularContent": [
    {
      "type": "video" | "short",
      "theme": "コンテンツのテーマ",
      "duration": "平均視聴時間",
      "engagement": "エンゲージメント説明"
    }
  ],
  "engagement": {
    "averageViews": "平均視聴回数",
    "averageLikes": "平均いいね数",
    "averageComments": "平均コメント数",
    "watchTime": "平均視聴時間"
  },
  "summary": "トレンド分析の総括"
}`,
  },
  {
    promptType: "gemini_research_competitor_analysis",
    aiAgent: "gemini",
    name: "競合分析調査",
    description: "指定地域周辺の競合クリニックについて調査します",
    prompt: `あなたは美容皮膚科クリニックの競合調査専門家です。
\${location}周辺\${radius}km圏内の競合クリニックについて調査してください。

以下の情報を収集してください：
1. 競合クリニックの名前と場所
2. 提供している主要な施術・治療
3. 各施術の価格設定
4. 特徴や強み

**重要**: 回答は必ずJSON形式のみで返してください。Markdownの見出しや説明文は不要です。以下の形式のJSONのみを返してください：

{
  "competitors": [
    {
      "clinicName": "クリニック名",
      "location": "場所",
      "treatments": [
        {
          "name": "施術名",
          "price": "価格"
        }
      ],
      "features": "特徴"
    }
  ],
  "summary": "競合分析の総括"
}`,
  },
  {
    promptType: "grok_analyze_twitter_trends",
    aiAgent: "grok",
    name: "Twitter/Xトレンド分析",
    description: "Twitter/Xで最新のトレンドを調査します",
    prompt: `あなたはSNSマーケティングの専門家です。
Twitter/Xで以下のキーワードに関連する最新のトレンドを調査してください：

キーワード: \${keywords}
期間: \${timeRangeText}

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
}`,
  },
  {
    promptType: "chatgpt_system_prompt",
    aiAgent: "chatgpt",
    name: "ChatGPTシステムプロンプト",
    description: "ChatGPTの基本システムプロンプト（コンテンツ生成時の基本設定）",
    prompt: `あなたは美容クリニックのマーケティングコンテンツ作成の専門家です。魅力的で効果的なマーケティング素材を作成してください。`,
  },
  {
    promptType: "chatgpt_generate_instagram_lp",
    aiAgent: "chatgpt",
    name: "Instagram用LP生成",
    description: "Instagram用のLP案を生成します",
    prompt: `以下のキャンペーン情報を基に、\${approachText}のInstagram用LP案を作成してください。

【キャンペーン情報】
タイトル: \${campaignTitle}
説明: \${campaignDescription}
ターゲット層: \${targetAudience}
プロモーション内容: \${promotion}

以下のJSON形式で返してください：
{
  "title": "LPのタイトル",
  "headline": "メインヘッドライン",
  "description": "説明文（3-4文程度）",
  "keyPoints": ["ポイント1", "ポイント2", "ポイント3"],
  "benefits": ["メリット1", "メリット2"],
  "callToAction": "行動喚起文（例：「今すぐ予約する」）",
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2", "ハッシュタグ3"],
  "designNotes": "\${approachText}のデザイン要素を含む詳細なデザイン指示",
  "colorScheme": "推奨カラースキーム",
  "tone": "トーン（例：親しみやすい、高級感のある）"
}`,
  },
  {
    promptType: "chatgpt_generate_website_article",
    aiAgent: "chatgpt",
    name: "HP記事生成",
    description: "SEO最適化されたHP記事を作成します",
    prompt: `以下のキャンペーン情報を基に、SEO最適化されたHP記事を作成してください。

【キャンペーン情報】
タイトル: \${campaignTitle}
説明: \${campaignDescription}
ターゲット層: \${targetAudience}

【SEOキーワード】
\${keywords}

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
}`,
  },
  {
    promptType: "chatgpt_generate_campaign_copy",
    aiAgent: "chatgpt",
    name: "キャンペーンコピー生成",
    description: "キャンペーンコピーを作成します",
    prompt: `以下のキャンペーン情報を基に、\${toneText}トーンのキャンペーンコピーを作成してください。

【キャンペーン情報】
タイトル: \${campaignTitle}
説明: \${campaignDescription}
ターゲット層: \${targetAudience}
プロモーション内容: \${promotion}

以下のJSON形式で返してください：
{
  "headline": "メインキャッチコピー",
  "subheadline": "サブキャッチコピー",
  "bodyCopy": "本文（3-4段落）",
  "callToAction": "行動喚起文",
  "slogan": "キャッチフレーズ",
  "tone": "\${toneText}",
  "keyMessages": ["メッセージ1", "メッセージ2", "メッセージ3"]
}`,
  },
];

async function main() {
  console.log("初期プロンプトをデータベースに投入しています...");

  for (const promptData of defaultPrompts) {
    try {
      await prisma.promptTemplate.upsert({
        where: { promptType: promptData.promptType },
        update: {
          name: promptData.name,
          description: promptData.description,
          prompt: promptData.prompt,
          isActive: true,
        },
        create: {
          promptType: promptData.promptType,
          aiAgent: promptData.aiAgent,
          name: promptData.name,
          description: promptData.description,
          prompt: promptData.prompt,
          isActive: true,
        },
      });
      console.log(`✓ ${promptData.name} を投入しました`);
    } catch (error) {
      console.error(`✗ ${promptData.name} の投入に失敗しました:`, error);
    }
  }

  console.log("初期プロンプトの投入が完了しました");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

