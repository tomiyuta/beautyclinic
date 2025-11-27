/**
 * LLM Council 型定義
 */

// 使用可能なAIモデル
export type CouncilModel = "claude" | "chatgpt" | "gemini" | "grok";

// 議長選択モード
export type ChairmanMode = "auto" | "manual";

// Council設定
export interface CouncilConfig {
  models: CouncilModel[];           // 参加モデル（2つ以上）
  enablePeerReview: boolean;        // ピアレビュー実行するか
  chairmanMode: ChairmanMode;       // 議長選択モード
  manualChairman?: CouncilModel;    // 手動選択時の議長
  timeoutMs: number;                // タイムアウト（ms）
}

// デフォルト設定
export const DEFAULT_COUNCIL_CONFIG: CouncilConfig = {
  models: ["claude", "chatgpt", "gemini", "grok"],
  enablePeerReview: true,
  chairmanMode: "manual",
  manualChairman: "claude",
  timeoutMs: 120000, // 2分
};

// Stage 1: 個別回答
export interface CouncilResponse {
  model: CouncilModel;
  content: string;
  timestamp: Date;
  durationMs: number;
  error?: string;
}

// Stage 2: ピアレビュー（1件分）
export interface PeerReviewRanking {
  label: string;        // "Response A", "Response B", etc.
  rank: number;         // 1 = best
  reasoning: string;    // 順位の理由
}

export interface PeerReviewResult {
  reviewer: CouncilModel;
  rankings: PeerReviewRanking[];
  error?: string;
}

// 集計されたランキング
export interface AggregateRanking {
  model: CouncilModel;
  averageRank: number;
  votes: number;
}

// Stage 3: 最終回答
export interface CouncilFinalResponse {
  content: string;
  chairman: CouncilModel;
  durationMs: number;
}

// Council全体の結果
export interface CouncilResult {
  query: string;
  config: CouncilConfig;
  stage1: {
    responses: CouncilResponse[];
    durationMs: number;
  };
  stage2?: {
    reviews: PeerReviewResult[];
    labelToModel: Record<string, CouncilModel>;
    aggregateRankings: AggregateRanking[];
    durationMs: number;
  };
  stage3: CouncilFinalResponse;
  totalDurationMs: number;
}

// 戦略分析用の拡張設定
export interface StrategyCouncilConfig extends CouncilConfig {
  analysisType: "comprehensive" | "pricing" | "campaign" | "new-treatment";
}

