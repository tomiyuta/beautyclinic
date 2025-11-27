/**
 * 戦略分析プロンプト生成
 *
 * 既存のprompt-helper.tsから詳細プロンプトを分離し、
 * 単一AI・Council両方で再利用可能にする
 */

import type {
  StrategyAnalysisType,
  StrategyAnalysisData,
  ProductData,
  MarketResearchData,
  SNSResearchData,
} from "@/types/strategy";
import { getPrompt } from "../prompt-helper";

// ============================================================
// メイン関数
// ============================================================

/**
 * 分析タイプに応じたプロンプトを生成
 */
export async function buildPromptForAnalysisType(
  analysisType: StrategyAnalysisType,
  data: StrategyAnalysisData
): Promise<string> {
  switch (analysisType) {
    case "comprehensive":
      return buildComprehensivePrompt(data);
    case "pricing":
      return buildPricingPrompt(data);
    case "campaign":
      return buildCampaignPrompt(data);
    case "new-treatment":
      return buildNewTreatmentPrompt(data);
    default:
      throw new Error(`Unknown analysis type: ${analysisType}`);
  }
}

// ============================================================
// 分析タイプ別プロンプト生成
// ============================================================

/**
 * 総合分析プロンプト
 */
async function buildComprehensivePrompt(
  data: StrategyAnalysisData
): Promise<string> {
  const { products, marketData, snsData, location } = data;

  // DBからカスタムプロンプトを取得（なければデフォルト）
  const basePrompt = await getPrompt(
    "claude_analyze_market_position",
    DEFAULT_COMPREHENSIVE_PROMPT
  );

  // プレースホルダー置換
  return basePrompt
    .replace("${clinicProducts}", `以下のJSON形式の商品データを分析してください：\n\n${formatProducts(products)}`)
    .replace("${marketData}", `以下のJSON形式の市場データを分析してください：\n\n${formatMarketData(marketData)}`)
    .replace("${snsData}", `以下のJSON形式のSNSデータを分析してください：\n\n${formatSNSData(snsData)}`)
    .replace("${location}", location ?? "未指定");
}

/**
 * 価格設定提案プロンプト
 */
async function buildPricingPrompt(
  data: StrategyAnalysisData
): Promise<string> {
  const { products, marketData } = data;

  const basePrompt = await getPrompt(
    "claude_generate_price_recommendations",
    DEFAULT_PRICING_PROMPT
  );

  return basePrompt
    .replace("${products}", `以下のJSON形式の商品データを分析してください：\n\n${formatProducts(products)}`)
    .replace("${marketPricing}", `以下のJSON形式の価格データを分析してください：\n\n${formatMarketPricing(marketData)}`);
}

/**
 * キャンペーン案プロンプト
 */
async function buildCampaignPrompt(
  data: StrategyAnalysisData
): Promise<string> {
  const { marketData, snsData } = data;

  const basePrompt = await getPrompt(
    "claude_generate_campaign_proposals",
    DEFAULT_CAMPAIGN_PROMPT
  );

  return basePrompt
    .replace("${trends}", `以下のJSON形式の市場トレンドデータを分析してください：\n\n${formatTrends(marketData)}`)
    .replace("${snsData}", `以下のJSON形式のSNSデータを分析してください：\n\n${formatSNSData(snsData)}`);
}

/**
 * 新施術導入提案プロンプト
 */
async function buildNewTreatmentPrompt(
  data: StrategyAnalysisData
): Promise<string> {
  const { products, marketData, snsData } = data;

  const basePrompt = await getPrompt(
    "claude_suggest_new_treatments",
    DEFAULT_NEW_TREATMENT_PROMPT
  );

  return basePrompt
    .replace("${currentTreatments}", `以下のJSON形式の商品データを分析してください：\n\n${formatProducts(products)}`)
    .replace("${marketTrends}", `以下のJSON形式の市場トレンドデータを分析してください：\n\n${formatTrends(marketData)}`)
    .replace("${snsTrends}", `以下のJSON形式のSNSトレンドデータを分析してください：\n\n${formatSNSTrends(snsData)}`);
}

// ============================================================
// フォーマッター関数
// ============================================================

function formatProducts(products: ProductData[]): string {
  if (!products || products.length === 0) {
    return "データなし";
  }
  const jsonData = JSON.stringify(
    products.map((p) => ({
      name: p.name,
      category: p.category,
      price: p.price,
      description: p.description,
    })),
    null,
    2
  );
  return `\`\`\`json\n${jsonData}\n\`\`\``;
}

function formatMarketData(data?: MarketResearchData): string {
  if (!data) return "データなし";
  const jsonData = JSON.stringify(
    {
      location: data.location,
      competitors: data.competitors,
      priceRanges: data.priceRanges,
      trends: data.trends,
      updatedAt: data.createdAt,
    },
    null,
    2
  );
  return `\`\`\`json\n${jsonData}\n\`\`\``;
}

function formatSNSData(data?: SNSResearchData): string {
  if (!data) return "データなし";
  const jsonData = JSON.stringify(
    {
      keywords: data.keywords,
      instagram: data.instagramData,
      twitter: data.twitterData,
      tiktok: data.tiktokData,
      trends: data.trends,
      updatedAt: data.createdAt,
    },
    null,
    2
  );
  return `\`\`\`json\n${jsonData}\n\`\`\``;
}

function formatMarketPricing(data?: MarketResearchData): string {
  if (!data) return "データなし";
  const jsonData = JSON.stringify(data.priceRanges, null, 2);
  return `\`\`\`json\n${jsonData}\n\`\`\``;
}

function formatTrends(data?: MarketResearchData): string {
  if (!data || !data.trends) return "データなし";
  const jsonData = JSON.stringify(data.trends, null, 2);
  return `\`\`\`json\n${jsonData}\n\`\`\``;
}

function formatSNSTrends(data?: SNSResearchData): string {
  if (!data || !data.trends) return "データなし";
  const jsonData = JSON.stringify(data.trends, null, 2);
  return `\`\`\`json\n${jsonData}\n\`\`\``;
}

// ============================================================
// デフォルトプロンプト
// ============================================================

const DEFAULT_COMPREHENSIVE_PROMPT = `あなたは美容クリニックの経営戦略コンサルタントです。
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

## 1. 市場ポジション分析
### 強み
- （箇条書きで3-5項目）

### 弱み
- （箇条書きで3-5項目）

### 機会
- （箇条書きで3-5項目）

### 脅威
- （箇条書きで3-5項目）

## 2. 価格調整の提案
| 商品名 | 現在価格 | 推奨価格 | 変動率 | 理由 | 優先度 |
|--------|---------|---------|--------|------|--------|
（表形式で記載）

## 3. キャンペーン案
各キャンペーンについて以下を記載：
- **キャンペーン名**
- **説明**
- **ターゲット層**
- **実施期間**
- **プロモーション内容**
- **期待される効果**
- **推奨SNSプラットフォーム**
- **優先度**

## 4. 新施術提案
各施術について以下を記載：
- **施術名**
- **カテゴリ**
- **導入理由**
- **市場需要**（高/中/低）
- **想定価格帯**
- **競争力評価**
- **優先度**

## 5. マーケティング戦略
- **全体的な方向性**
- **主要施策**（箇条書き）
- **タイムライン**
- **成功指標**（KPI）

## 6. 分析総括
（200文字程度で総括）
`;

const DEFAULT_PRICING_PROMPT = `あなたは美容クリニックの価格戦略専門家です。
以下の商品情報と市場価格データを基に、価格設定の提案を行ってください。

【自院商品】
\${products}

【市場価格データ】
\${marketPricing}

以下の形式で提案してください：

## 価格調整提案

| 商品名 | 現在価格 | 推奨価格 | 変動率 | 理由 | 優先度 | リスク | 機会 |
|--------|---------|---------|--------|------|--------|--------|------|
（全商品を表形式で記載）

## 価格戦略の総括

### 全体的な方向性
（100文字程度）

### 優先的に調整すべき商品
1. 
2. 
3. 

### 注意事項
- 
- 

### 推奨実施時期
`;

const DEFAULT_CAMPAIGN_PROMPT = `あなたは美容クリニックのマーケティングキャンペーン企画専門家です。
以下のトレンドデータとSNSデータを基に、効果的な月次キャンペーン案を2つ以上提案してください。

【市場トレンド】
\${trends}

【SNSトレンド】
\${snsData}

以下の形式で提案してください：

## キャンペーン案

### キャンペーン1: [キャンペーン名]
- **説明**: 
- **ターゲット層**: 
- **実施期間**: 
- **プロモーション内容**: 
- **実施チャンネル**: 
- **SNS戦略**: 
- **期待される効果**: 
- **予算の目安**: 
- **優先度**: 高/中/低

### キャンペーン2: [キャンペーン名]
（同様の形式）

### キャンペーン3: [キャンペーン名]
（同様の形式）

## キャンペーン戦略の総括

### 推奨実施順序
1. 
2. 
3. 

### 年間カレンダー案
| 月 | キャンペーン | 理由 |
|----|------------|------|

### 注意事項
- 医療広告ガイドラインの遵守ポイント
`;

const DEFAULT_NEW_TREATMENT_PROMPT = `あなたは美容クリニックの施術開発コンサルタントです。
以下の情報を基に、未導入の有望な施術・治療の導入提案を行ってください。

【現在導入済み施術】
\${currentTreatments}

【市場トレンド】
\${marketTrends}

【SNSトレンド】
\${snsTrends}

以下の形式で提案してください：

## 新施術導入提案

### 提案1: [施術名]
- **カテゴリ**: 
- **導入理由**: 
- **市場需要**: 高/中/低
- **トレンド状況**: 
- **価格情報**:
  - 原価の目安: 
  - 販売価格の目安: 
  - 市場価格帯: 
- **競争力の評価**: 
- **導入に必要な投資**: 
- **投資対効果**: 
- **優先度**: 高/中/低
- **導入スケジュール案**: 

### 提案2: [施術名]
（同様の形式）

### 提案3: [施術名]
（同様の形式）

## 新施術導入戦略の総括

### 推奨導入順序
1. 
2. 
3. 

### 導入タイムライン
| 時期 | 施術 | 理由 |
|------|------|------|

### リスクと対策
- 
- 
`;

// ============================================================
// エクスポート
// ============================================================

export {
  DEFAULT_COMPREHENSIVE_PROMPT,
  DEFAULT_PRICING_PROMPT,
  DEFAULT_CAMPAIGN_PROMPT,
  DEFAULT_NEW_TREATMENT_PROMPT,
};

