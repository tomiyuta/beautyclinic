import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { z } from "zod";

import {
  generateCampaignCopy,
  generateInstagramLP,
  generateWebsiteArticle,
} from "@/server/services/chatgpt";
import {
  generateInstagramPost,
  generateBlogArticle,
  generateLpContent,
} from "@/server/services/content-generation";
import { generateImage, ImagePreset, ImageTheme } from "@/server/services/image-generation";

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

  // ==================== 要件定義書に基づく新機能 ====================

  generateInstagramPostWithImage: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        campaignTitle: z.string().min(1),
        campaignDescription: z.string().min(1),
        targetAudience: z.string().optional(),
        tone: z.string().default("上品で誠実"),
        relatedTreatmentIds: z.array(z.number()).default([]),
        snsResearchIds: z.array(z.number()).optional(),
        hashtagsPreference: z
          .object({
            maxCount: z.number().min(3).max(30).default(10),
          })
          .optional(),
        callToActionType: z.enum(["予約", "カウンセリング", "LINE登録", "なし"]).default("予約"),
        imagePreset: z.enum(["instagram_square", "lp_banner", "custom"]).default("instagram_square"),
        imageTheme: z.string().default("before_after"),
        customSize: z
          .object({
            width: z.number().min(256).max(2048),
            height: z.number().min(256).max(2048),
          })
          .optional(),
        generateImage: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // テキスト生成
        const contentResult = await generateInstagramPost(
          {
            title: input.campaignTitle,
            description: input.campaignDescription,
            targetAudience: input.targetAudience,
            promotion: undefined,
          },
          {
            tone: input.tone,
            hashtagsPreference: input.hashtagsPreference,
            callToActionType: input.callToActionType,
            snsResearchIds: input.snsResearchIds,
            relatedTreatmentIds: input.relatedTreatmentIds,
            userId: input.userId,
          },
        );

        // データベースに保存
        const saved = await db.generatedContent.create({
          data: {
            userId: input.userId,
            strategyId: 0,
            contentType: "instagram",
            title: input.campaignTitle,
            content: contentResult.text,
            bodyMarkdown: contentResult.markdown,
            rawJson: contentResult.json ? JSON.parse(JSON.stringify(contentResult.json)) : null,
            brandTone: input.tone,
            targetAudience: input.targetAudience || null,
            relatedTreatmentIds: JSON.stringify(input.relatedTreatmentIds || []),
            snsResearchIds: JSON.stringify(input.snsResearchIds || []),
            aiAgent: "chatgpt",
          },
        });

        // 画像生成（オプション）
        let imageResult = null;
        if (input.generateImage) {
          try {
            const image = await generateImage(
              {
                preset: input.imagePreset as ImagePreset,
                theme: input.imageTheme as ImageTheme,
                customSize: input.customSize,
              },
              contentResult.text,
            );

            // 画像をデータベースに保存
            const savedImage = await db.contentImage.create({
              data: {
                contentId: saved.id,
                url: image.url,
                width: image.width,
                height: image.height,
                preset: image.preset,
                theme: image.theme,
              },
            });

            imageResult = savedImage;
          } catch (imageError) {
            console.error("[Content Router] Image generation failed:", imageError);
            // 画像生成失敗でもテキストは保存済みなので続行
          }
        }

        return {
          id: saved.id,
          content: contentResult,
          image: imageResult,
          message: "Instagram投稿が生成されました",
        };
      } catch (error) {
        console.error("Instagram post generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Instagram投稿の生成に失敗しました",
        });
      }
    }),

  generateBlogArticleWithImage: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        campaignTitle: z.string().min(1),
        campaignDescription: z.string().min(1),
        targetAudience: z.string().optional(),
        tone: z.string().default("上品で誠実"),
        relatedTreatmentIds: z.array(z.number()).default([]),
        snsResearchIds: z.array(z.number()).optional(),
        seoKeywords: z.array(z.string()).default([]),
        desiredLength: z.enum(["short", "medium", "long"]).optional().default("medium"),
        imagePreset: z.enum(["instagram_square", "lp_banner", "custom"]).default("lp_banner"),
        imageTheme: z.string().default("clinic_interior"),
        customSize: z
          .object({
            width: z.number().min(256).max(2048),
            height: z.number().min(256).max(2048),
          })
          .optional(),
        generateImage: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // テキスト生成
        const contentResult = await generateBlogArticle(
          {
            title: input.campaignTitle,
            description: input.campaignDescription,
            targetAudience: input.targetAudience,
          },
          {
            seoKeywords: input.seoKeywords,
            desiredLength: input.desiredLength,
            tone: input.tone,
            snsResearchIds: input.snsResearchIds,
            relatedTreatmentIds: input.relatedTreatmentIds,
            userId: input.userId,
          },
        );

        // データベースに保存
        const saved = await db.generatedContent.create({
          data: {
            userId: input.userId,
            strategyId: 0,
            contentType: "blog",
            title: input.campaignTitle,
            content: contentResult.text,
            bodyMarkdown: contentResult.markdown,
            rawJson: contentResult.json ? JSON.parse(JSON.stringify(contentResult.json)) : null,
            brandTone: input.tone,
            targetAudience: input.targetAudience || null,
            relatedTreatmentIds: JSON.stringify(input.relatedTreatmentIds || []),
            snsResearchIds: JSON.stringify(input.snsResearchIds || []),
            aiAgent: "chatgpt",
          },
        });

        // 画像生成（オプション）
        let imageResult = null;
        if (input.generateImage) {
          try {
            const image = await generateImage(
              {
                preset: input.imagePreset as ImagePreset,
                theme: input.imageTheme as ImageTheme,
                customSize: input.customSize,
              },
              contentResult.text,
            );

            const savedImage = await db.contentImage.create({
              data: {
                contentId: saved.id,
                url: image.url,
                width: image.width,
                height: image.height,
                preset: image.preset,
                theme: image.theme,
              },
            });

            imageResult = savedImage;
          } catch (imageError) {
            console.error("[Content Router] Image generation failed:", imageError);
          }
        }

        return {
          id: saved.id,
          content: contentResult,
          image: imageResult,
          message: "ブログ記事が生成されました",
        };
      } catch (error) {
        console.error("Blog article generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "ブログ記事の生成に失敗しました",
        });
      }
    }),

  generateLpWithImage: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        campaignTitle: z.string().min(1),
        campaignDescription: z.string().min(1),
        targetAudience: z.string().optional(),
        tone: z.string().default("上品で誠実"),
        relatedTreatmentIds: z.array(z.number()).default([]),
        snsResearchIds: z.array(z.number()).optional(),
        primaryGoal: z.enum(["新規予約", "LINE登録", "キャンペーン認知"]).default("新規予約"),
        priceInfo: z
          .object({
            normalPrice: z.string().optional(),
            campaignPrice: z.string().optional(),
          })
          .optional(),
        imagePreset: z.enum(["instagram_square", "lp_banner", "custom"]).default("lp_banner"),
        imageTheme: z.string().default("clinic_interior"),
        customSize: z
          .object({
            width: z.number().min(256).max(2048),
            height: z.number().min(256).max(2048),
          })
          .optional(),
        generateImage: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // テキスト生成
        const contentResult = await generateLpContent(
          {
            title: input.campaignTitle,
            description: input.campaignDescription,
            targetAudience: input.targetAudience,
            promotion: undefined,
          },
          {
            primaryGoal: input.primaryGoal,
            priceInfo: input.priceInfo,
            tone: input.tone,
            snsResearchIds: input.snsResearchIds,
            relatedTreatmentIds: input.relatedTreatmentIds,
            userId: input.userId,
          },
        );

        // データベースに保存
        const saved = await db.generatedContent.create({
          data: {
            userId: input.userId,
            strategyId: 0,
            contentType: "lp",
            title: input.campaignTitle,
            content: contentResult.text,
            bodyMarkdown: contentResult.markdown,
            rawJson: contentResult.json ? JSON.parse(JSON.stringify(contentResult.json)) : null,
            brandTone: input.tone,
            targetAudience: input.targetAudience || null,
            relatedTreatmentIds: JSON.stringify(input.relatedTreatmentIds || []),
            snsResearchIds: JSON.stringify(input.snsResearchIds || []),
            aiAgent: "chatgpt",
          },
        });

        // 画像生成（オプション）
        let imageResult = null;
        if (input.generateImage) {
          try {
            const image = await generateImage(
              {
                preset: input.imagePreset as ImagePreset,
                theme: input.imageTheme as ImageTheme,
                customSize: input.customSize,
              },
              contentResult.text,
            );

            const savedImage = await db.contentImage.create({
              data: {
                contentId: saved.id,
                url: image.url,
                width: image.width,
                height: image.height,
                preset: image.preset,
                theme: image.theme,
              },
            });

            imageResult = savedImage;
          } catch (imageError) {
            console.error("[Content Router] Image generation failed:", imageError);
          }
        }

        return {
          id: saved.id,
          content: contentResult,
          image: imageResult,
          message: "LPテキストが生成されました",
        };
      } catch (error) {
        console.error("LP generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "LPテキストの生成に失敗しました",
        });
      }
    }),

  listContents: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        contentType: z.enum(["instagram", "blog", "lp", "instagram_lp", "website_article", "campaign_copy"]).optional(),
        limit: z.number().max(50).default(20),
        cursor: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      const where: {
        userId: number;
        contentType?: typeof input.contentType;
        id?: { lt: number };
      } = {
        userId: input.userId,
      };

      if (input.contentType) {
        where.contentType = input.contentType as typeof input.contentType;
      }

      if (input.cursor) {
        where.id = { lt: input.cursor };
      }

      const contents = await db.generatedContent.findMany({
        where,
        take: input.limit,
        orderBy: { createdAt: "desc" },
        include: {
          images: true,
        },
      });

      return {
        contents,
        nextCursor: contents.length > 0 ? contents[contents.length - 1]?.id : undefined,
      };
    }),

  getContentDetail: publicProcedure
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
        include: {
          images: true,
        },
      });

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "コンテンツが見つかりません",
        });
      }

      return {
        ...result,
        rawJson: result.rawJson as unknown,
        metadata: result.metadata ? JSON.parse(result.metadata) : null,
        relatedTreatmentIds: JSON.parse(result.relatedTreatmentIds ?? "[]") as number[],
        snsResearchIds: JSON.parse(result.snsResearchIds ?? "[]") as number[],
      };
    }),

  regenerateContent: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        userId: z.number().int().positive(),
        overrideParams: z.any().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await db.generatedContent.findFirst({
        where: {
          id: input.id,
          userId: input.userId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "コンテンツが見つかりません",
        });
      }

      // 既存のパラメータを取得して再生成
      // 実装は簡略化（実際には既存パラメータ + overrideParamsで再生成）
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "再生成機能は実装中です",
      });
    }),

  regenerateImageOnly: publicProcedure
    .input(
      z.object({
        contentId: z.number().int().positive(),
        userId: z.number().int().positive(),
        imagePreset: z.enum(["instagram_square", "lp_banner", "custom"]).optional(),
        imageTheme: z.string().optional(),
        customSize: z
          .object({
            width: z.number().min(256).max(2048),
            height: z.number().min(256).max(2048),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const content = await db.generatedContent.findFirst({
        where: {
          id: input.contentId,
          userId: input.userId,
        },
      });

      if (!content) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "コンテンツが見つかりません",
        });
      }

      try {
        const image = await generateImage(
          {
            preset: (input.imagePreset || "instagram_square") as ImagePreset,
            theme: (input.imageTheme || "before_after") as ImageTheme,
            customSize: input.customSize,
          },
          content.content,
        );

        const savedImage = await db.contentImage.create({
          data: {
            contentId: input.contentId,
            url: image.url,
            width: image.width,
            height: image.height,
            preset: image.preset,
            theme: image.theme,
          },
        });

        return {
          image: savedImage,
          message: "画像が再生成されました",
        };
      } catch (error) {
        console.error("Image regeneration error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "画像の再生成に失敗しました",
        });
      }
    }),
});

