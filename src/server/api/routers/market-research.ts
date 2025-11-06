import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { z } from "zod";

import {
  researchCompetitorAnalysis,
  researchPriceComparison,
  researchTrendAnalysis,
} from "@/server/services/gemini";

import { publicProcedure, router } from "../trpc";

const researchTypeSchema = z.enum([
  "trend_analysis",
  "competitor_analysis",
  "price_research",
]);

export const marketResearchRouter = router({
  executeTrendAnalysis: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        location: z.string().min(1, "場所を入力してください"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await researchTrendAnalysis(input.location);

        // データベースに保存（テキスト形式で保存）
        const saved = await db.marketResearchResult.create({
          data: {
            userId: input.userId,
            location: input.location,
            researchType: "trend_analysis",
            aiAgent: "gemini",
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
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await researchPriceComparison(
          input.treatments,
          input.cities,
        );

        // データベースに保存（テキスト形式で保存）
        const saved = await db.marketResearchResult.create({
          data: {
            userId: input.userId,
            location: input.cities.join(", "),
            researchType: "price_research",
            aiAgent: "gemini",
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
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await researchCompetitorAnalysis(
          input.location,
          input.radius,
        );

        // データベースに保存（テキスト形式で保存）
        const saved = await db.marketResearchResult.create({
          data: {
            userId: input.userId,
            location: input.location,
            researchType: "competitor_analysis",
            aiAgent: "gemini",
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
});

