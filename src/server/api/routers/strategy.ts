import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { z } from "zod";

import {
  analyzeMarketPosition as claudeAnalyzeMarketPosition,
  generateCampaignProposals as claudeGenerateCampaignProposals,
  generatePriceRecommendations as claudeGeneratePriceRecommendations,
  suggestNewTreatments as claudeSuggestNewTreatments,
} from "@/server/services/claude";

import {
  analyzeMarketPosition as chatgptAnalyzeMarketPosition,
  generateCampaignProposals as chatgptGenerateCampaignProposals,
  generatePriceRecommendations as chatgptGeneratePriceRecommendations,
  suggestNewTreatments as chatgptSuggestNewTreatments,
} from "@/server/services/chatgpt";

import { publicProcedure, router } from "../trpc";
import {
  aggregateMarketResearchData,
  aggregateSNSResearchData,
} from "@/server/utils/parse-ai-results";

/**
 * ユーザー設定に基づいて使用するAIプロバイダーを決定
 * ユーザー設定がない場合は環境変数STRATEGY_AI_PROVIDERを確認
 * どちらもない場合はChatGPT APIを使用（デフォルト）
 */
async function getStrategyAIProvider(userId: number): Promise<"claude" | "chatgpt"> {
  try {
    // ユーザー設定を取得
    const userSettings = await db.userSettings.findUnique({
      where: { userId },
    });

    if (userSettings && userSettings.strategyAIProvider) {
      const provider = userSettings.strategyAIProvider.toLowerCase();
      if (provider === "chatgpt" || provider === "claude") {
        return provider as "claude" | "chatgpt";
      }
    }
  } catch (error) {
    console.error("Failed to get user settings:", error);
  }

  // ユーザー設定がない場合は環境変数を確認
  const provider = process.env.STRATEGY_AI_PROVIDER?.toLowerCase();
  // デフォルトはChatGPT API
  return provider === "claude" ? "claude" : "chatgpt";
}

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

        // 市場調査データを取得（構造化データとして）
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

          // 構造化データに変換
          const aggregated = aggregateMarketResearchData(
            marketResults.map((r) => ({
              researchType: r.researchType,
              processedData: r.processedData,
              aiAgent: r.aiAgent,
              createdAt: r.createdAt,
            })),
          );

          // 構造化データを優先的に使用（なければrawTextを使用）
          marketData.trends = aggregated.trends
            ? {
                consensusJSON: aggregated.trends.consensusJSON,
                reportMarkdown: aggregated.trends.reportMarkdown,
                rawText: aggregated.trends.rawText,
                aiAgent: aggregated.trends.aiAgent,
                createdAt: aggregated.trends.createdAt.toISOString(),
                // 構造化データから主要情報を抽出
                treatments: aggregated.trends.consensusJSON?.treatments || null,
                customerNeeds: aggregated.trends.consensusJSON?.customerNeeds || null,
                sources: aggregated.trends.consensusJSON?.sources || null,
              }
            : null;

          marketData.pricing = aggregated.pricing
            ? {
                consensusJSON: aggregated.pricing.consensusJSON,
                reportMarkdown: aggregated.pricing.reportMarkdown,
                rawText: aggregated.pricing.rawText,
                aiAgent: aggregated.pricing.aiAgent,
                createdAt: aggregated.pricing.createdAt.toISOString(),
                // 構造化データから主要情報を抽出
                priceTable: aggregated.pricing.consensusJSON?.price_table || null,
                areaSummary: aggregated.pricing.consensusJSON?.area_summary || null,
                sources: aggregated.pricing.consensusJSON?.sources || null,
              }
            : null;

          marketData.competitors = aggregated.competitors
            ? {
                consensusJSON: aggregated.competitors.consensusJSON,
                reportMarkdown: aggregated.competitors.reportMarkdown,
                rawText: aggregated.competitors.rawText,
                aiAgent: aggregated.competitors.aiAgent,
                createdAt: aggregated.competitors.createdAt.toISOString(),
                // 構造化データから主要情報を抽出
                competitors: aggregated.competitors.consensusJSON?.competitors || null,
                areaSummary: aggregated.competitors.consensusJSON?.area_summary || null,
                sources: aggregated.competitors.consensusJSON?.sources || null,
              }
            : null;

          console.log(
            `[Strategy] Market data aggregated: trends=${!!marketData.trends}, pricing=${!!marketData.pricing}, competitors=${!!marketData.competitors}`,
          );
        }

        // SNS調査データを取得（構造化データとして）
        let snsData: Array<Record<string, unknown>> = [];
        if (input.includeSNSData) {
          const snsResults = await db.sNSResearchResult.findMany({
            where: { userId: input.userId },
            orderBy: { createdAt: "desc" },
            take: 10,
          });

          // 構造化データに変換
          const aggregated = aggregateSNSResearchData(
            snsResults.map((r) => ({
              platform: r.platform,
              trendData: r.trendData,
              aiAgent: r.aiAgent,
              createdAt: r.createdAt,
            })),
          );

          snsData = aggregated.map((data) => ({
            platform: data.platform,
            consensusJSON: data.consensusJSON,
            reportMarkdown: data.reportMarkdown,
            rawText: data.rawText,
            aiAgent: data.aiAgent,
            createdAt: data.createdAt.toISOString(),
            // 構造化データから主要情報を抽出
            hashtags: data.consensusJSON?.hashtags || null,
            influencers: data.consensusJSON?.influencers || null,
            topPosts: data.consensusJSON?.top_posts || data.consensusJSON?.top_videos || null,
            engagementTrends: data.consensusJSON?.engagement_trends || null,
            audienceSignals: data.consensusJSON?.audience_signals || null,
            sources: data.consensusJSON?.sources || null,
          }));

          console.log(`[Strategy] SNS data aggregated: ${snsData.length} platforms`);
        }

        // AI APIで総合分析を実行（ユーザー設定に基づいてClaude/ChatGPTを選択）
        const aiProvider = await getStrategyAIProvider(input.userId);
        console.log(`[Strategy] Using AI provider: ${aiProvider} (userId: ${input.userId})`);

        const result = aiProvider === "chatgpt"
          ? await chatgptAnalyzeMarketPosition(
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
            )
          : await claudeAnalyzeMarketPosition(
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

        // 価格調査データを取得（構造化データとして）
        const priceResults = await db.marketResearchResult.findMany({
          where: {
            userId: input.userId,
            researchType: "price_research",
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        });

        // 最新の価格調査結果を構造化データに変換
        const latestPriceResult = priceResults[0];
        let marketPricing: Record<string, unknown> = {};
        
        if (latestPriceResult?.processedData) {
          const parsed = aggregateMarketResearchData([
            {
              researchType: "price_research",
              processedData: latestPriceResult.processedData,
              aiAgent: latestPriceResult.aiAgent,
              createdAt: latestPriceResult.createdAt,
            },
          ]);

          if (parsed.pricing) {
            marketPricing = {
              consensusJSON: parsed.pricing.consensusJSON,
              reportMarkdown: parsed.pricing.reportMarkdown,
              rawText: parsed.pricing.rawText,
              aiAgent: parsed.pricing.aiAgent,
              createdAt: parsed.pricing.createdAt.toISOString(),
              priceTable: parsed.pricing.consensusJSON?.price_table || null,
              areaSummary: parsed.pricing.consensusJSON?.area_summary || null,
              sources: parsed.pricing.consensusJSON?.sources || null,
            };
          }
        }

        console.log(`[Price Recommendations] Market pricing data: ${Object.keys(marketPricing).length > 0 ? "構造化データあり" : "データなし"}`);

        // AI APIで価格推奨を生成（ユーザー設定に基づいてClaude/ChatGPTを選択）
        const aiProvider = await getStrategyAIProvider(input.userId);
        console.log(`[Strategy] Using AI provider: ${aiProvider} (userId: ${input.userId})`);

        const result = aiProvider === "chatgpt"
          ? await chatgptGeneratePriceRecommendations(
              products.map((p) => ({
                name: p.name,
                costPrice: p.costPrice,
                sellingPrice: p.sellingPrice,
                category: p.category,
              })),
              marketPricing,
            )
          : await claudeGeneratePriceRecommendations(
              products.map((p) => ({
                name: p.name,
                costPrice: p.costPrice,
                sellingPrice: p.sellingPrice,
                category: p.category,
              })),
              marketPricing,
            );

        // データベースに保存
        const saved = await db.strategyRecommendation.create({
          data: {
            userId: input.userId,
            marketingStrategy: null,
            priceRecommendations: result, // 価格推奨を保存
            campaignProposals: null,
            newTreatmentSuggestions: null,
          },
        });

        return {
          id: saved.id,
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
        // 市場トレンドデータを取得（構造化データとして）
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
            if (!result.processedData) {
              return null;
            }
            const parsed = aggregateMarketResearchData([
              {
                researchType: "trend_analysis",
                processedData: result.processedData,
                aiAgent: result.aiAgent,
                createdAt: result.createdAt,
              },
            ]);
            
            return parsed.trends
              ? {
                  consensusJSON: parsed.trends.consensusJSON,
                  reportMarkdown: parsed.trends.reportMarkdown,
                  rawText: parsed.trends.rawText,
                  aiAgent: parsed.trends.aiAgent,
                  createdAt: parsed.trends.createdAt.toISOString(),
                  treatments: parsed.trends.consensusJSON?.treatments || null,
                  customerNeeds: parsed.trends.consensusJSON?.customerNeeds || null,
                  sources: parsed.trends.consensusJSON?.sources || null,
                } as Record<string, unknown>
              : null;
          })
          .filter((data): data is Record<string, unknown> => data !== null);

        // SNSデータを取得（構造化データとして）
        const snsResults = await db.sNSResearchResult.findMany({
          where: { userId: input.userId },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        const aggregatedSNS = aggregateSNSResearchData(
          snsResults.map((r) => ({
            platform: r.platform,
            trendData: r.trendData,
            aiAgent: r.aiAgent,
            createdAt: r.createdAt,
          })),
        );

        const snsData = aggregatedSNS.map((data) => ({
          platform: data.platform,
          consensusJSON: data.consensusJSON,
          reportMarkdown: data.reportMarkdown,
          rawText: data.rawText,
          aiAgent: data.aiAgent,
          createdAt: data.createdAt.toISOString(),
          hashtags: data.consensusJSON?.hashtags || null,
          influencers: data.consensusJSON?.influencers || null,
          topPosts: data.consensusJSON?.top_posts || data.consensusJSON?.top_videos || null,
          engagementTrends: data.consensusJSON?.engagement_trends || null,
          audienceSignals: data.consensusJSON?.audience_signals || null,
          sources: data.consensusJSON?.sources || null,
        }));

        // データが空の場合のチェック
        if (trends.length === 0 && snsData.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "市場トレンドデータまたはSNSデータが必要です。まず市場調査またはSNS調査を実行してください。",
          });
        }

        console.log(`[Campaign Proposals] trends: ${trends.length}件, snsData: ${snsData.length}件`);

        // AI APIでキャンペーン案を生成（ユーザー設定に基づいてClaude/ChatGPTを選択）
        const aiProvider = await getStrategyAIProvider(input.userId);
        console.log(`[Strategy] Using AI provider: ${aiProvider} (userId: ${input.userId})`);

        let result: string;
        try {
          result = aiProvider === "chatgpt"
            ? await chatgptGenerateCampaignProposals(trends, snsData)
            : await claudeGenerateCampaignProposals(trends, snsData);
        } catch (error) {
          console.error("[Campaign Proposals] Generation error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error 
              ? `キャンペーン案の生成に失敗しました: ${error.message}`
              : "キャンペーン案の生成に失敗しました",
          });
        }

        if (!result || typeof result !== "string" || result.trim().length === 0) {
          console.error("[Campaign Proposals] Empty result received");
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "キャンペーン案の生成に失敗しました。結果が空です。",
          });
        }

        // データベースに保存
        const saved = await db.strategyRecommendation.create({
          data: {
            userId: input.userId,
            marketingStrategy: null,
            priceRecommendations: null,
            campaignProposals: result, // キャンペーン案を保存
            newTreatmentSuggestions: null,
          },
        });

        return {
          id: saved.id,
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

        // 市場トレンドを取得（構造化データとして）
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
            if (!result.processedData) {
              return null;
            }
            const parsed = aggregateMarketResearchData([
              {
                researchType: "trend_analysis",
                processedData: result.processedData,
                aiAgent: result.aiAgent,
                createdAt: result.createdAt,
              },
            ]);
            
            return parsed.trends
              ? {
                  consensusJSON: parsed.trends.consensusJSON,
                  reportMarkdown: parsed.trends.reportMarkdown,
                  rawText: parsed.trends.rawText,
                  aiAgent: parsed.trends.aiAgent,
                  createdAt: parsed.trends.createdAt.toISOString(),
                  treatments: parsed.trends.consensusJSON?.treatments || null,
                  customerNeeds: parsed.trends.consensusJSON?.customerNeeds || null,
                  sources: parsed.trends.consensusJSON?.sources || null,
                } as Record<string, unknown>
              : null;
          })
          .filter((data): data is Record<string, unknown> => data !== null);

        // SNSトレンドを取得（構造化データとして）
        const snsResults = await db.sNSResearchResult.findMany({
          where: { userId: input.userId },
          orderBy: { createdAt: "desc" },
          take: 10,
        });

        const aggregatedSNS = aggregateSNSResearchData(
          snsResults.map((r) => ({
            platform: r.platform,
            trendData: r.trendData,
            aiAgent: r.aiAgent,
            createdAt: r.createdAt,
          })),
        );

        const snsTrends = aggregatedSNS.map((data) => ({
          platform: data.platform,
          consensusJSON: data.consensusJSON,
          reportMarkdown: data.reportMarkdown,
          rawText: data.rawText,
          aiAgent: data.aiAgent,
          createdAt: data.createdAt.toISOString(),
          hashtags: data.consensusJSON?.hashtags || null,
          influencers: data.consensusJSON?.influencers || null,
          topPosts: data.consensusJSON?.top_posts || data.consensusJSON?.top_videos || null,
          engagementTrends: data.consensusJSON?.engagement_trends || null,
          audienceSignals: data.consensusJSON?.audience_signals || null,
          sources: data.consensusJSON?.sources || null,
        }));

        // データが空の場合のチェック
        if (products.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "商品データが必要です。まず商品を登録してください。",
          });
        }

        if (marketTrends.length === 0 && snsTrends.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "市場トレンドデータまたはSNSトレンドデータが必要です。まず市場調査またはSNS調査を実行してください。",
          });
        }

        console.log(`[New Treatments] products: ${products.length}件, marketTrends: ${marketTrends.length}件, snsTrends: ${snsTrends.length}件`);

        // AI APIで新施術提案を生成（ユーザー設定に基づいてClaude/ChatGPTを選択）
        const aiProvider = await getStrategyAIProvider(input.userId);
        console.log(`[Strategy] Using AI provider: ${aiProvider} (userId: ${input.userId})`);

        let result: string;
        try {
          result = aiProvider === "chatgpt"
            ? await chatgptSuggestNewTreatments(
                products.map((p) => ({
                  name: p.name,
                  category: p.category,
                })),
                marketTrends,
                snsTrends,
              )
            : await claudeSuggestNewTreatments(
                products.map((p) => ({
                  name: p.name,
                  category: p.category,
                })),
                marketTrends,
                snsTrends,
              );
        } catch (error) {
          console.error("[New Treatments] Generation error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error 
              ? `新施術提案の生成に失敗しました: ${error.message}`
              : "新施術提案の生成に失敗しました",
          });
        }

        if (!result || typeof result !== "string" || result.trim().length === 0) {
          console.error("[New Treatments] Empty result received");
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "新施術提案の生成に失敗しました。結果が空です。",
          });
        }

        // データベースに保存
        const saved = await db.strategyRecommendation.create({
          data: {
            userId: input.userId,
            marketingStrategy: null,
            priceRecommendations: null,
            campaignProposals: null,
            newTreatmentSuggestions: result, // 新施術提案を保存
          },
        });

        return {
          id: saved.id,
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
      try {
        return await db.strategyRecommendation.findMany({
          where: { userId: input.userId },
          orderBy: { createdAt: "desc" },
        });
      } catch (error) {
        console.error("Strategy list query error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? `戦略提案履歴の取得に失敗しました: ${error.message}`
              : "戦略提案履歴の取得に失敗しました",
        });
      }
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

  // ユーザー設定の取得
  getUserSettings: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
      }),
    )
    .query(async ({ input }) => {
      try {
        let userSettings = await db.userSettings.findUnique({
          where: { userId: input.userId },
        });

        // ユーザー設定が存在しない場合はデフォルト値で作成
        if (!userSettings) {
          userSettings = await db.userSettings.create({
            data: {
              userId: input.userId,
              strategyAIProvider: "chatgpt",
            },
          });
        }

        return {
          strategyAIProvider: userSettings.strategyAIProvider as "claude" | "chatgpt",
        };
      } catch (error) {
        console.error("Failed to get user settings:", error);
        // エラー時はデフォルト値を返す
        return {
          strategyAIProvider: "chatgpt" as const,
        };
      }
    }),

  // ユーザー設定の更新
  updateUserSettings: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        strategyAIProvider: z.enum(["claude", "chatgpt"]),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        console.log(`[updateUserSettings] Updating settings for userId=${input.userId}, provider=${input.strategyAIProvider}`);
        
        const userSettings = await db.userSettings.upsert({
          where: { userId: input.userId },
          update: {
            strategyAIProvider: input.strategyAIProvider,
          },
          create: {
            userId: input.userId,
            strategyAIProvider: input.strategyAIProvider,
          },
        });

        console.log(`[updateUserSettings] Successfully updated:`, userSettings);

        return {
          success: true,
          strategyAIProvider: userSettings.strategyAIProvider as "claude" | "chatgpt",
          message: "設定を更新しました",
        };
      } catch (error) {
        console.error("[updateUserSettings] Failed to update user settings:", error);
        console.error("[updateUserSettings] Error details:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          input,
        });
        
        const errorMessage = error instanceof Error 
          ? `設定の更新に失敗しました: ${error.message}`
          : "設定の更新に失敗しました";
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: errorMessage,
          cause: error,
        });
      }
    }),
});

