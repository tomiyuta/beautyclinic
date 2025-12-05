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

import {
  analyzeMarketPosition as geminiAnalyzeMarketPosition,
  generateCampaignProposals as geminiGenerateCampaignProposals,
  generatePriceRecommendations as geminiGeneratePriceRecommendations,
  suggestNewTreatments as geminiSuggestNewTreatments,
  getCurrentGeminiModel,
} from "@/server/services/gemini";

import { publicProcedure, router } from "../trpc";
import { runCouncil } from "@/server/services/ai-council";
import {
  councilConfigSchema,
  strategyCouncilInputSchema,
  strategySingleInputSchema,
  analysisTypeSchema,
} from "../schemas/council";
import type { CouncilResult, CouncilModel } from "@/types/ai-council";
// 新規サービスのインポート
import { buildPromptForAnalysisType } from "@/server/services/strategy/prompt-builder";
import { fetchStrategyData, fetchDataStatus } from "@/server/services/strategy/data-fetcher";
import { callAIWithTimeout } from "@/server/services/strategy/ai-caller";
import { runStrategyCouncil } from "@/server/services/ai-council/council";
import { getQueryForAnalysisType } from "@/server/services/ai-council/prompts";

/**
 * ユーザー設定に基づいて使用するAIプロバイダーを決定
 * ユーザー設定がない場合は環境変数STRATEGY_AI_PROVIDERを確認
 * どちらもない場合はChatGPT APIを使用（デフォルト）
 */
async function getStrategyAIProvider(userId: number): Promise<"claude" | "chatgpt" | "gemini"> {
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
      if (provider === "chatgpt" || provider === "claude" || provider === "gemini") {
        return provider as "claude" | "chatgpt" | "gemini";
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
  if (provider === "claude") return "claude";
  if (provider === "gemini") return "gemini";
  return "chatgpt";
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
        marketDataSelection: z.object({
          trendIds: z.array(z.number()).optional(),
          priceIds: z.array(z.number()).optional(),
          competitorIds: z.array(z.number()).optional(),
        }).optional(),
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

        // 市場調査データを取得（複数選択対応）
        const marketData: {
          trends: Array<{ source: string; date: string; data: any }> | null;
          pricing: Array<{ source: string; date: string; data: any }> | null;
          competitors: Array<{ source: string; date: string; data: any }> | null;
        } = { trends: null, pricing: null, competitors: null };
        
        if (input.includeMarketData) {
          // テキスト形式のデータをJSON形式に変換するヘルパー関数
          const convertMarketDataToJSON = (text: string, type: string): any => {
            try {
              return JSON.parse(text);
            } catch {
              // テキスト形式の場合はJSON形式に変換（長文の場合は5000文字に制限）
              const truncatedText = text.length > 5000 ? text.substring(0, 5000) + "..." : text;
              return {
                type: type,
                text: truncatedText,
                summary: text.length > 5000 ? "データが長いため要約されています" : undefined,
                originalLength: text.length,
              };
            }
          };

          // 複数選択されたIDがある場合は、それらを取得
          if (input.marketDataSelection) {
            const { trendIds, priceIds, competitorIds } = input.marketDataSelection;
            
            // トレンド分析データ
            if (trendIds && trendIds.length > 0) {
              const trendResults = await db.marketResearchResult.findMany({
                where: { 
                  userId: input.userId,
                  id: { in: trendIds },
                  researchType: "trend_analysis"
                },
                orderBy: { createdAt: "desc" },
              });
              marketData.trends = trendResults.map(result => ({
                source: result.aiAgent,
                date: result.createdAt.toISOString(),
                data: result.processedData ? convertMarketDataToJSON(result.processedData, result.researchType) : null,
              }));
            }
            
            // 価格調査データ
            if (priceIds && priceIds.length > 0) {
              const priceResults = await db.marketResearchResult.findMany({
                where: { 
                  userId: input.userId,
                  id: { in: priceIds },
                  researchType: "price_research"
                },
                orderBy: { createdAt: "desc" },
              });
              marketData.pricing = priceResults.map(result => ({
                source: result.aiAgent,
                date: result.createdAt.toISOString(),
                data: result.processedData ? convertMarketDataToJSON(result.processedData, result.researchType) : null,
              }));
            }
            
            // 競合分析データ
            if (competitorIds && competitorIds.length > 0) {
              const competitorResults = await db.marketResearchResult.findMany({
                where: { 
                  userId: input.userId,
                  id: { in: competitorIds },
                  researchType: "competitor_analysis"
                },
                orderBy: { createdAt: "desc" },
              });
              marketData.competitors = competitorResults.map(result => ({
                source: result.aiAgent,
                date: result.createdAt.toISOString(),
                data: result.processedData ? convertMarketDataToJSON(result.processedData, result.researchType) : null,
              }));
            }
          } else {
            // 従来通り最新データを取得（後方互換性）
            const marketResults = await db.marketResearchResult.findMany({
              where: { userId: input.userId },
              orderBy: { createdAt: "desc" },
              take: 10,
            });

            const singleMarketData: {
              trends: string | Record<string, unknown> | null;
              pricing: string | Record<string, unknown> | null;
              competitors: string | Record<string, unknown> | null;
            } = { trends: null, pricing: null, competitors: null };

            marketResults.forEach((result) => {
              if (result.processedData) {
                const parsed = convertMarketDataToJSON(result.processedData, result.researchType);
                if (result.researchType === "trend_analysis" && !singleMarketData.trends) {
                  singleMarketData.trends = parsed;
                } else if (result.researchType === "price_research" && !singleMarketData.pricing) {
                  singleMarketData.pricing = parsed;
                } else if (result.researchType === "competitor_analysis" && !singleMarketData.competitors) {
                  singleMarketData.competitors = parsed;
                }
              }
            });

            // 単一データを配列形式に変換
            marketData.trends = singleMarketData.trends ? [{ 
              source: "auto", 
              date: new Date().toISOString(), 
              data: singleMarketData.trends 
            }] : null;
            marketData.pricing = singleMarketData.pricing ? [{ 
              source: "auto", 
              date: new Date().toISOString(), 
              data: singleMarketData.pricing 
            }] : null;
            marketData.competitors = singleMarketData.competitors ? [{ 
              source: "auto", 
              date: new Date().toISOString(), 
              data: singleMarketData.competitors 
            }] : null;
          }
        }

        // SNS調査データを取得
        let snsData: Array<string | Record<string, unknown>> = [];
        if (input.includeSNSData) {
          const snsResults = await db.sNSResearchResult.findMany({
            where: { userId: input.userId },
            orderBy: { createdAt: "desc" },
            take: 10,
          });

          // テキスト形式のデータをJSON形式に変換するヘルパー関数
          const convertSNSDataToJSON = (text: string, platform: string, aiAgent: string): Record<string, unknown> => {
            // TikTok、YouTube、Instagramの場合は<CONSENSUS_JSON>セクションを抽出
            if (platform === "tiktok" || platform === "youtube" || platform === "instagram") {
              const consensusMatch = text.match(/<CONSENSUS_JSON>([\s\S]*?)<\/CONSENSUS_JSON>/);
              if (consensusMatch) {
                try {
                  const parsed = JSON.parse(consensusMatch[1]!.trim());
                  return {
                    ...parsed,
                    platform: platform,
                    aiAgent: aiAgent,
                  };
                } catch {
                  // JSONパースに失敗した場合は、テキストをJSON形式に変換
                  const truncatedText = consensusMatch[1]!.trim().length > 5000 
                    ? consensusMatch[1]!.trim().substring(0, 5000) + "..." 
                    : consensusMatch[1]!.trim();
                  return {
                    platform: platform,
                    aiAgent: aiAgent,
                    text: truncatedText,
                    summary: consensusMatch[1]!.trim().length > 5000 ? "データが長いため要約されています" : undefined,
                    originalLength: consensusMatch[1]!.trim().length,
                  };
                }
              }
            }
            
            // 既にJSON形式の場合はそのまま使用
            try {
              const parsed = JSON.parse(text);
              if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
                return {
                  ...parsed,
                  platform: platform,
                  aiAgent: aiAgent,
                };
              }
              // 配列の場合はオブジェクトにラップ
              return {
                platform: platform,
                aiAgent: aiAgent,
                data: parsed,
              };
            } catch {
              // テキスト形式の場合はJSON形式に変換（長文の場合は5000文字に制限）
              const truncatedText = text.length > 5000 ? text.substring(0, 5000) + "..." : text;
              return {
                platform: platform,
                aiAgent: aiAgent,
                text: truncatedText,
                summary: text.length > 5000 ? "データが長いため要約されています" : undefined,
                originalLength: text.length,
              };
            }
          };

          snsData = snsResults
            .map((result: { platform: string; aiAgent: string; trendData: string | null }) => {
              if (!result.trendData) {
                return null;
              }
              // JSON形式のみで統一
              return convertSNSDataToJSON(result.trendData, result.platform, result.aiAgent);
            })
            .filter((data): data is Record<string, unknown> => data !== null);
        }

        // AI APIで総合分析を実行（ユーザー設定に基づいてClaude/ChatGPT/Geminiを選択）
        const aiProvider = await getStrategyAIProvider(input.userId);
        console.log(`[Strategy] Using AI provider: ${aiProvider} (userId: ${input.userId})`);

        const productData = products.map((p) => ({
          name: p.name,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          category: p.category,
        }));

        // marketDataを単一オブジェクト形式に変換（ChatGPT/Claude/Gemini用）
        const singleMarketData = {
          trends: marketData.trends?.[0]?.data || null,
          pricing: marketData.pricing?.[0]?.data || null,
          competitors: marketData.competitors?.[0]?.data || null,
        };

        let result: string;
        if (aiProvider === "chatgpt") {
          result = await chatgptAnalyzeMarketPosition(productData, singleMarketData, snsData, input.location);
        } else if (aiProvider === "gemini") {
          result = await geminiAnalyzeMarketPosition(productData, singleMarketData, snsData, input.location);
        } else {
          result = await claudeAnalyzeMarketPosition(productData, singleMarketData, snsData, input.location);
        }

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
              // データを直接渡す（ラッパーを削除してトークン量を削減）
              // JSON形式の場合はパース、テキスト形式の場合はそのまま
              try {
                // JSON形式の場合はパースして返す
                return JSON.parse(result.processedData) as Record<string, unknown>;
              } catch {
                // テキスト形式の場合はそのまま返す
                return { text: result.processedData } as Record<string, unknown>;
              }
            }
            return null;
          })
          .filter((data): data is Record<string, unknown> => data !== null);

        const marketPricing: Record<string, unknown> =
          marketPricingArray.length > 0
            ? { data: marketPricingArray }
            : {};

        // AI APIで価格設定提案を実行（ユーザー設定に基づいてClaude/ChatGPT/Geminiを選択）
        const aiProvider = await getStrategyAIProvider(input.userId);
        console.log(`[Strategy] Using AI provider: ${aiProvider} (userId: ${input.userId})`);

        const productData = products.map((p) => ({
          name: p.name,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          category: p.category,
        }));

        let result: string;
        if (aiProvider === "chatgpt") {
          result = await chatgptGeneratePriceRecommendations(productData, marketPricing);
        } else if (aiProvider === "gemini") {
          result = await geminiGeneratePriceRecommendations(productData, marketPricing);
        } else {
          result = await claudeGeneratePriceRecommendations(productData, marketPricing);
        }

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
              // データを直接渡す（ラッパーを削除してトークン量を削減）
              try {
                // JSON形式の場合はパースして返す
                return JSON.parse(result.processedData);
              } catch {
                // テキスト形式の場合はそのまま返す
                return result.processedData;
              }
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

        // テキスト形式のデータをJSON形式に変換するヘルパー関数（generateCampaignProposals用）
        const convertSNSDataToJSONForCampaign = (text: string, platform: string, aiAgent: string): Record<string, unknown> => {
          if (platform === "tiktok" || platform === "youtube" || platform === "instagram") {
            const consensusMatch = text.match(/<CONSENSUS_JSON>([\s\S]*?)<\/CONSENSUS_JSON>/);
            if (consensusMatch) {
              try {
                const parsed = JSON.parse(consensusMatch[1]!.trim());
                return {
                  ...parsed,
                  platform: platform,
                  aiAgent: aiAgent,
                };
              } catch {
                const truncatedText = consensusMatch[1]!.trim().length > 5000 
                  ? consensusMatch[1]!.trim().substring(0, 5000) + "..." 
                  : consensusMatch[1]!.trim();
                return {
                  platform: platform,
                  aiAgent: aiAgent,
                  text: truncatedText,
                  summary: consensusMatch[1]!.trim().length > 5000 ? "データが長いため要約されています" : undefined,
                  originalLength: consensusMatch[1]!.trim().length,
                };
              }
            }
          }
          
          try {
            const parsed = JSON.parse(text);
            if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
              return {
                ...parsed,
                platform: platform,
                aiAgent: aiAgent,
              };
            }
            return {
              platform: platform,
              aiAgent: aiAgent,
              data: parsed,
            };
          } catch {
            const truncatedText = text.length > 5000 ? text.substring(0, 5000) + "..." : text;
            return {
              platform: platform,
              aiAgent: aiAgent,
              text: truncatedText,
              summary: text.length > 5000 ? "データが長いため要約されています" : undefined,
              originalLength: text.length,
            };
          }
        };

        const snsData = snsResults
          .map((result) => {
            if (!result.trendData) {
              return null;
            }
            // JSON形式のみで統一
            return convertSNSDataToJSONForCampaign(result.trendData, result.platform, result.aiAgent);
          })
          .filter((data): data is Record<string, unknown> => data !== null);

        // AI APIでキャンペーン案を生成（ユーザー設定に基づいてClaude/ChatGPT/Geminiを選択）
        const aiProvider = await getStrategyAIProvider(input.userId);
        console.log(`[Strategy] Using AI provider: ${aiProvider} (userId: ${input.userId})`);

        let result: string;
        if (aiProvider === "chatgpt") {
          result = await chatgptGenerateCampaignProposals(trends, snsData);
        } else if (aiProvider === "gemini") {
          result = await geminiGenerateCampaignProposals(trends, snsData);
        } else {
          result = await claudeGenerateCampaignProposals(trends, snsData);
        }

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

        // テキスト形式のデータをJSON形式に変換するヘルパー関数（suggestNewTreatments用）
        const convertSNSDataToJSONForTreatment = (text: string, platform: string, aiAgent: string): Record<string, unknown> => {
          if (platform === "tiktok" || platform === "youtube" || platform === "instagram") {
            const consensusMatch = text.match(/<CONSENSUS_JSON>([\s\S]*?)<\/CONSENSUS_JSON>/);
            if (consensusMatch) {
              try {
                const parsed = JSON.parse(consensusMatch[1]!.trim());
                return {
                  ...parsed,
                  platform: platform,
                  aiAgent: aiAgent,
                };
              } catch {
                const truncatedText = consensusMatch[1]!.trim().length > 5000 
                  ? consensusMatch[1]!.trim().substring(0, 5000) + "..." 
                  : consensusMatch[1]!.trim();
                return {
                  platform: platform,
                  aiAgent: aiAgent,
                  text: truncatedText,
                  summary: consensusMatch[1]!.trim().length > 5000 ? "データが長いため要約されています" : undefined,
                  originalLength: consensusMatch[1]!.trim().length,
                };
              }
            }
          }
          
          try {
            const parsed = JSON.parse(text);
            if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
              return {
                ...parsed,
                platform: platform,
                aiAgent: aiAgent,
              };
            }
            return {
              platform: platform,
              aiAgent: aiAgent,
              data: parsed,
            };
          } catch {
            const truncatedText = text.length > 5000 ? text.substring(0, 5000) + "..." : text;
            return {
              platform: platform,
              aiAgent: aiAgent,
              text: truncatedText,
              summary: text.length > 5000 ? "データが長いため要約されています" : undefined,
              originalLength: text.length,
            };
          }
        };

        const snsTrends = snsResults
          .map((result) => {
            if (!result.trendData) {
              return null;
            }
            // JSON形式のみで統一
            return convertSNSDataToJSONForTreatment(result.trendData, result.platform, result.aiAgent);
          })
          .filter((data): data is Record<string, unknown> => data !== null);

        // AI APIで新施術提案を実行（ユーザー設定に基づいてClaude/ChatGPT/Geminiを選択）
        const aiProvider = await getStrategyAIProvider(input.userId);
        console.log(`[Strategy] Using AI provider: ${aiProvider} (userId: ${input.userId})`);

        const treatmentData = products.map((p) => ({
          name: p.name,
          category: p.category,
        }));

        let result: string;
        if (aiProvider === "chatgpt") {
          result = await chatgptSuggestNewTreatments(treatmentData, marketTrends, snsTrends);
        } else if (aiProvider === "gemini") {
          result = await geminiSuggestNewTreatments(treatmentData, marketTrends, snsTrends);
        } else {
          result = await claudeSuggestNewTreatments(treatmentData, marketTrends, snsTrends);
        }

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

      if (aiProvider === "gemini") {
        return {
          aiAgent: "gemini" as const,
          model: getCurrentGeminiModel() || "gemini-2.5-pro",
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
        strategyAIProvider: z.enum(["claude", "chatgpt", "gemini"]),
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

  /**
   * Council戦略分析（合議制）- 統合版
   */
  runCouncilAnalysis: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        analysisType: analysisTypeSchema,
        councilConfig: councilConfigSchema,
        // オプション: 手動でデータを指定する場合（未指定時はDBから取得）
        marketData: z.any().optional(),
        snsData: z.any().optional(),
        products: z.array(z.any()).optional(),
        marketDataSelection: z.object({
          trendIds: z.array(z.number()).optional(),
          priceIds: z.array(z.number()).optional(),
          competitorIds: z.array(z.number()).optional(),
        }).optional(),
      })
    )
    .mutation(async ({ input }): Promise<CouncilResult> => {
      const { userId, analysisType, councilConfig, marketData, snsData, products } = input;

      console.log(`[Strategy] Council analysis: ${analysisType}`);

      // 1. データ取得（DB or 手動指定）
      let data;
      if (products || marketData || snsData) {
        // 手動指定されたデータを使用
        const dbData = await fetchStrategyData(userId, input.marketDataSelection);
        data = {
          products: products?.map((p: any) => ({
            id: p.id ?? 0,
            name: p.name ?? p.treatment ?? "",
            category: p.category ?? "未分類",
            price: p.price ?? p.sellingPrice ?? 0,
            description: p.description,
          })) ?? dbData.products,
          marketData: marketData ? {
            id: 0,
            location: dbData.marketData?.location ?? "",
            competitors: marketData.competitors,
            priceRanges: marketData.pricing ?? marketData.priceRanges,
            trends: marketData.trends,
            createdAt: new Date(),
          } : dbData.marketData,
          snsData: snsData ? {
            id: 0,
            keywords: [],
            instagramData: null,
            twitterData: null,
            tiktokData: null,
            trends: snsData,
            createdAt: new Date(),
          } : dbData.snsData,
          location: dbData.location,
        };
      } else {
        // DBから取得
        data = await fetchStrategyData(userId, input.marketDataSelection);
      }

      // 2. プロンプト生成（既存の詳細プロンプト）
      const prompt = await buildPromptForAnalysisType(analysisType, data);

      // 3. 元のクエリ（分析タイプ名）
      const originalQuery = getQueryForAnalysisType(analysisType);

      // 4. バリデーション: 議長「自動」選択時はピアレビュー必須
      const finalConfig = {
        ...councilConfig,
        enablePeerReview:
          councilConfig.chairmanMode === "auto"
            ? true
            : councilConfig.enablePeerReview,
      };

      // 5. Council実行
      const result = await runStrategyCouncil(
        prompt,
        originalQuery,
        analysisType,
        finalConfig
      );

      // 6. 結果保存
      await saveCouncilResult(db, userId, analysisType, result);

      return result;
    }),

  /**
   * 単一AI戦略分析（統合版）
   */
  runSingleAnalysis: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        analysisType: analysisTypeSchema,
        aiProvider: z.enum(["claude", "chatgpt", "gemini", "grok"]),
        // オプション: 手動でデータを指定する場合（未指定時はDBから取得）
        marketData: z.any().optional(),
        snsData: z.any().optional(),
        products: z.array(z.any()).optional(),
        marketDataSelection: z.object({
          trendIds: z.array(z.number()).optional(),
          priceIds: z.array(z.number()).optional(),
          competitorIds: z.array(z.number()).optional(),
        }).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { userId, analysisType, aiProvider, marketData, snsData, products } = input;
      const startTime = Date.now();

      console.log(`[Strategy] Single analysis: ${analysisType} with ${aiProvider}`);

      // 1. データ取得（DB or 手動指定）
      let data;
      if (products || marketData || snsData) {
        // 手動指定されたデータを使用
        const dbData = await fetchStrategyData(userId, input.marketDataSelection);
        data = {
          products: products?.map((p: any) => ({
            id: p.id ?? 0,
            name: p.name ?? p.treatment ?? "",
            category: p.category ?? "未分類",
            price: p.price ?? p.sellingPrice ?? 0,
            description: p.description,
          })) ?? dbData.products,
          marketData: marketData ? {
            id: 0,
            location: dbData.marketData?.location ?? "",
            competitors: marketData.competitors,
            priceRanges: marketData.pricing ?? marketData.priceRanges,
            trends: marketData.trends,
            createdAt: new Date(),
          } : dbData.marketData,
          snsData: snsData ? {
            id: 0,
            keywords: [],
            instagramData: null,
            twitterData: null,
            tiktokData: null,
            trends: snsData,
            createdAt: new Date(),
          } : dbData.snsData,
          location: dbData.location,
        };
      } else {
        // DBから取得
        data = await fetchStrategyData(userId, input.marketDataSelection);
      }

      // 2. プロンプト生成（既存の詳細プロンプト）
      const prompt = await buildPromptForAnalysisType(analysisType, data);

      // 3. AI呼び出し
      const content = await callAIWithTimeout(aiProvider, prompt, 60000);

      // 4. 結果保存
      await saveAnalysisResult(db, userId, analysisType, content, aiProvider, "single");

      return {
        content,
        aiProvider,
        durationMs: Date.now() - startTime,
      };
    }),

  /**
   * データ状態確認
   */
  getDataStatus: publicProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return fetchDataStatus(input.userId);
    }),

  getMarketResearchHistory: publicProcedure
    .input(z.object({ 
      userId: z.number().int().positive(),
      limit: z.number().optional().default(20)
    }))
    .query(async ({ input }) => {
      const results = await db.marketResearchResult.findMany({
        where: { userId: input.userId },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        select: {
          id: true,
          researchType: true,
          aiAgent: true,
          location: true,
          createdAt: true,
          processedData: true,
        },
      });

      return results.map(result => ({
        id: result.id,
        researchType: result.researchType,
        aiAgent: result.aiAgent,
        location: result.location,
        createdAt: result.createdAt,
        preview: result.processedData ? 
          (result.processedData.length > 100 ? 
            result.processedData.substring(0, 100) + "..." : 
            result.processedData) : 
          "データなし",
        tokenCount: result.processedData ? Math.ceil(result.processedData.length / 4) : 0,
      }));
    }),

  getHistory: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        implementationStatus: z
          .enum(["pending", "in_progress", "completed"])
          .optional(),
      }),
    )
    .query(async ({ input }) => {
      const where = {
        userId: input.userId,
        ...(input.implementationStatus && {
          implementationStatus: input.implementationStatus,
        }),
      };

      const strategies = await db.strategyRecommendation.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      // 各戦略に関連する生成コンテンツを取得
      const strategiesWithContents = await Promise.all(
        strategies.map(async (strategy) => {
          const relatedContents = await db.generatedContent.findMany({
            where: {
              userId: input.userId,
              strategyId: strategy.id,
            },
            orderBy: { createdAt: "desc" },
          });

          // 提案内容の要約を生成（テキスト形式として扱う）
          let priceRecommendationsCount = strategy.priceRecommendations ? 1 : 0;
          let campaignProposalsCount = strategy.campaignProposals ? 1 : 0;
          let newTreatmentSuggestionsCount = strategy.newTreatmentSuggestions ? 1 : 0;

          return {
            ...strategy,
            relatedContents,
            summary: {
              priceRecommendationsCount,
              campaignProposalsCount,
              newTreatmentSuggestionsCount,
              totalContents: relatedContents.length,
            },
          };
        }),
      );

      return strategiesWithContents;
    }),
});

// ============================================================
// 内部ヘルパー関数
// ============================================================

/**
 * 単一AI分析結果を保存（内部関数）
 */
async function saveAnalysisResult(
  db: typeof import("@/server/db").db,
  userId: number,
  analysisType: string,
  content: string,
  aiProvider: string,
  mode: string
) {
  try {
    await db.strategyRecommendation.create({
      data: {
        userId,
        marketingStrategy: analysisType === "comprehensive" ? content : null,
        priceRecommendations: analysisType === "pricing" ? content : null,
        campaignProposals: analysisType === "campaign" ? content : null,
        newTreatmentSuggestions: analysisType === "new-treatment" ? content : null,
      },
    });
    console.log(`[Strategy] Saved ${mode} analysis result`);
  } catch (e) {
    console.warn("[Strategy] Failed to save result:", e);
  }
}

/**
 * Council分析結果を保存（内部関数）
 */
async function saveCouncilResult(
  db: typeof import("@/server/db").db,
  userId: number,
  analysisType: string,
  result: CouncilResult
) {
  try {
    await db.strategyRecommendation.create({
      data: {
        userId,
        marketingStrategy:
          analysisType === "comprehensive" ? result.stage3.content : null,
        priceRecommendations:
          analysisType === "pricing" ? result.stage3.content : null,
        campaignProposals:
          analysisType === "campaign" ? result.stage3.content : null,
        newTreatmentSuggestions:
          analysisType === "new-treatment" ? result.stage3.content : null,
      },
    });
    console.log(`[Strategy] Saved council analysis result`);
  } catch (e) {
    console.warn("[Strategy] Failed to save council result:", e);
  }
}

// ダウンロード用のAPIを追加
export const downloadRouter = router({
  /**
   * 分析結果をダウンロード用に取得
   */
  getAnalysisForDownload: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        analysisId: z.string().optional(),
        includeInputData: z.boolean().default(false),
        includeMetadata: z.boolean().default(true),
      })
    )
    .query(async ({ input }) => {
      try {
        // 最新の戦略分析結果を取得
        const strategyResult = await db.strategyRecommendation.findFirst({
          where: { userId: input.userId },
          orderBy: { createdAt: "desc" },
        });

        if (!strategyResult) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "分析結果が見つかりません",
          });
        }

        const result = {
          metadata: input.includeMetadata ? {
            analysisId: input.analysisId || `analysis_${strategyResult.id}`,
            userId: input.userId,
            createdAt: strategyResult.createdAt,
            analysisType: "comprehensive", // デフォルト
          } : null,
          content: strategyResult.marketingStrategy || 
                  strategyResult.priceRecommendations || 
                  strategyResult.campaignProposals || 
                  strategyResult.newTreatmentSuggestions || "",
        };

        // 入力データを含める場合（オプション）
        if (input.includeInputData) {
          // 関連する市場調査・SNS調査データを取得
          const [marketData, snsData] = await Promise.all([
            db.marketResearchResult.findMany({
              where: { userId: input.userId },
              orderBy: { createdAt: "desc" },
              take: 3,
            }),
            db.sNSResearchResult.findMany({
              where: { userId: input.userId },
              orderBy: { createdAt: "desc" },
              take: 4,
            }),
          ]);

          (result as any).inputData = {
            marketDataCount: marketData.length,
            snsDataCount: snsData.length,
            lastMarketResearch: marketData[0]?.createdAt,
            lastSNSResearch: snsData[0]?.createdAt,
          };
        }

        return result;
      } catch (error) {
        console.error("[Download] Failed to get analysis for download:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "ダウンロード用データの取得に失敗しました",
        });
      }
    }),

  /**
   * 分析履歴一覧を取得（ダウンロード選択用）
   */
  getAnalysisHistory: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        limit: z.number().int().positive().max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const results = await db.strategyRecommendation.findMany({
          where: { userId: input.userId },
          orderBy: { createdAt: "desc" },
          take: input.limit,
        });

        return results.map((result) => ({
          id: result.id,
          createdAt: result.createdAt,
          analysisType: result.marketingStrategy ? "comprehensive" :
                       result.priceRecommendations ? "pricing" :
                       result.campaignProposals ? "campaign" :
                       result.newTreatmentSuggestions ? "new-treatment" : "unknown",
          summary: (
            result.marketingStrategy || 
            result.priceRecommendations || 
            result.campaignProposals || 
            result.newTreatmentSuggestions || ""
          ).substring(0, 100) + "...",
          contentLength: (
            result.marketingStrategy || 
            result.priceRecommendations || 
            result.campaignProposals || 
            result.newTreatmentSuggestions || ""
          ).length,
        }));
      } catch (error) {
        console.error("[Download] Failed to get analysis history:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "分析履歴の取得に失敗しました",
        });
      }
    }),
});

