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
        productIds: z.array(z.number().int().positive()).optional(),
        includeMarketData: z.boolean().optional().default(true),
        includeSNSData: z.boolean().optional().default(true),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // 商品データを取得（productIdsが指定されている場合はそれを使用、そうでない場合は全商品）
        let products;
        if (input.productIds && input.productIds.length > 0) {
          products = await db.clinicProduct.findMany({
            where: {
              userId: input.userId,
              id: { in: input.productIds },
              isActive: true,
            },
          });
        } else {
          products = await db.clinicProduct.findMany({
            where: { userId: input.userId, isActive: true },
          });
        }

        if (products.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "分析する商品がありません。商品を選択するか、まず商品を登録してください。",
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
              // テキスト形式として扱う
              if (result.researchType === "trend_analysis") {
                marketData.trends = { text: result.processedData } as Record<string, unknown>;
              } else if (result.researchType === "price_research") {
                marketData.pricing = { text: result.processedData } as Record<string, unknown>;
              } else if (result.researchType === "competitor_analysis") {
                marketData.competitors = { text: result.processedData } as Record<string, unknown>;
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
            .map((result: { platform: string; trendData: string | null }) => {
              if (!result.trendData) {
                return null;
              }
              // テキスト形式として扱う
              return {
                platform: result.platform,
                text: result.trendData,
              } as Record<string, unknown>;
            })
            .filter((data): data is Record<string, unknown> => data !== null) as Array<Record<string, unknown>>;
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

        // データベースに保存（テキスト形式で保存）
        const saved = await db.strategyRecommendation.create({
          data: {
            userId: input.userId,
            marketingStrategy: result, // 総合分析結果をマーケティング戦略として保存
            priceRecommendations: null,
            campaignProposals: null,
            newTreatmentSuggestions: null,
          },
        });

        return {
          id: saved.id,
          result: result, // テキスト形式の結果をそのまま返す
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
            if (result.processedData) {
              // テキスト形式として扱う
              return { text: result.processedData } as Record<string, unknown>;
            }
            return null;
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

        return {
          result: result, // テキスト形式の結果をそのまま返す
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
            if (result.processedData) {
              // テキスト形式として扱う
              return { text: result.processedData };
            }
            return null;
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
            if (!result.trendData) {
              return null;
            }
            // テキスト形式として扱う
            return { text: result.trendData };
          })
          .filter((data) => data !== null);

        const result = await generateCampaignProposals(trends, snsData);

        return {
          result: result, // テキスト形式の結果をそのまま返す
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
            if (result.processedData) {
              try {
                // 既存データがJSON形式の場合とテキスト形式の場合の両方に対応
                return JSON.parse(result.processedData);
              } catch {
                // JSONでない場合はテキスト形式として扱う
                return { text: result.processedData };
              }
            }
            return null;
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
            if (!result.trendData) {
              return null;
            }
            try {
              // 既存データがJSON形式の場合とテキスト形式の場合の両方に対応
              return JSON.parse(result.trendData);
            } catch {
              // JSONでない場合はテキスト形式として扱う
              return { text: result.trendData };
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

        return {
          result: result, // テキスト形式の結果をそのまま返す
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
        priceRecommendations: result.priceRecommendations,
        campaignProposals: result.campaignProposals,
        newTreatmentSuggestions: result.newTreatmentSuggestions,
        marketingStrategy: result.marketingStrategy,
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

