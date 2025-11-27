import { z } from "zod";

// Council対応モデル
export const councilModelSchema = z.enum(["claude", "chatgpt", "gemini", "grok"]);

// 議長選択モード
export const chairmanModeSchema = z.enum(["auto", "manual"]);

// 分析タイプ
export const analysisTypeSchema = z.enum([
  "comprehensive",
  "pricing",
  "campaign",
  "new-treatment",
]);

// Council設定スキーマ
export const councilConfigSchema = z.object({
  models: z.array(councilModelSchema).min(2, "2つ以上のモデルを選択してください"),
  enablePeerReview: z.boolean().default(true),
  chairmanMode: chairmanModeSchema.default("manual"),
  manualChairman: councilModelSchema.optional(),
  timeoutMs: z.number().min(30000).max(300000).default(120000),
});

// 戦略分析Council入力
export const strategyCouncilInputSchema = z.object({
  userId: z.number().int().positive(),
  query: z.string().min(10, "質問は10文字以上で入力してください"),
  analysisType: analysisTypeSchema,
  councilConfig: councilConfigSchema,
  // 既存の戦略分析で使う追加データ（オプション）
  marketData: z.any().optional(),
  snsData: z.any().optional(),
  products: z.array(z.any()).optional(),
});

// 単一AI分析入力（既存互換）
export const strategySingleInputSchema = z.object({
  userId: z.number().int().positive(),
  query: z.string().min(10),
  analysisType: analysisTypeSchema,
  aiProvider: councilModelSchema,
  marketData: z.any().optional(),
  snsData: z.any().optional(),
  products: z.array(z.any()).optional(),
});

