import { db } from "@/server/db";

type PromptType =
  | "claude_analyze_market_position"
  | "claude_generate_price_recommendations"
  | "claude_generate_campaign_proposals"
  | "claude_suggest_new_treatments"
  | "gemini_research_trend_analysis"
  | "gemini_research_price_comparison"
  | "gemini_analyze_instagram_trends"
  | "gemini_analyze_youtube_trends"
  | "gemini_analyze_tiktok_trends"
  | "gemini_research_competitor_analysis"
  | "grok_analyze_twitter_trends"
  | "chatgpt_system_prompt"
  | "chatgpt_generate_instagram_lp"
  | "chatgpt_generate_website_article"
  | "chatgpt_generate_campaign_copy";

/**
 * デフォルトプロンプト一覧
 * データベースにプロンプトが存在しない場合に使用されるフォールバック用のプロンプト
 * 各サービスファイル（claude.ts, gemini.ts, chatgpt.ts, grok.ts）から参照
 */
export const DEFAULT_PROMPTS: Record<PromptType, string> = {
  // ==================== Claude ====================
  claude_analyze_market_position: `あなたは美容クリニックの経営戦略コンサルタントです。
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

  claude_generate_price_recommendations: `あなたは美容クリニックの価格戦略専門家です。
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

  claude_generate_campaign_proposals: `あなたは美容クリニックのマーケティングキャンペーン企画専門家です。
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

  claude_suggest_new_treatments: `あなたは美容クリニックの施術開発コンサルタントです。
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

  // ==================== Gemini ====================
  gemini_research_trend_analysis: `あなたは美容皮膚科クリニックの市場調査専門家です。
\${location}で現在流行している美容施術・治療について調査してください。

以下の観点から分析してください：
1. 人気の高い施術（ダーマペン、ボツリヌス注射、ヒアルロン酸注入など）
2. 各施術の平均価格帯
3. 新しく注目されている施術や技術
4. 顧客ニーズの傾向

わかりやすく読みやすい形式で、調査結果をまとめてください。各施術について、施術名、人気度、平均価格帯、説明を含めて記載してください。

最後に、調査結果の総括を記載してください。`,

  gemini_research_price_comparison: `あなたは美容皮膚科クリニックの価格調査専門家です。
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

  gemini_analyze_instagram_trends: `あなたはInstagramマーケティングの専門家です。
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

  gemini_analyze_youtube_trends: `あなたはYouTubeマーケティングの専門家です。
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

  gemini_analyze_tiktok_trends: `あなたはTikTokマーケティングの専門家です。
TikTokで以下のキーワードに関連する最新のトレンドを調査してください：

キーワード: \${keywords}
期間: \${timeRangeText}

以下の観点から分析してください：
1. 人気のハッシュタグやチャレンジ
2. 影響力のあるクリエイターやアカウント
3. 人気の動画フォーマットやスタイル（ショート動画、音楽、エフェクトなど）
4. エンゲージメント（いいね、コメント、シェア、再生回数）の傾向
5. トレンドの変化速度とライフサイクル
6. 若年層への訴求力と拡散力
7. サウンドや音楽のトレンド
8. 視覚的エフェクトやフィルターのトレンド

わかりやすく読みやすい形式で、調査結果をまとめてください。最後に、トレンド分析の総括を記載してください。`,

  gemini_research_competitor_analysis: `あなたは美容皮膚科クリニックの競合調査専門家です。
\${location}周辺\${radius}km圏内の競合クリニックについて調査してください。

以下の情報を収集してください：
1. 競合クリニックの名前と場所
2. 提供している主要な施術・治療
3. 各施術の価格設定
4. 特徴や強み

各競合クリニックについて、わかりやすく読みやすい形式でまとめてください。最後に、競合分析の総括を記載してください。`,

  // ==================== Grok ====================
  grok_analyze_twitter_trends: `あなたはSNSマーケティングの専門家です。
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

  // ==================== ChatGPT ====================
  chatgpt_system_prompt: `あなたは美容クリニックのマーケティングコンテンツ作成の専門家です。魅力的で効果的なマーケティング素材を作成してください。`,

  chatgpt_generate_instagram_lp: `以下のキャンペーン情報を基に、\${approachText}のInstagram用LP案を作成してください。

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

  chatgpt_generate_website_article: `以下のキャンペーン情報を基に、SEO最適化されたHP記事を作成してください。

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

  chatgpt_generate_campaign_copy: `以下のキャンペーン情報を基に、\${toneText}トーンのキャンペーンコピーを作成してください。

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
};

/**
 * Webリサーチの指示を追加する
 * プロンプトの先頭に追加して、最初にWebリサーチを実行するよう指示する
 */
function addWebResearchInstruction(prompt: string): string {
  // 現在の日付を取得
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDateStr = `${currentYear}年${currentMonth}月`;

  const webResearchInstruction = `【重要】Webリサーチの実施について
現在の日付は${currentDateStr}です。このタスクを実行する前に、必ず最新の情報を取得するためにWebリサーチを行ってください。

- 現在の日付は${currentDateStr}です。必ず${currentYear}年${currentMonth}月時点の最新情報を取得してください
- 2024年以前の古い情報は使用しないでください。必ず${currentYear}年${currentMonth}月時点の最新情報を使用してください
- 最新のトレンド、ニュース、統計データをWeb検索で取得してください
- 信頼性の高い情報源（公式サイト、ニュースサイト、業界レポートなど）を優先してください
- 検索結果を基に、最新かつ正確な情報を提供してください
- 情報の出典や日付を可能な限り明記してください
- 古い情報や不確実な情報は使用しないでください
- 特にトレンド分析や価格調査の場合は、必ず最新の市場データを検索してください
- 調査結果には必ず「${currentDateStr}時点の調査結果」と明記してください

上記のWebリサーチを実施した上で、以下の指示に従って回答してください。

`;

  // プロンプトの先頭にWebリサーチの指示を追加
  return webResearchInstruction + prompt;
}

/**
 * データベースからプロンプトを取得し、存在しない場合はデフォルトプロンプトを返す
 * Webリサーチの指示を自動的に追加します
 * 
 * @param promptType - プロンプトタイプ
 * @param defaultPrompt - フォールバック用のデフォルトプロンプト（省略時はDEFAULT_PROMPTSから取得）
 * @returns Webリサーチ指示が追加されたプロンプト
 */
export async function getPrompt(
  promptType: PromptType,
  defaultPrompt?: string,
): Promise<string> {
  try {
    const promptTemplate = await db.promptTemplate.findUnique({
      where: { promptType },
    });

    if (promptTemplate && promptTemplate.isActive) {
      // Webリサーチの指示を追加
      return addWebResearchInstruction(promptTemplate.prompt);
    }
  } catch (error) {
    console.error(`Failed to get prompt for ${promptType}:`, error);
  }

  // デフォルトプロンプトを取得（引数が指定されていない場合はDEFAULT_PROMPTSから取得）
  const fallbackPrompt = defaultPrompt ?? DEFAULT_PROMPTS[promptType] ?? "";
  
  if (!fallbackPrompt) {
    console.warn(`No default prompt found for ${promptType}`);
  }

  // デフォルトプロンプトにもWebリサーチの指示を追加
  return addWebResearchInstruction(fallbackPrompt);
}

/**
 * プレースホルダーを置換する
 */
export function replacePlaceholders(
  template: string,
  placeholders: Record<string, string | number | unknown>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(placeholders)) {
    const placeholder = `\${${key}}`;
    const replacement =
      typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
    result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), replacement);
  }
  return result;
}



