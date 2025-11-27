/**
 * 戦略分析 型定義
 */

import type { CouncilConfig } from "./ai-council";

// ============================================================
// 基本型
// ============================================================

/**
 * 分析タイプ
 */
export type StrategyAnalysisType =
  | "comprehensive"   // 総合分析
  | "pricing"         // 価格設定提案
  | "campaign"        // キャンペーン案
  | "new-treatment";  // 新施術導入提案

/**
 * 分析モード
 */
export type AnalysisMode = "single" | "council";

/**
 * AIプロバイダー
 */
export type AIProvider = "claude" | "chatgpt" | "gemini" | "grok";

// ============================================================
// データ型
// ============================================================

/**
 * 商品データ
 */
export interface ProductData {
  id: number;
  name: string;
  category: string;
  price: number;
  description?: string;
}

/**
 * 市場調査データ
 */
export interface MarketResearchData {
  id: number;
  location: string;
  competitors: any;
  priceRanges: any;
  trends: any;
  createdAt: Date;
}

/**
 * SNS調査データ
 */
export interface SNSResearchData {
  id: number;
  keywords: string[];
  instagramData: any;
  twitterData: any;
  tiktokData: any;
  trends: any;
  createdAt: Date;
}

/**
 * 戦略分析に必要なデータ（統合）
 */
export interface StrategyAnalysisData {
  products: ProductData[];
  marketData?: MarketResearchData;
  snsData?: SNSResearchData;
  location?: string;
}

// ============================================================
// 入力型
// ============================================================

/**
 * 単一AI分析の入力
 */
export interface SingleAnalysisInput {
  analysisType: StrategyAnalysisType;
  aiProvider: AIProvider;
}

/**
 * Council分析の入力
 */
export interface CouncilAnalysisInput {
  analysisType: StrategyAnalysisType;
  councilConfig: CouncilConfig;
}

// ============================================================
// 結果型
// ============================================================

/**
 * 単一AI分析の結果
 */
export interface SingleAnalysisResult {
  content: string;
  aiProvider: AIProvider;
  durationMs: number;
}

/**
 * データ状態（UI表示用）
 */
export interface DataStatus {
  products: {
    count: number;
    available: boolean;
  };
  marketData: {
    updatedAt: Date | null;
    available: boolean;
  };
  snsData: {
    updatedAt: Date | null;
    available: boolean;
  };
}

// ============================================================
// 出力構造型（参考用）
// ============================================================

/**
 * 価格推奨
 */
export interface PriceRecommendation {
  productName: string;
  currentPrice: number;
  recommendedPrice: number;
  changePercent: number;
  reason: string;
  priority: "high" | "medium" | "low";
  risk?: string;
  opportunity?: string;
}

/**
 * キャンペーン案
 */
export interface CampaignProposal {
  name: string;
  description: string;
  targetAudience: string;
  period: string;
  promotionContent: string;
  channels: string[];
  snsStrategy?: string;
  expectedEffect: string;
  budget?: string;
  priority: "high" | "medium" | "low";
}

/**
 * 新施術提案
 */
export interface TreatmentSuggestion {
  name: string;
  category: string;
  reason: string;
  marketDemand: "high" | "medium" | "low";
  trendStatus: string;
  priceRange: {
    cost: string;
    sellingPrice: string;
    marketPrice: string;
  };
  competitiveness: string;
  investment: string;
  roi: string;
  priority: "high" | "medium" | "low";
  schedule?: string;
}

/**
 * SWOT分析
 */
export interface SWOTAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

/**
 * マーケティング戦略
 */
export interface MarketingStrategy {
  direction: string;
  keyActions: string[];
  timeline: string;
  kpis: string[];
}

/**
 * 総合分析の出力構造
 */
export interface ComprehensiveAnalysisOutput {
  swot: SWOTAnalysis;
  priceAdjustments: PriceRecommendation[];
  campaigns: CampaignProposal[];
  newTreatments: TreatmentSuggestion[];
  marketingStrategy: MarketingStrategy;
  summary: string;
}

