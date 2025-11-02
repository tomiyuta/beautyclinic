import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { z } from "zod";

import { exportToExcel, exportToPDF } from "@/server/services/export-service";

import { publicProcedure, router } from "../trpc";

export const strategyManagementRouter = router({
  updateFeedback: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        userId: z.number().int().positive(),
        feedback: z.string().min(1, "フィードバックを入力してください"),
        implementationStatus: z
          .enum(["pending", "in_progress", "completed"])
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const strategy = await db.strategyRecommendation.findFirst({
        where: {
          id: input.id,
          userId: input.userId,
        },
      });

      if (!strategy) {
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

          // 提案内容の要約を生成
          let priceRecommendationsCount = 0;
          let campaignProposalsCount = 0;
          let newTreatmentSuggestionsCount = 0;

          try {
            if (strategy.priceRecommendations) {
              const parsed = JSON.parse(strategy.priceRecommendations);
              priceRecommendationsCount = Array.isArray(parsed)
                ? parsed.length
                : Array.isArray(parsed.recommendations)
                  ? parsed.recommendations.length
                  : parsed.recommendations
                    ? 1
                    : 0;
            }
            if (strategy.campaignProposals) {
              const parsed = JSON.parse(strategy.campaignProposals);
              campaignProposalsCount = Array.isArray(parsed)
                ? parsed.length
                : Array.isArray(parsed.campaigns)
                  ? parsed.campaigns.length
                  : parsed.campaigns
                    ? 1
                    : 0;
            }
            if (strategy.newTreatmentSuggestions) {
              const parsed = JSON.parse(strategy.newTreatmentSuggestions);
              newTreatmentSuggestionsCount = Array.isArray(parsed)
                ? parsed.length
                : Array.isArray(parsed.suggestions)
                  ? parsed.suggestions.length
                  : parsed.suggestions
                    ? 1
                    : 0;
            }
          } catch {
            // JSONパースエラーは無視
          }

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

  exportStrategy: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        userId: z.number().int().positive(),
        format: z.enum(["json", "text", "pdf", "excel"]).optional().default("json"),
      }),
    )
    .query(async ({ input }) => {
      const strategy = await db.strategyRecommendation.findFirst({
        where: {
          id: input.id,
          userId: input.userId,
        },
      });

      if (!strategy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "戦略提案が見つかりません",
        });
      }

      const data = {
        id: strategy.id,
        analysisDate: strategy.analysisDate,
        priceRecommendations: strategy.priceRecommendations
          ? JSON.parse(strategy.priceRecommendations)
          : null,
        campaignProposals: strategy.campaignProposals
          ? JSON.parse(strategy.campaignProposals)
          : null,
        newTreatmentSuggestions: strategy.newTreatmentSuggestions
          ? JSON.parse(strategy.newTreatmentSuggestions)
          : null,
        marketingStrategy: strategy.marketingStrategy
          ? JSON.parse(strategy.marketingStrategy)
          : null,
        userFeedback: strategy.userFeedback,
        implementationStatus: strategy.implementationStatus,
        createdAt: strategy.createdAt,
        updatedAt: strategy.updatedAt,
      };

      if (input.format === "text") {
        // テキスト形式で整形
        let text = `戦略提案書\n`;
        text += `作成日: ${strategy.createdAt.toLocaleString("ja-JP")}\n`;
        text += `ステータス: ${strategy.implementationStatus}\n\n`;

        if (data.priceRecommendations) {
          text += `価格設定提案\n${JSON.stringify(data.priceRecommendations, null, 2)}\n\n`;
        }

        if (data.campaignProposals) {
          text += `キャンペーン案\n${JSON.stringify(data.campaignProposals, null, 2)}\n\n`;
        }

        if (data.newTreatmentSuggestions) {
          text += `新施術提案\n${JSON.stringify(data.newTreatmentSuggestions, null, 2)}\n\n`;
        }

        if (data.marketingStrategy) {
          text += `マーケティング戦略\n${JSON.stringify(data.marketingStrategy, null, 2)}\n\n`;
        }

        if (strategy.userFeedback) {
          text += `フィードバック\n${strategy.userFeedback}\n`;
        }

        return { format: "text", content: text };
      }

      if (input.format === "pdf") {
        const pdfBuffer = await exportToPDF({
          id: data.id,
          analysisDate: strategy.analysisDate,
          priceRecommendations: data.priceRecommendations,
          campaignProposals: data.campaignProposals,
          newTreatmentSuggestions: data.newTreatmentSuggestions,
          marketingStrategy: data.marketingStrategy,
          userFeedback: strategy.userFeedback,
          implementationStatus: strategy.implementationStatus,
          createdAt: strategy.createdAt,
          updatedAt: strategy.updatedAt,
        });

        return {
          format: "pdf",
          content: pdfBuffer.toString("base64"),
          mimeType: "application/pdf",
        };
      }

      if (input.format === "excel") {
        const excelBuffer = await exportToExcel({
          id: data.id,
          analysisDate: strategy.analysisDate,
          priceRecommendations: data.priceRecommendations,
          campaignProposals: data.campaignProposals,
          newTreatmentSuggestions: data.newTreatmentSuggestions,
          marketingStrategy: data.marketingStrategy,
          userFeedback: strategy.userFeedback,
          implementationStatus: strategy.implementationStatus,
          createdAt: strategy.createdAt,
          updatedAt: strategy.updatedAt,
        });

        return {
          format: "excel",
          content: excelBuffer.toString("base64"),
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        };
      }

      return { format: "json", content: data };
    }),
});

