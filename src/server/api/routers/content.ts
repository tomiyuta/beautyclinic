import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { z } from "zod";

import {
  generateCampaignCopy,
  generateInstagramLP,
  generateWebsiteArticle,
} from "@/server/services/chatgpt";

import { publicProcedure, router } from "../trpc";

export const contentRouter = router({
  generateInstagramLP: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        strategyId: z.number().int().positive().optional(),
        campaignTitle: z.string().min(1, "キャンペーン名を入力してください"),
        campaignDescription: z.string().min(1, "キャンペーン説明を入力してください"),
        targetAudience: z.string().optional(),
        promotion: z.string().optional(),
        designApproach: z
          .enum(["minimal", "bold", "elegant", "trendy"])
          .optional()
          .default("trendy"),
        count: z.number().int().min(1).max(5).optional().default(3),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const designApproaches: Array<"minimal" | "bold" | "elegant" | "trendy"> = [
          "minimal",
          "bold",
          "elegant",
          "trendy",
        ];

        const results = [];
        for (let i = 0; i < input.count; i++) {
          const approach =
            designApproaches[i % designApproaches.length] || "trendy";
          const result = await generateInstagramLP(
            {
              title: input.campaignTitle,
              description: input.campaignDescription,
              targetAudience: input.targetAudience,
              promotion: input.promotion,
            },
            approach,
          );

          // テキスト形式で保存（JSONパースしない）
          const saved = await db.generatedContent.create({
            data: {
              userId: input.userId,
              strategyId: input.strategyId || 0,
              contentType: "instagram_lp",
              title: input.campaignTitle,
              content: result,
              metadata: JSON.stringify({
                designApproach: approach,
              }),
              aiAgent: "chatgpt",
            },
          });

          results.push({
            id: saved.id,
            approach,
            result: result,
          });
        }

        return {
          results,
          message: `${input.count}件のInstagram LP案が生成されました`,
        };
      } catch (error) {
        console.error("Instagram LP generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Instagram LP案の生成に失敗しました",
        });
      }
    }),

  generateWebsiteArticle: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        strategyId: z.number().int().positive().optional(),
        campaignTitle: z.string().min(1, "キャンペーン名を入力してください"),
        campaignDescription: z.string().min(1, "キャンペーン説明を入力してください"),
        targetAudience: z.string().optional(),
        seoKeywords: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await generateWebsiteArticle(
          {
            title: input.campaignTitle,
            description: input.campaignDescription,
            targetAudience: input.targetAudience,
          },
          input.seoKeywords,
        );

        // テキスト形式で保存（JSONパースしない）
        const saved = await db.generatedContent.create({
          data: {
            userId: input.userId,
            strategyId: input.strategyId || 0,
            contentType: "website_article",
            title: input.campaignTitle,
            content: result,
            metadata: JSON.stringify({
              keywords: input.seoKeywords || [],
            }),
            aiAgent: "chatgpt",
          },
        });

        return {
          id: saved.id,
          result: result,
          message: "HP記事が生成されました",
        };
      } catch (error) {
        console.error("Website article generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "HP記事の生成に失敗しました",
        });
      }
    }),

  generateCampaignCopy: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        strategyId: z.number().int().positive().optional(),
        campaignTitle: z.string().min(1, "キャンペーン名を入力してください"),
        campaignDescription: z.string().min(1, "キャンペーン説明を入力してください"),
        targetAudience: z.string().optional(),
        promotion: z.string().optional(),
        tone: z
          .enum(["professional", "friendly", "trendy"])
          .optional()
          .default("friendly"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await generateCampaignCopy(
          {
            title: input.campaignTitle,
            description: input.campaignDescription,
            targetAudience: input.targetAudience,
            promotion: input.promotion,
          },
          input.tone,
        );

        // テキスト形式で保存（JSONパースしない）
        const saved = await db.generatedContent.create({
          data: {
            userId: input.userId,
            strategyId: input.strategyId || 0,
            contentType: "campaign_copy",
            title: input.campaignTitle,
            content: result,
            metadata: JSON.stringify({
              tone: input.tone,
            }),
            aiAgent: "chatgpt",
          },
        });

        return {
          id: saved.id,
          result: result,
          message: "キャンペーンコピーが生成されました",
        };
      } catch (error) {
        console.error("Campaign copy generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "キャンペーンコピーの生成に失敗しました",
        });
      }
    }),

  list: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        contentType: z
          .enum(["instagram_lp", "website_article", "campaign_copy"])
          .optional(),
      }),
    )
    .query(async ({ input }) => {
      const where = {
        userId: input.userId,
        ...(input.contentType && { contentType: input.contentType }),
      };

      return db.generatedContent.findMany({
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
      const result = await db.generatedContent.findFirst({
        where: {
          id: input.id,
          userId: input.userId,
        },
      });

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "コンテンツが見つかりません",
        });
      }

      // テキスト形式で返す（JSONパースしない）
      return {
        ...result,
        content: result.content,
        metadata: result.metadata ? JSON.parse(result.metadata) : null,
      };
    }),

  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        userId: z.number().int().positive(),
        status: z.enum(["draft", "approved", "published"]),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await db.generatedContent.findFirst({
        where: {
          id: input.id,
          userId: input.userId,
        },
      });

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "コンテンツが見つかりません",
        });
      }

      return db.generatedContent.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),
});

