import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { z } from "zod";

import {
  analyzeMarketPosition as claudeAnalyzeMarketPosition,
  generateCampaignProposals as claudeGenerateCampaignProposals,
  generatePriceRecommendations as claudeGeneratePriceRecommendations,
  suggestNewTreatments as claudeSuggestNewTreatments,
  getCurrentClaudeModel,
} from "@/server/services/claude";

import {
  analyzeMarketPosition as chatgptAnalyzeMarketPosition,
  generateCampaignProposals as chatgptGenerateCampaignProposals,
  generatePriceRecommendations as chatgptGeneratePriceRecommendations,
  suggestNewTreatments as chatgptSuggestNewTreatments,
  getCurrentChatGPTModel,
} from "@/server/services/chatgpt";

import { publicProcedure, router } from "../trpc";

/**
 * ユーザー設定に基づいて使用するAIプロバイダーを決定
 * ユーザー設定がない場合は環境変数STRATEGY_AI_PROVIDERを確認
 * どちらもない場合はChatGPT APIを使用（デフォルト）
 */
async function getStrategyAIProvider(userId: number): Promise<"claude" | "chatgpt"> {
  try {
    // ユーザー設定を取得
    // PrismaクライアントにuserSettingsプロパティが存在するか確認
    if (!("userSettings" in db)) {
      console.warn("Prisma client does not have userSettings property. Using default provider.");
      const provider = process.env.STRATEGY_AI_PROVIDER?.toLowerCase();
      return provider === "claude" ? "claude" : "chatgpt";
    }

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error details:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      userId,
    });
    // エラーが発生した場合はデフォルトを使用
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

        // AI APIで価格設定提案を実行（ユーザー設定に基づいてClaude/ChatGPTを選択）
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
        await db.strategyRecommendation.create({
          data: {
            userId: input.userId,
            priceRecommendations: result,
            campaignProposals: null,
            newTreatmentSuggestions: null,
            marketingStrategy: null,
          },
        });

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

        // AI APIでキャンペーン案を生成（ユーザー設定に基づいてClaude/ChatGPTを選択）
        const aiProvider = await getStrategyAIProvider(input.userId);
        console.log(`[Strategy] Using AI provider: ${aiProvider} (userId: ${input.userId})`);

        const result = aiProvider === "chatgpt"
          ? await chatgptGenerateCampaignProposals(trends, snsData)
          : await claudeGenerateCampaignProposals(trends, snsData);

        // データベースに保存
        await db.strategyRecommendation.create({
          data: {
            userId: input.userId,
            priceRecommendations: null,
            campaignProposals: result,
            newTreatmentSuggestions: null,
            marketingStrategy: null,
          },
        });

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

        // AI APIで新施術提案を実行（ユーザー設定に基づいてClaude/ChatGPTを選択）
        const aiProvider = await getStrategyAIProvider(input.userId);
        console.log(`[Strategy] Using AI provider: ${aiProvider} (userId: ${input.userId})`);

        const result = aiProvider === "chatgpt"
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

        // データベースに保存
        await db.strategyRecommendation.create({
          data: {
            userId: input.userId,
            priceRecommendations: null,
            campaignProposals: null,
            newTreatmentSuggestions: result,
            marketingStrategy: null,
          },
        });

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

  getCurrentModel: publicProcedure
    .input(
      z.object({
        functionType: z.enum(["analyzeMarketPosition", "suggestNewTreatments", "generatePriceRecommendations", "generateCampaignProposals"]).optional(),
        userId: z.number().int().positive().optional(),
      }),
    )
    .query(async ({ input }) => {
      // ユーザー設定に基づいてAIプロバイダーを決定
      const userId = input.userId || 1; // デフォルトは1
      const aiProvider = await getStrategyAIProvider(userId);

      if (aiProvider === "chatgpt") {
        return {
          aiAgent: "chatgpt" as const,
          model: getCurrentChatGPTModel() || "gpt-5.1",
        };
      }

      // Claudeの場合
      // 総合分析・新規導入提案はOpus 4.1
      if (input.functionType === "analyzeMarketPosition" || input.functionType === "suggestNewTreatments") {
        return {
          aiAgent: "claude" as const,
          model: getCurrentClaudeModel("opus") || "claude-opus-4-1",
        };
      }
      // 価格設定提案・キャンペーン案はSonnet 4.5
      if (input.functionType === "generatePriceRecommendations" || input.functionType === "generateCampaignProposals") {
        return {
          aiAgent: "claude" as const,
          model: getCurrentClaudeModel("sonnet") || "claude-sonnet-4-5-20250929",
        };
      }
      // デフォルト（総合分析）
      return {
        aiAgent: "claude" as const,
        model: getCurrentClaudeModel("opus") || "claude-opus-4-1",
      };
    }),

  getUserSettings: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
      }),
    )
    .query(async ({ input }) => {
      try {
        // PrismaクライアントにuserSettingsプロパティが存在するか確認
        if (!("userSettings" in db)) {
          console.warn("Prisma client does not have userSettings property. Returning default settings.");
          // デフォルト設定を返す
          return {
            userId: input.userId,
            strategyAIProvider: "chatgpt",
          };
        }

        const userSettings = await db.userSettings.findUnique({
          where: { userId: input.userId },
        });

        if (!userSettings) {
          // デフォルト設定を返す
          return {
            userId: input.userId,
            strategyAIProvider: "chatgpt",
          };
        }

        return {
          userId: userSettings.userId,
          strategyAIProvider: userSettings.strategyAIProvider,
        };
      } catch (error) {
        console.error("Failed to get user settings:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error details:", {
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          userId: input.userId,
          dbHasUserSettings: "userSettings" in db,
        });
        
        // エラーが発生した場合はデフォルト設定を返す（エラーを投げない）
        console.warn("Returning default settings due to error");
        return {
          userId: input.userId,
          strategyAIProvider: "chatgpt",
        };
      }
    }),

  updateUserSettings: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        strategyAIProvider: z.enum(["claude", "chatgpt"]),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // PrismaクライアントにuserSettingsプロパティが存在するか確認
        if (!("userSettings" in db)) {
          const errorMsg = "Prisma client does not have userSettings property. Please restart the server after running 'npx prisma generate'.";
          console.error(errorMsg);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `ユーザー設定の更新に失敗しました: ${errorMsg}`,
          });
        }

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

        return {
          userId: userSettings.userId,
          strategyAIProvider: userSettings.strategyAIProvider,
        };
      } catch (error) {
        console.error("Failed to update user settings:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error details:", {
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          userId: input.userId,
          strategyAIProvider: input.strategyAIProvider,
          dbHasUserSettings: "userSettings" in db,
        });
        
        // TRPCErrorの場合はそのまま投げる
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `ユーザー設定の更新に失敗しました: ${errorMessage}`,
        });
      }
    }),
});

