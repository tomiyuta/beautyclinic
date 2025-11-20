import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { z } from "zod";

import {
  analyzeInstagramTrends,
  analyzeYouTubeTrends,
  analyzeTikTokTrends,
  getCurrentGeminiModel,
} from "@/server/services/gemini";
import { analyzeTwitterTrends, getCurrentGrokModel } from "@/server/services/grok";
import { logError } from "@/server/services/error-logger";

import { publicProcedure, router } from "../trpc";

const snsPlatformSchema = z.enum(["twitter", "instagram", "youtube", "tiktok"]);
const timeRangeSchema = z.enum(["last_week", "last_month", "last_3months"]);

export const snsResearchRouter = router({
  analyzeTwitter: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        keywords: z
          .array(z.string().min(1))
          .min(1, "少なくとも1つのキーワードを指定してください"),
        timeRange: timeRangeSchema.optional().default("last_month"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await analyzeTwitterTrends(input.keywords, input.timeRange);

        // データベースに保存（テキスト形式で保存）
        const saved = await db.sNSResearchResult.create({
          data: {
            userId: input.userId,
            platform: "twitter",
            keywords: input.keywords.join(","),
            aiAgent: "grok",
            trendData: result, // テキスト形式で保存
          },
        });

        return {
          id: saved.id,
          result: result, // テキスト形式の結果をそのまま返す
          message: "Twitter調査が完了しました",
        };
      } catch (error) {
        console.error("Twitter research error:", error);
        
        // エラーログに記録
        await logError({
          userId: input.userId,
          module: "sns_research",
          errorType: "API_ERROR",
          errorMessage: error instanceof Error ? error.message : "Twitter調査の実行に失敗しました",
          stackTrace: error instanceof Error ? error.stack : undefined,
          context: {
            platform: "twitter",
            keywords: input.keywords,
            timeRange: input.timeRange,
          },
          aiAgent: "grok",
        }).catch((logError) => {
          console.error("Failed to log error:", logError);
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Twitter調査の実行に失敗しました",
        });
      }
    }),

  analyzeInstagram: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        keywords: z
          .array(z.string().min(1))
          .min(1, "少なくとも1つのキーワードを指定してください"),
        timeRange: timeRangeSchema.optional().default("last_month"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await analyzeInstagramTrends(input.keywords, input.timeRange);

        // データベースに保存（テキスト形式で保存）
        const saved = await db.sNSResearchResult.create({
          data: {
            userId: input.userId,
            platform: "instagram",
            keywords: input.keywords.join(","),
            aiAgent: "gemini",
            trendData: result, // テキスト形式で保存
          },
        });

        return {
          id: saved.id,
          result: result, // テキスト形式の結果をそのまま返す
          message: "Instagram調査が完了しました",
        };
      } catch (error) {
        console.error("Instagram research error:", error);
        
        // エラーログに記録
        await logError({
          userId: input.userId,
          module: "sns_research",
          errorType: "API_ERROR",
          errorMessage: error instanceof Error ? error.message : "Instagram調査の実行に失敗しました",
          stackTrace: error instanceof Error ? error.stack : undefined,
          context: {
            platform: "instagram",
            keywords: input.keywords,
            timeRange: input.timeRange,
          },
          aiAgent: "gemini",
        }).catch((logError) => {
          console.error("Failed to log error:", logError);
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Instagram調査の実行に失敗しました",
        });
      }
    }),

  analyzeYouTube: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        keywords: z
          .array(z.string().min(1))
          .min(1, "少なくとも1つのキーワードを指定してください"),
        timeRange: timeRangeSchema.optional().default("last_month"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await analyzeYouTubeTrends(input.keywords, input.timeRange);

        // データベースに保存（テキスト形式で保存）
        const saved = await db.sNSResearchResult.create({
          data: {
            userId: input.userId,
            platform: "youtube",
            keywords: input.keywords.join(","),
            aiAgent: "gemini",
            trendData: result, // テキスト形式で保存
          },
        });

        return {
          id: saved.id,
          result: result, // テキスト形式の結果をそのまま返す
          message: "YouTube調査が完了しました",
        };
      } catch (error) {
        console.error("YouTube research error:", error);
        
        // エラーログに記録
        await logError({
          userId: input.userId,
          module: "sns_research",
          errorType: "API_ERROR",
          errorMessage: error instanceof Error ? error.message : "YouTube調査の実行に失敗しました",
          stackTrace: error instanceof Error ? error.stack : undefined,
          context: {
            platform: "youtube",
            keywords: input.keywords,
            timeRange: input.timeRange,
          },
          aiAgent: "gemini",
        }).catch((logError) => {
          console.error("Failed to log error:", logError);
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "YouTube調査の実行に失敗しました",
        });
      }
    }),

  analyzeTikTok: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        keywords: z
          .array(z.string().min(1))
          .min(1, "少なくとも1つのキーワードを指定してください"),
        timeRange: timeRangeSchema.optional().default("last_month"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await analyzeTikTokTrends(input.keywords, input.timeRange);

        // データベースに保存（テキスト形式で保存）
        const saved = await db.sNSResearchResult.create({
          data: {
            userId: input.userId,
            platform: "tiktok",
            keywords: input.keywords.join(","),
            aiAgent: "gemini",
            trendData: result, // テキスト形式で保存
          },
        });

        return {
          id: saved.id,
          result: result, // テキスト形式の結果をそのまま返す
          message: "TikTok調査が完了しました",
        };
      } catch (error) {
        console.error("TikTok research error:", error);
        
        // エラーログに記録
        await logError({
          userId: input.userId,
          module: "sns_research",
          errorType: "API_ERROR",
          errorMessage: error instanceof Error ? error.message : "TikTok調査の実行に失敗しました",
          stackTrace: error instanceof Error ? error.stack : undefined,
          context: {
            platform: "tiktok",
            keywords: input.keywords,
            timeRange: input.timeRange,
          },
          aiAgent: "gemini",
        }).catch((logError) => {
          console.error("Failed to log error:", logError);
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "TikTok調査の実行に失敗しました",
        });
      }
    }),

  list: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        platform: snsPlatformSchema.optional(),
      }),
    )
    .query(async ({ input }) => {
      const where = {
        userId: input.userId,
        ...(input.platform && { platform: input.platform }),
      };

      return db.sNSResearchResult.findMany({
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
      const result = await db.sNSResearchResult.findFirst({
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
        trendData: result.trendData,
      };
    }),

  getCurrentModel: publicProcedure
    .input(
      z.object({
        platform: snsPlatformSchema.optional(),
      }),
    )
    .query(async ({ input }) => {
      if (input.platform === "twitter") {
        return {
          aiAgent: "grok" as const,
          model: getCurrentGrokModel() || "grok-4",
        };
      } else {
        // Instagram, YouTube, TikTok は Gemini
        return {
          aiAgent: "gemini" as const,
          model: getCurrentGeminiModel() || "gemini-2.5-pro",
        };
      }
    }),
});

