import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { z } from "zod";

import {
  extractJSONFromResponse,
  analyzeInstagramTrends,
  analyzeYouTubeTrends,
} from "@/server/services/gemini";
import { analyzeTwitterTrends } from "@/server/services/grok";
import { logError } from "@/server/services/error-logger";

import { publicProcedure, router } from "../trpc";

const snsPlatformSchema = z.enum(["twitter", "instagram", "youtube"]);
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
        
        // JSONパースを試行（失敗してもrawDataとして保存）
        let parsedResult;
        try {
          parsedResult = JSON.parse(result);
        } catch {
          parsedResult = { raw: result };
        }

        // データベースに保存
        const saved = await db.sNSResearchResult.create({
          data: {
            userId: input.userId,
            platform: "twitter",
            keywords: input.keywords.join(","),
            aiAgent: "grok",
            trendData: JSON.stringify(parsedResult),
          },
        });

        return {
          id: saved.id,
          result: parsedResult,
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
        
        // JSONパースを試行（Markdownコードブロックを除去）
        let parsedResult;
        try {
          const cleanedResult = extractJSONFromResponse(result);
          parsedResult = JSON.parse(cleanedResult);
        } catch {
          parsedResult = { raw: result };
        }

        // データベースに保存
        const saved = await db.sNSResearchResult.create({
          data: {
            userId: input.userId,
            platform: "instagram",
            keywords: input.keywords.join(","),
            aiAgent: "gemini",
            trendData: JSON.stringify(parsedResult),
          },
        });

        return {
          id: saved.id,
          result: parsedResult,
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
        
        // JSONパースを試行（Markdownコードブロックを除去）
        let parsedResult;
        try {
          const cleanedResult = extractJSONFromResponse(result);
          parsedResult = JSON.parse(cleanedResult);
        } catch {
          parsedResult = { raw: result };
        }

        // データベースに保存
        const saved = await db.sNSResearchResult.create({
          data: {
            userId: input.userId,
            platform: "youtube",
            keywords: input.keywords.join(","),
            aiAgent: "gemini",
            trendData: JSON.stringify(parsedResult),
          },
        });

        return {
          id: saved.id,
          result: parsedResult,
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
        trendData: JSON.parse(result.trendData),
      };
    }),
});

