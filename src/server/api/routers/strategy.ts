import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { z } from "zod";

import {
  analyzeMarketPosition,
  generateCampaignProposals,
  generatePriceRecommendations,
  suggestNewTreatments,
} from "@/server/services/claude";

import { publicProcedure, router } from "../trpc";

export const strategyRouter = router({
  analyzeMarketPosition: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        location: z.string().min(1, "場所を入力してください"),
        includeMarketData: z.boolean().optional().default(true),
        includeSNSData: z.boolean().optional().default(true),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // 商品データを取得
        const products = await db.clinicProduct.findMany({
          where: { userId: input.userId },
        });

        if (products.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "分析する商品がありません。まず商品を登録してください。",
          });
        }

        // 市場調査データを取得
        const marketData: {
          trends: Record<string, unknown> | null;
          pricing: Record<string, unknown> | null;
          competitors: Record<string, unknown> | null;
        } = { trends: null, pricing: null, competitors: null };
        if (input.includeMarketData) {
          const marketResults = await db.marketResearchResult.findMany({
            where: { userId: input.userId },
            orderBy: { createdAt: "desc" },
            take: 10,
          });

          marketResults.forEach((result) => {
            if (result.processedData) {
              try {
                const parsed = JSON.parse(result.processedData);
                if (result.researchType === "trend_analysis") {
                  marketData.trends = parsed as Record<string, unknown>;
                } else if (result.researchType === "price_research") {
                  marketData.pricing = parsed as Record<string, unknown>;
                } else if (result.researchType === "competitor_analysis") {
                  marketData.competitors = parsed as Record<string, unknown>;
                }
              } catch {
                // パース失敗時はスキップ
              }
            }
          });
        }

        // SNS調査データを取得
        let snsData: Array<Record<string, unknown>> = [];
        if (input.includeSNSData) {
          const snsResults = await db.sNSResearchResult.findMany({
            where: { userId: input.userId },
            orderBy: { createdAt: "desc" },
            take: 10,
          });

          snsData = snsResults
            .map((result: { platform: string; trendData: string }) => {
              try {
                return {
                  platform: result.platform,
                  ...JSON.parse(result.trendData),
                };
              } catch {
                return null;
              }
            })
            .filter((data: unknown): data is Record<string, unknown> => data !== null);
        }

        // Claude APIで総合分析を実行
        const result = await analyzeMarketPosition(
          products.map((p) => ({
            name: p.name,
            costPrice: p.costPrice,
            sellingPrice: p.sellingPrice,
            category: p.category,
          })),
          marketData,
          snsData as Array<{
            platform: string;
            hashtags?: unknown[];
            influencers?: unknown[];
            popularContent?: unknown[];
            engagement?: Record<string, unknown>;
          }>,
          input.location,
        );

        let parsedResult;
        try {
          parsedResult = JSON.parse(result);
        } catch {
          parsedResult = { raw: result };
        }

        // データベースに保存
        const saved = await db.strategyRecommendation.create({
          data: {
            userId: input.userId,
            priceRecommendations: parsedResult.priceAdjustments
              ? JSON.stringify(parsedResult.priceAdjustments)
              : null,
            campaignProposals: parsedResult.campaignProposals
              ? JSON.stringify(parsedResult.campaignProposals)
              : null,
            newTreatmentSuggestions: parsedResult.newTreatmentSuggestions
              ? JSON.stringify(parsedResult.newTreatmentSuggestions)
              : null,
            marketingStrategy: parsedResult.marketingStrategy
              ? JSON.stringify(parsedResult.marketingStrategy)
              : null,
          },
        });

        return {
          id: saved.id,
          result: parsedResult,
          message: "総合分析が完了しました",
        };
      } catch (error) {
        console.error("Market position analysis error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof TRPCError
              ? error.message
              : error instanceof Error
                ? error.message
                : "総合分析の実行に失敗しました",
        });
      }
    }),

  generatePriceRecommendations: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const products = await db.clinicProduct.findMany({
          where: { userId: input.userId },
        });

        if (products.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "分析する商品がありません。",
          });
        }

        // 価格調査データを取得
        const priceResults = await db.marketResearchResult.findMany({
          where: {
            userId: input.userId,
            researchType: "price_research",
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        });

        const marketPricingArray = priceResults
          .map((result) => {
            try {
              return result.processedData
                ? JSON.parse(result.processedData)
                : null;
            } catch {
              return null;
            }
          })
          .filter((data): data is Record<string, unknown> => data !== null);

        const marketPricing: Record<string, unknown> =
          marketPricingArray.length > 0
            ? { data: marketPricingArray }
            : {};

        const result = await generatePriceRecommendations(
          products.map((p) => ({
            name: p.name,
            costPrice: p.costPrice,
            sellingPrice: p.sellingPrice,
            category: p.category,
          })),
          marketPricing,
        );

        let parsedResult;
        try {
          parsedResult = JSON.parse(result);
        } catch {
          parsedResult = { raw: result };
        }

        return {
          result: parsedResult,
          message: "価格設定提案が完了しました",
        };
      } catch (error) {
        console.error("Price recommendation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof TRPCError
              ? error.message
              : error instanceof Error
                ? error.message
                : "価格設定提案の実行に失敗しました",
        });
      }
    }),

  generateCampaignProposals: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // 市場トレンドデータを取得
        const trendResults = await db.marketResearchResult.findMany({
          where: {
            userId: input.userId,
            researchType: "trend_analysis",
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        });

        const trends = trendResults
          .map((result) => {
            try {
              return result.processedData
                ? JSON.parse(result.processedData)
                : null;
            } catch {
              return null;
            }
          })
          .filter((data) => data !== null);

        // SNSデータを取得
        const snsResults = await db.sNSResearchResult.findMany({
          where: { userId: input.userId },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        const snsData = snsResults
          .map((result) => {
            try {
              return JSON.parse(result.trendData);
            } catch {
              return null;
            }
          })
          .filter((data) => data !== null);

        const result = await generateCampaignProposals(trends, snsData);

        let parsedResult;
        try {
          parsedResult = JSON.parse(result);
        } catch {
          parsedResult = { raw: result };
        }

        // キャンペーン案が2つ以上あることを確認
        if (
          parsedResult.campaigns &&
          Array.isArray(parsedResult.campaigns) &&
          parsedResult.campaigns.length < 2
        ) {
          console.warn(
            "Campaign proposals less than 2. Expected at least 2 proposals.",
          );
        }

        return {
          result: parsedResult,
          message: "キャンペーン案が生成されました",
        };
      } catch (error) {
        console.error("Campaign proposal error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "キャンペーン案の生成に失敗しました",
        });
      }
    }),

  suggestNewTreatments: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const products = await db.clinicProduct.findMany({
          where: { userId: input.userId },
        });

        // 市場トレンドを取得
        const trendResults = await db.marketResearchResult.findMany({
          where: {
            userId: input.userId,
            researchType: "trend_analysis",
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        });

        const marketTrends = trendResults
          .map((result) => {
            try {
              return result.processedData
                ? JSON.parse(result.processedData)
                : null;
            } catch {
              return null;
            }
          })
          .filter((data) => data !== null);

        // SNSトレンドを取得
        const snsResults = await db.sNSResearchResult.findMany({
          where: { userId: input.userId },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        const snsTrends = snsResults
          .map((result) => {
            try {
              return JSON.parse(result.trendData);
            } catch {
              return null;
            }
          })
          .filter((data) => data !== null);

        const result = await suggestNewTreatments(
          products.map((p) => ({
            name: p.name,
            category: p.category,
          })),
          marketTrends,
          snsTrends,
        );

        let parsedResult;
        try {
          parsedResult = JSON.parse(result);
        } catch {
          parsedResult = { raw: result };
        }

        return {
          result: parsedResult,
          message: "新施術提案が完了しました",
        };
      } catch (error) {
        console.error("New treatment suggestion error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "新施術提案の実行に失敗しました",
        });
      }
    }),

  list: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
      }),
    )
    .query(async ({ input }) => {
      return db.strategyRecommendation.findMany({
        where: { userId: input.userId },
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
      const result = await db.strategyRecommendation.findFirst({
        where: {
          id: input.id,
          userId: input.userId,
        },
      });

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "戦略提案が見つかりません",
        });
      }

      return {
        ...result,
        priceRecommendations: result.priceRecommendations
          ? JSON.parse(result.priceRecommendations)
          : null,
        campaignProposals: result.campaignProposals
          ? JSON.parse(result.campaignProposals)
          : null,
        newTreatmentSuggestions: result.newTreatmentSuggestions
          ? JSON.parse(result.newTreatmentSuggestions)
          : null,
        marketingStrategy: result.marketingStrategy
          ? JSON.parse(result.marketingStrategy)
          : null,
      };
    }),

  updateFeedback: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        userId: z.number().int().positive(),
        feedback: z.string(),
        implementationStatus: z
          .enum(["pending", "in_progress", "completed"])
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await db.strategyRecommendation.findFirst({
        where: {
          id: input.id,
          userId: input.userId,
        },
      });

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "戦略提案が見つかりません",
        });
      }

      return db.strategyRecommendation.update({
        where: { id: input.id },
        data: {
          userFeedback: input.feedback,
          ...(input.implementationStatus && {
            implementationStatus: input.implementationStatus,
          }),
        },
      });
    }),
});

