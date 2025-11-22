import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { publicProcedure, router } from "../trpc";
import {
  generateCampaignCopy,
  generateInstagramLP,
  generateWebsiteArticle,
  getCurrentChatGPTModel,
  generateInstagramPostText,
  generateAdCopy,
  generateBlogArticle,
  type TextGenerationOptions,
} from "@/server/services/chatgpt";
import { cleanTextForAdvertising, checkProhibitedPhrases } from "@/server/utils/advertising-guidelines";
import {
  instagramLPInputSchema,
  websiteArticleInputSchema,
  campaignCopyInputSchema,
  textGenerationInputSchema,
  contentListInputSchema,
  contentByIdInputSchema,
  updateContentStatusInputSchema,
  complianceCheckInputSchema,
  listComplianceLogsInputSchema,
} from "@/server/api/schemas/content";
import { saveGeneratedContent } from "@/server/api/utils/generated-content";

export const contentTextRouter = router({
  // Instagram LP生成
  generateInstagramLP: publicProcedure.input(instagramLPInputSchema)
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
          message: error instanceof Error ? error.message : "Instagram LP生成に失敗しました",
        });
      }
    }),

  // ウェブサイト記事生成
  generateWebsiteArticle: publicProcedure.input(websiteArticleInputSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await generateWebsiteArticle(
          {
            title: input.campaignTitle,
            description: input.campaignDescription,
            targetAudience: input.targetAudience,
          },
          input.seoKeywords || [],
        );

        const saved = await saveGeneratedContent({
          userId: input.userId,
          strategyId: input.strategyId,
          contentType: "website_article",
          title: input.campaignTitle,
          content: result,
          aiAgent: "chatgpt",
          metadata: {
            seoKeywords: input.seoKeywords || [],
          },
        });

        return {
          id: saved.id,
          result,
          message: "ウェブサイト記事が生成されました",
        };
      } catch (error) {
        console.error("Website article generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "ウェブサイト記事生成に失敗しました",
        });
      }
    }),

  // キャンペーンコピー生成
  generateCampaignCopy: publicProcedure.input(campaignCopyInputSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await generateCampaignCopy(
          {
            title: input.campaignTitle,
            description: input.campaignDescription,
            targetAudience: input.targetAudience,
            promotion: input.promotion,
          },
          input.tone || "friendly",
        );

        const saved = await saveGeneratedContent({
          userId: input.userId,
          strategyId: input.strategyId,
          contentType: "campaign_copy",
          title: input.campaignTitle,
          content: result,
          aiAgent: "chatgpt",
          metadata: {
            tone: input.tone || "friendly",
          },
        });

        return {
          id: saved.id,
          result,
          message: "キャンペーンコピーが生成されました",
        };
      } catch (error) {
        console.error("Campaign copy generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "キャンペーンコピー生成に失敗しました",
        });
      }
    }),

  // 拡張テキスト生成
  generateText: publicProcedure.input(textGenerationInputSchema)
    .mutation(async ({ input }) => {
      try {
        const options: TextGenerationOptions = {
          campaignInfo: {
            title: input.campaignInfo.title,
            description: input.campaignInfo.description,
            targetAudience: input.campaignInfo.targetAudience,
            promotion: input.campaignInfo.promotion,
          },
          tone: input.tone,
          maxLength: input.maxLength,
          includeKeywords: input.includeKeywords,
          ctaType: input.ctaType,
          seoKeywords: input.seoKeywords,
        };

        let result: string;
        switch (input.contentType) {
          case "instagram_post_text":
            result = await generateInstagramPostText(options);
            break;
          case "ad_banner":
            result = await generateAdCopy(options);
            break;
          case "website_article":
            result = await generateBlogArticle(options);
            break;
          case "campaign_copy":
            const campaignCopyTone = options.tone === "professional" ? "professional" : 
                                   options.tone === "casual" || options.tone === "formal" ? "friendly" : 
                                   "friendly";
            result = await generateCampaignCopy(
              options.campaignInfo,
              campaignCopyTone,
            );
            break;
          default:
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Unsupported content type: ${input.contentType}`,
            });
        }

        // コンプライアンスチェック
        const complianceCheck = checkProhibitedPhrases(result);
        const cleanedResult = cleanTextForAdvertising(result);
        const cleanedText = cleanedResult.cleanedText;
        const complianceStatus = complianceCheck.hasProhibited ? "violation" : "compliant";

        const variations = [];
        for (let i = 0; i < input.count; i++) {
          const saved = await saveGeneratedContent({
            userId: input.userId,
            strategyId: input.strategyId,
            templateId: input.templateId,
            contentType: input.contentType,
            title: input.campaignInfo.title,
            content: i === 0 ? cleanedText : result, // 最初のバリエーションはクリーンアップ済み
            aiAgent: "chatgpt",
            compliance: {
              status: complianceStatus,
              report: {
                foundPhrases: complianceCheck.foundPhrases,
                warnings: cleanedResult.warnings,
              },
            },
            metadata: {
              tone: input.tone,
              maxLength: input.maxLength,
              includeKeywords: input.includeKeywords,
              ctaType: input.ctaType,
              seoKeywords: input.seoKeywords,
            },
          });

          variations.push({
            id: saved.id,
            content: saved.content,
            complianceStatus: saved.complianceStatus,
          });
        }

        return {
          variations,
          message: `${input.count}件の${input.contentType}が生成されました`,
        };
      } catch (error) {
        console.error("Text generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "テキスト生成に失敗しました",
        });
      }
    }),

  // コンプライアンスチェック
  checkCompliance: publicProcedure.input(complianceCheckInputSchema)
    .mutation(async ({ input }) => {
      try {
        const check = checkProhibitedPhrases(input.content);
        const cleanedResult = cleanTextForAdvertising(input.content);
        const status = check.hasProhibited ? "violation" : "compliant";

        return {
          status,
          foundPhrases: check.foundPhrases,
          warnings: cleanedResult.warnings,
          cleanedText: cleanedResult.cleanedText,
        };
      } catch (error) {
        console.error("Compliance check error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "コンプライアンスチェックに失敗しました",
        });
      }
    }),

  // コンプライアンスログ一覧
  listComplianceLogs: publicProcedure.input(listComplianceLogsInputSchema)
    .query(async ({ input }) => {
      try {
        const contents = await db.generatedContent.findMany({
          where: {
            userId: input.userId,
            complianceStatus: {
              not: null,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: (input as any).limit || 50,
        });

        return contents.map((content) => ({
          id: content.id,
          contentType: content.contentType,
          title: content.title,
          complianceStatus: content.complianceStatus,
          complianceReport: content.complianceReport
            ? JSON.parse(content.complianceReport as string)
            : null,
          createdAt: content.createdAt,
        }));
      } catch (error) {
        console.error("List compliance logs error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "コンプライアンスログの取得に失敗しました",
        });
      }
    }),

  // コンテンツ一覧
  list: publicProcedure.input(contentListInputSchema)
    .query(async ({ input }) => {
      try {
        const contents = await db.generatedContent.findMany({
          where: {
            userId: input.userId,
            ...(input.contentType && { contentType: input.contentType }),
          },
          orderBy: {
            createdAt: "desc",
          },
          take: (input as any).limit || 50,
        });

        return contents;
      } catch (error) {
        console.error("List contents error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "コンテンツ一覧の取得に失敗しました",
        });
      }
    }),

  // コンテンツ詳細取得
  getById: publicProcedure.input(contentByIdInputSchema)
    .query(async ({ input }) => {
      try {
        const content = await db.generatedContent.findUnique({
          where: { id: input.id },
        });

        if (!content) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "コンテンツが見つかりません",
          });
        }

        return content;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Get content by id error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "コンテンツの取得に失敗しました",
        });
      }
    }),

  // ステータス更新
  updateStatus: publicProcedure.input(updateContentStatusInputSchema)
    .mutation(async ({ input }) => {
      try {
        const updated = await db.generatedContent.update({
          where: { id: input.id },
          data: { status: input.status },
        });

        return updated;
      } catch (error) {
        console.error("Update content status error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "ステータス更新に失敗しました",
        });
      }
    }),

  // 現在のモデル取得
  getCurrentModel: publicProcedure.query(async () => {
    const model = await getCurrentChatGPTModel();
    return { model };
  }),
});

