import { PrismaClient } from "../src/generated/prisma/client";
import { PromptType } from "../src/generated/prisma/enums";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

// JSON形式指定を削除したプロンプト
const updatedPrompts = [
  {
    promptType: "claude_analyze_market_position",
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

6. 分析総括`,
  },
  {
    promptType: "claude_generate_price_recommendations",
    prompt: `あなたは美容クリニックの価格戦略専門家です。
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

最後に、価格戦略の総括と全体的な推奨事項を記載してください。`,
  },
  {
    promptType: "claude_generate_campaign_proposals",
    prompt: `あなたは美容クリニックのマーケティングキャンペーン企画専門家です。
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

最後に、キャンペーン戦略の総括と推奨実施時期を記載してください。`,
  },
  {
    promptType: "claude_suggest_new_treatments",
    prompt: `あなたは美容クリニックの施術開発コンサルタントです。
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

最後に、新施術導入戦略の総括と推奨導入タイムラインを記載してください。`,
  },
  {
    promptType: "gemini_research_trend_analysis",
    prompt: `あなたは美容皮膚科クリニックの市場調査専門家です。
\${location}で現在流行している美容施術・治療について調査してください。

以下の観点から分析してください：
1. 人気の高い施術（ダーマペン、ボツリヌス注射、ヒアルロン酸注入など）
2. 各施術の平均価格帯
3. 新しく注目されている施術や技術
4. 顧客ニーズの傾向

わかりやすく読みやすい形式で、調査結果をまとめてください。各施術について、施術名、人気度、平均価格帯、説明を含めて記載してください。

最後に、調査結果の総括を記載してください。`,
  },
  {
    promptType: "gemini_research_price_comparison",
    prompt: `あなたは美容皮膚科クリニックの価格調査専門家です。
以下の都市の美容クリニックでの施術価格を調査してください：

都市: \${cities}
施術: \${treatments}

各都市・各施術について、以下の情報を含めてわかりやすくまとめてください：

- 都市名
- 施術名
- 平均価格（数値）
- 価格帯の説明
- 調査件数（推定）

最後に、価格比較の総括を記載してください。`,
  },
  {
    promptType: "gemini_analyze_instagram_trends",
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

わかりやすく読みやすい形式で、調査結果をまとめてください。最後に、トレンド分析の総括を記載してください。`,
  },
  {
    promptType: "gemini_analyze_youtube_trends",
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

わかりやすく読みやすい形式で、調査結果をまとめてください。最後に、トレンド分析の総括を記載してください。`,
  },
  {
    promptType: "gemini_research_competitor_analysis",
    prompt: `あなたは美容皮膚科クリニックの競合調査専門家です。
\${location}周辺\${radius}km圏内の競合クリニックについて調査してください。

以下の情報を収集してください：
1. 競合クリニックの名前と場所
2. 提供している主要な施術・治療
3. 各施術の価格設定
4. 特徴や強み

各競合クリニックについて、わかりやすく読みやすい形式でまとめてください。最後に、競合分析の総括を記載してください。`,
  },
  {
    promptType: "grok_analyze_twitter_trends",
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

わかりやすく読みやすい形式で、調査結果をまとめてください。最後に、トレンド分析の総括を記載してください。`,
  },
  {
    promptType: "chatgpt_generate_instagram_lp",
    prompt: `以下のキャンペーン情報を基に、\${approachText}のInstagram用LP案を作成してください。

【キャンペーン情報】
タイトル: \${campaignTitle}
説明: \${campaignDescription}
ターゲット層: \${targetAudience}
プロモーション内容: \${promotion}

以下の情報を含めて、わかりやすく読みやすい形式で提案してください：

- LPのタイトル
- メインヘッドライン
- 説明文（3-4文程度）
- 主要ポイント（3つ程度）
- メリット（2つ程度）
- 行動喚起文（例：「今すぐ予約する」）
- 推奨ハッシュタグ（3つ程度）
- デザイン要素の詳細な指示
- 推奨カラースキーム
- トーン（例：親しみやすい、高級感のある）`,
  },
  {
    promptType: "chatgpt_generate_website_article",
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
- HTML形式

記事タイトル、メタディスクリプション（150文字以内）、主要キーワード、記事本文（HTML形式）、記事の要約（2-3文）を含めてください。`,
  },
  {
    promptType: "chatgpt_generate_campaign_copy",
    prompt: `以下のキャンペーン情報を基に、\${toneText}トーンのキャンペーンコピーを作成してください。

【キャンペーン情報】
タイトル: \${campaignTitle}
説明: \${campaignDescription}
ターゲット層: \${targetAudience}
プロモーション内容: \${promotion}

以下の情報を含めて、わかりやすく読みやすい形式で提案してください：

- メインキャッチコピー
- サブキャッチコピー
- 本文（3-4段落）
- 行動喚起文
- キャッチフレーズ
- 主要メッセージ（3つ程度）`,
  },
];

async function main() {
  console.log("プロンプトを更新しています...");

  for (const promptData of updatedPrompts) {
    try {
      await prisma.promptTemplate.update({
        where: { promptType: promptData.promptType as PromptType },
        data: {
          prompt: promptData.prompt,
        },
      });
      console.log(`✓ ${promptData.promptType} を更新しました`);
    } catch (error) {
      console.error(`✗ ${promptData.promptType} の更新に失敗しました:`, error);
    }
  }

  console.log("プロンプトの更新が完了しました");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



