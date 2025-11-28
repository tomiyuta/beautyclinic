import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { z } from "zod";

import {
  researchCompetitorAnalysis as geminiResearchCompetitorAnalysis,
  researchPriceComparison as geminiResearchPriceComparison,
  researchTrendAnalysis as geminiResearchTrendAnalysis,
  getCurrentGeminiModel,
} from "@/server/services/gemini";

import {
  researchCompetitorAnalysis as chatgptResearchCompetitorAnalysis,
  researchPriceComparison as chatgptResearchPriceComparison,
  researchTrendAnalysis as chatgptResearchTrendAnalysis,
  getCurrentChatGPTModel,
} from "@/server/services/chatgpt";

import {
  researchCompetitorAnalysis as grokResearchCompetitorAnalysis,
  researchPriceComparison as grokResearchPriceComparison,
  researchTrendAnalysis as grokResearchTrendAnalysis,
  getCurrentGrokModel,
} from "@/server/services/grok";

import {
  researchCompetitorAnalysis as claudeResearchCompetitorAnalysis,
  researchPriceComparison as claudeResearchPriceComparison,
  researchTrendAnalysis as claudeResearchTrendAnalysis,
  getCurrentClaudeModel,
} from "@/server/services/claude";

import { publicProcedure, router } from "../trpc";

const researchTypeSchema = z.enum([
  "trend_analysis",
  "competitor_analysis",
  "price_research",
]);

/**
 * ユーザー設定に基づいて使用するAIプロバイダーを決定
 * ユーザー設定がない場合は環境変数MARKET_RESEARCH_AI_PROVIDERを確認
 * どちらもない場合はGeminiを使用（デフォルト）
 */
async function getMarketResearchAIProvider(userId: number): Promise<"claude" | "chatgpt" | "gemini" | "grok"> {
  try {
    // ユーザー設定を取得
    if (!("userSettings" in db)) {
      console.warn("Prisma client does not have userSettings property. Using default provider.");
      const provider = process.env.MARKET_RESEARCH_AI_PROVIDER?.toLowerCase();
      return provider === "claude" ? "claude" : provider === "chatgpt" ? "chatgpt" : provider === "grok" ? "grok" : "gemini";
    }

    const userSettings = await db.userSettings.findUnique({
      where: { userId },
    });

    if (userSettings && userSettings.marketResearchAIProvider) {
      const provider = userSettings.marketResearchAIProvider.toLowerCase();
      if (provider === "chatgpt" || provider === "claude" || provider === "gemini" || provider === "grok") {
        return provider as "claude" | "chatgpt" | "gemini" | "grok";
      }
    }
  } catch (error) {
    console.error("Failed to get user settings:", error);
  }

  // ユーザー設定がない場合は環境変数を確認
  const provider = process.env.MARKET_RESEARCH_AI_PROVIDER?.toLowerCase();
  // デフォルトはGemini
  if (provider === "claude") return "claude";
  if (provider === "chatgpt") return "chatgpt";
  if (provider === "grok") return "grok";
  return "gemini";
}

export const marketResearchRouter = router({
  executeTrendAnalysis: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        location: z.string().min(1, "場所を入力してください"),
        aiProvider: z.enum(["claude", "chatgpt", "gemini", "grok"]).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // AIプロバイダーを決定（入力 > ユーザー設定 > 環境変数 > デフォルト）
        const aiProvider = input.aiProvider || await getMarketResearchAIProvider(input.userId);
        
        let result: string;
        if (aiProvider === "chatgpt") {
          result = await chatgptResearchTrendAnalysis(input.location);
        } else if (aiProvider === "grok") {
          result = await grokResearchTrendAnalysis(input.location);
        } else if (aiProvider === "claude") {
          result = await claudeResearchTrendAnalysis(input.location);
        } else {
          result = await geminiResearchTrendAnalysis(input.location);
        }

        // データベースに保存（テキスト形式で保存）
        const saved = await db.marketResearchResult.create({
          data: {
            userId: input.userId,
            location: input.location,
            researchType: "trend_analysis",
            aiAgent: aiProvider,
            rawData: result,
            processedData: result, // テキスト形式で保存
          },
        });

        return {
          id: saved.id,
          result: result, // テキスト形式の結果をそのまま返す
          message: "トレンド分析が完了しました",
        };
      } catch (error) {
        console.error("Trend analysis error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "トレンド分析の実行に失敗しました",
        });
      }
    }),

  executePriceResearch: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        treatments: z
          .array(z.string().min(1))
          .min(1, "少なくとも1つの施術を指定してください"),
        cities: z
          .array(z.string().min(1, "都市名を入力してください"))
          .min(1, "少なくとも1つの都市を指定してください"),
        aiProvider: z.enum(["claude", "chatgpt", "gemini", "grok"]).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // AIプロバイダーを決定（入力 > ユーザー設定 > 環境変数 > デフォルト）
        const aiProvider = input.aiProvider || await getMarketResearchAIProvider(input.userId);
        
        let result: string;
        if (aiProvider === "chatgpt") {
          result = await chatgptResearchPriceComparison(input.treatments, input.cities);
        } else if (aiProvider === "grok") {
          result = await grokResearchPriceComparison(input.treatments, input.cities);
        } else if (aiProvider === "claude") {
          result = await claudeResearchPriceComparison(input.treatments, input.cities);
        } else {
          result = await geminiResearchPriceComparison(input.treatments, input.cities);
        }

        // データベースに保存（テキスト形式で保存）
        const saved = await db.marketResearchResult.create({
          data: {
            userId: input.userId,
            location: input.cities.join(", "),
            researchType: "price_research",
            aiAgent: aiProvider,
            rawData: result,
            processedData: result, // テキスト形式で保存
          },
        });

        return {
          id: saved.id,
          result: result, // テキスト形式の結果をそのまま返す
          message: "価格調査が完了しました",
        };
      } catch (error) {
        console.error("Price research error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "価格調査の実行に失敗しました",
        });
      }
    }),

  executeCompetitorAnalysis: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        location: z.string().min(1, "場所を入力してください"),
        radius: z.number().int().positive().optional().default(5),
        aiProvider: z.enum(["claude", "chatgpt", "gemini", "grok"]).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // AIプロバイダーを決定（入力 > ユーザー設定 > 環境変数 > デフォルト）
        const aiProvider = input.aiProvider || await getMarketResearchAIProvider(input.userId);
        
        let result: string;
        if (aiProvider === "chatgpt") {
          result = await chatgptResearchCompetitorAnalysis(input.location, input.radius);
        } else if (aiProvider === "grok") {
          result = await grokResearchCompetitorAnalysis(input.location, input.radius);
        } else if (aiProvider === "claude") {
          result = await claudeResearchCompetitorAnalysis(input.location, input.radius);
        } else {
          result = await geminiResearchCompetitorAnalysis(input.location, input.radius);
        }

        // データベースに保存（テキスト形式で保存）
        const saved = await db.marketResearchResult.create({
          data: {
            userId: input.userId,
            location: input.location,
            researchType: "competitor_analysis",
            aiAgent: aiProvider,
            rawData: result,
            processedData: result, // テキスト形式で保存
          },
        });

        return {
          id: saved.id,
          result: result, // テキスト形式の結果をそのまま返す
          message: "競合調査が完了しました",
        };
      } catch (error) {
        console.error("Competitor analysis error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "競合調査の実行に失敗しました",
        });
      }
    }),

  list: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        researchType: researchTypeSchema.optional(),
      }),
    )
    .query(async ({ input }) => {
      const where = {
        userId: input.userId,
        ...(input.researchType && { researchType: input.researchType }),
      };

      return db.marketResearchResult.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        userId: z.number().int().positive(),
      }),
    )
    .query(async ({ input }) => {
      const result = await db.marketResearchResult.findFirst({
        where: {
          id: input.id,
          userId: input.userId,
        },
      });

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "調査結果が見つかりません",
        });
      }

      return {
        ...result,
        processedData: result.processedData,
      };
    }),

  getCurrentModel: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive().optional(),
        aiProvider: z.enum(["claude", "chatgpt", "gemini", "grok"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      // AIプロバイダーを決定
      let aiProvider: "claude" | "chatgpt" | "gemini" | "grok" = "gemini";
      
      if (input?.aiProvider) {
        aiProvider = input.aiProvider;
      } else if (input?.userId) {
        aiProvider = await getMarketResearchAIProvider(input.userId);
      } else {
        const envProvider = process.env.MARKET_RESEARCH_AI_PROVIDER?.toLowerCase();
        if (envProvider === "claude") aiProvider = "claude";
        else if (envProvider === "chatgpt") aiProvider = "chatgpt";
        else if (envProvider === "grok") aiProvider = "grok";
      }

      // 各AIの現在のモデルを取得
      let model: string;
      switch (aiProvider) {
        case "chatgpt":
          model = getCurrentChatGPTModel() || "gpt-5.1";
          break;
        case "grok":
          model = getCurrentGrokModel() || "grok-4";
          break;
        case "claude":
          model = getCurrentClaudeModel() || "claude-opus-4-1";
          break;
        default:
          model = getCurrentGeminiModel() || "gemini-2.5-pro";
      }

      return {
        aiAgent: aiProvider,
        model,
      };
    }),
});

