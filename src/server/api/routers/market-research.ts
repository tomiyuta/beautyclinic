import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { z } from "zod";

import {
  extractJSONFromResponse,
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
        const cleanedResult = extractJSONFromResponse(result);
        let parsedResult;
        try {
          parsedResult = JSON.parse(cleanedResult);
        } catch (parseError) {
          console.error("JSON parse error. Original response:", result);
          console.error("Cleaned result:", cleanedResult);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `JSON解析に失敗しました。APIレスポンスが不正な形式です: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
          });
        }

        // データベースに保存
        const saved = await db.marketResearchResult.create({
          data: {
            userId: input.userId,
            location: input.location,
            researchType: "trend_analysis",
            aiAgent: "gemini",
            rawData: result,
            processedData: JSON.stringify(parsedResult),
          },
        });

        return {
          id: saved.id,
          result: parsedResult,
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
          .array(
            z.enum(["東京", "名古屋", "大阪", "福岡", "その他"]),
          )
          .min(1, "少なくとも1つの都市を指定してください"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await researchPriceComparison(
          input.treatments,
          input.cities,
        );
        let cleanedResult = extractJSONFromResponse(result);
        let parsedResult;
        
        // 複数回の修正を試行
        for (let retry = 0; retry < 3; retry++) {
          try {
            parsedResult = JSON.parse(cleanedResult);
            break; // 成功したらループを抜ける
          } catch (parseError) {
            if (retry === 2) {
              // 最後の試行でも失敗した場合
              console.error("JSON parse error. Original response:", result.substring(0, 500));
              console.error("Cleaned result length:", cleanedResult.length);
              if (parseError instanceof Error && parseError.message.includes("position")) {
                const match = parseError.message.match(/position (\d+)/);
                if (match) {
                  const pos = parseInt(match[1]!, 10);
                  const start = Math.max(0, pos - 100);
                  const end = Math.min(cleanedResult.length, pos + 100);
                  console.error("Error around position", pos, ":", cleanedResult.substring(start, end));
                  // 問題箇所を詳しく確認
                  const problemArea = cleanedResult.substring(Math.max(0, pos - 20), Math.min(cleanedResult.length, pos + 20));
                  console.error("Problem area:", JSON.stringify(problemArea));
                }
              }
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `JSON解析に失敗しました。APIレスポンスが不正な形式です: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
              });
            }
            
            // 再試行: 追加の修正を適用
            // 末尾のカンマを除去
            cleanedResult = cleanedResult.replace(/,\s*([}\]])/g, '$1');
            // 末尾の空白や改行を除去
            cleanedResult = cleanedResult.trim();
            // JSONの構造を確認して、閉じ括弧が足りない場合は追加
            const openBraces = (cleanedResult.match(/{/g) || []).length;
            const closeBraces = (cleanedResult.match(/}/g) || []).length;
            const openBrackets = (cleanedResult.match(/\[/g) || []).length;
            const closeBrackets = (cleanedResult.match(/]/g) || []).length;
            
            // 閉じ括弧を追加
            for (let i = 0; i < openBraces - closeBraces; i++) {
              cleanedResult += '}';
            }
            for (let i = 0; i < openBrackets - closeBrackets; i++) {
              cleanedResult += ']';
            }
          }
        }

        // データベースに保存
        const saved = await db.marketResearchResult.create({
          data: {
            userId: input.userId,
            location: input.cities.join(", "),
            researchType: "price_research",
            aiAgent: "gemini",
            rawData: result,
            processedData: JSON.stringify(parsedResult),
          },
        });

        return {
          id: saved.id,
          result: parsedResult,
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
        const cleanedResult = extractJSONFromResponse(result);
        let parsedResult;
        try {
          parsedResult = JSON.parse(cleanedResult);
        } catch (parseError) {
          console.error("JSON parse error. Original response:", result);
          console.error("Cleaned result:", cleanedResult);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `JSON解析に失敗しました。APIレスポンスが不正な形式です: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
          });
        }

        // データベースに保存
        const saved = await db.marketResearchResult.create({
          data: {
            userId: input.userId,
            location: input.location,
            researchType: "competitor_analysis",
            aiAgent: "gemini",
            rawData: result,
            processedData: JSON.stringify(parsedResult),
          },
        });

        return {
          id: saved.id,
          result: parsedResult,
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
        processedData: result.processedData
          ? JSON.parse(result.processedData)
          : null,
      };
    }),
});

