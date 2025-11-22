import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { z } from "zod";

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
import { generateImage, type ImageGenerationOptions, type ImagePreset, type ImageTheme } from "@/server/services/image-generation";
import { 
  generateShortVideoWithPika, 
  generateExplanationVideoWithSynthesia,
  pollSynthesiaVideoStatus,
  type ShortVideoGenerationOptions,
  type ExplanationVideoGenerationOptions 
} from "@/server/services/video-generation";

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
          .enum([
            "instagram_lp",
            "website_article",
            "campaign_copy",
            "instagram_post_text",
            "instagram_post_image",
            "instagram_story",
            "ad_banner",
            "lp_visual",
            "instagram_reels",
            "tiktok_video",
            "youtube_shorts",
            "treatment_explanation_video",
            "pre_care_video",
            "post_care_video",
            "faq_video",
          ])
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
        take: 100, // 最新100件に制限
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

  getCurrentModel: publicProcedure.query(async () => {
    return {
      aiAgent: "chatgpt" as const,
      model: getCurrentChatGPTModel() || "gpt-5.1",
    };
  }),

  // 新規追加：拡張されたテキスト生成（要件定義書3.1に基づく）
  generateText: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        strategyId: z.number().int().positive().optional(),
        templateId: z.number().int().positive().optional(),
        contentType: z.enum([
          "instagram_post_text",
          "ad_banner",
          "website_article",
          "campaign_copy",
        ]),
        campaignInfo: z.object({
          title: z.string().min(1),
          description: z.string().min(1).max(500),
          targetAudience: z.string().optional(),
          promotion: z.string().optional(),
        }),
        tone: z.enum(["formal", "casual", "friendly", "professional"]).optional().default("friendly"),
        maxLength: z.number().int().positive().optional(),
        includeKeywords: z.array(z.string()).optional().default([]),
        ctaType: z.enum(["reserve", "details", "inquiry", "check_now"]).optional().default("reserve"),
        seoKeywords: z.array(z.string()).optional().default([]),
        count: z.number().int().min(1).max(5).optional().default(3),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const options: TextGenerationOptions = {
          campaignInfo: input.campaignInfo,
          tone: input.tone,
          maxLength: input.maxLength,
          includeKeywords: input.includeKeywords,
          ctaType: input.ctaType,
          seoKeywords: input.seoKeywords,
        };

        const results = [];
        const complianceReports = [];

        for (let i = 0; i < input.count; i++) {
          let result: string;
          
          // コンテンツタイプに応じて適切な関数を呼び出し
          switch (input.contentType) {
            case "instagram_post_text":
              result = await generateInstagramPostText(options);
              break;
            case "ad_banner":
              result = await generateAdCopy(options);
              break;
            case "website_article":
              result = await generateWebsiteArticle(
                input.campaignInfo,
                input.seoKeywords,
              );
              break;
            case "campaign_copy":
              // toneを既存のgenerateCampaignCopyの型に合わせる
              const campaignCopyTone = input.tone === "professional" ? "professional" : 
                                     input.tone === "casual" ? "friendly" : "friendly";
              result = await generateCampaignCopy(
                input.campaignInfo,
                campaignCopyTone,
              );
              break;
            default:
              throw new Error(`Unsupported content type: ${input.contentType}`);
          }

          // コンプライアンスチェック
          const complianceCheck = checkProhibitedPhrases(result);
          const complianceStatus = complianceCheck.hasProhibited ? "violation" : "compliant";
          const complianceReport = JSON.stringify({
            hasProhibited: complianceCheck.hasProhibited,
            foundPhrases: complianceCheck.foundPhrases,
            checkedAt: new Date().toISOString(),
          });

          // データベースに保存
          const saved = await db.generatedContent.create({
            data: {
              userId: input.userId,
              strategyId: input.strategyId || 0,
              templateId: input.templateId || undefined,
              contentType: input.contentType,
              title: input.campaignInfo.title,
              content: result,
              metadata: JSON.stringify({
                tone: input.tone,
                maxLength: input.maxLength,
                includeKeywords: input.includeKeywords,
                ctaType: input.ctaType,
                seoKeywords: input.seoKeywords,
                variationIndex: i,
              }),
              aiAgent: "chatgpt",
              complianceStatus,
              complianceReport,
              variations: JSON.stringify({ count: input.count, currentIndex: i }),
            },
          });

          results.push({
            id: saved.id,
            content: result,
            complianceStatus,
            complianceReport: JSON.parse(complianceReport),
          });

          complianceReports.push({
            id: saved.id,
            status: complianceStatus,
            report: JSON.parse(complianceReport),
          });
        }

        return {
          results,
          complianceReports,
          message: `${input.count}件の${input.contentType}が生成されました`,
        };
      } catch (error) {
        console.error("Text generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "テキスト生成に失敗しました",
        });
      }
    }),

  // コンプライアンスチェック専用エンドポイント
  // コンプライアンスログ一覧取得（要件定義書3.5.3に基づく - フェーズ3）
  listComplianceLogs: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        contentId: z.number().int().positive().optional(),
        status: z.enum(["compliant", "warning", "violation"]).optional(),
        limit: z.number().int().min(1).max(100).optional().default(50),
      }),
    )
    .query(async ({ input }) => {
      // contentIdからuserIdを確認するため、まずGeneratedContentを取得
      const whereConditions: Array<{ contentId: number } | { status: string }> = [];
      
      if (input.contentId) {
        const content = await db.generatedContent.findFirst({
          where: {
            id: input.contentId,
            userId: input.userId,
          },
        });
        
        if (!content) {
          return [];
        }
        
        whereConditions.push({ contentId: input.contentId });
      }
      
      // ComplianceCheckLogを直接クエリできないため、GeneratedContent経由で取得
      const contents = await db.generatedContent.findMany({
        where: {
          userId: input.userId,
          ...(input.contentId && { id: input.contentId }),
          ...(input.status && { complianceStatus: input.status }),
          complianceStatus: { not: null }, // コンプライアンスチェック済みのみ
        },
        select: {
          id: true,
          complianceStatus: true,
          complianceReport: true,
          updatedAt: true,
          contentType: true,
        },
        orderBy: { updatedAt: "desc" },
        take: input.limit,
      });
      
      // 簡易的なログ形式で返す
      return contents.map(content => ({
        id: content.id,
        contentId: content.id,
        checkType: "text", // 暫定的
        status: content.complianceStatus || "compliant",
        violations: content.complianceReport ? JSON.parse(content.complianceReport) : null,
        warnings: null,
        checkedAt: content.updatedAt,
      }));
    }),

  checkCompliance: publicProcedure
    .input(
      z.object({
        content: z.string().min(1),
        contentType: z.enum(["text", "image", "video"]).default("text"),
        contentId: z.number().int().positive().optional(), // ログ記録用
      }),
    )
    .mutation(async ({ input }) => {
      try {
        let checkResult: { hasProhibited: boolean; foundPhrases: string[] };
        let cleanedText: string;
        let warnings: string[] = [];
        let status: "compliant" | "warning" | "violation";
        
        if (input.contentType === "text") {
          checkResult = checkProhibitedPhrases(input.content);
          const cleanResult = cleanTextForAdvertising(input.content);
          cleanedText = cleanResult.cleanedText;
          warnings = cleanResult.warnings;
          
          status = checkResult.hasProhibited ? "violation" : warnings.length > 0 ? "warning" : "compliant";
        } else {
          // 画像・動画のチェックは将来実装
          checkResult = { hasProhibited: false, foundPhrases: [] };
          cleanedText = input.content;
          status = "compliant";
        }
        
        const report = {
          checkedAt: new Date().toISOString(),
          contentType: input.contentType,
          violations: checkResult.foundPhrases,
          warnings,
        };
        
        // コンテンツIDが指定されている場合、ComplianceCheckLogに記録
        if (input.contentId) {
          try {
            await db.complianceCheckLog.create({
              data: {
                contentId: input.contentId,
                checkType: input.contentType,
                violations: checkResult.foundPhrases.length > 0 ? JSON.stringify(checkResult.foundPhrases) : null,
                warnings: warnings.length > 0 ? JSON.stringify(warnings) : null,
                status: status,
              },
            });
          } catch (logError) {
            console.error("Failed to save compliance log:", logError);
            // ログ記録の失敗は無視して続行
          }
        }
        
        return {
          status,
          hasProhibited: checkResult.hasProhibited,
          foundPhrases: checkResult.foundPhrases,
          warnings,
          cleanedText,
          report,
        };
      } catch (error) {
        console.error("Compliance check error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "コンプライアンスチェックに失敗しました",
        });
      }
    }),

  // 画像生成（要件定義書3.2に基づく）
  generateImage: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        strategyId: z.number().int().positive().optional(),
        templateId: z.number().int().positive().optional(),
        imageType: z.enum([
          "instagram_square",
          "instagram_vertical",
          "instagram_story",
          "ad_banner_horizontal",
          "ad_banner_square",
          "lp_visual",
        ]),
        campaignInfo: z.object({
          title: z.string().min(1),
          description: z.string().min(1).max(300),
        }),
        colorScheme: z.string().optional(),
        includeElements: z.object({
          logo: z.boolean().optional().default(false),
          price: z.boolean().optional().default(false),
          textOverlay: z.boolean().optional().default(false),
          beforeAfter: z.boolean().optional().default(false),
        }).optional(),
        imageStyle: z.enum(["minimal", "gorgeous", "natural", "modern", "elegant"]).optional().default("modern"),
        count: z.number().int().min(1).max(4).optional().default(4),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // 画像タイプからプリセットとサイズを決定
        const presetMap: Record<string, ImagePreset> = {
          instagram_square: "instagram_square",
          instagram_vertical: "custom",
          instagram_story: "custom",
          ad_banner_horizontal: "lp_banner",
          ad_banner_square: "instagram_square",
          lp_visual: "lp_banner",
        };

        const sizeMap: Record<string, { width: number; height: number }> = {
          instagram_square: { width: 1080, height: 1080 },
          instagram_vertical: { width: 1080, height: 1350 },
          instagram_story: { width: 1080, height: 1920 },
          ad_banner_horizontal: { width: 1200, height: 628 },
          ad_banner_square: { width: 1080, height: 1080 },
          lp_visual: { width: 1920, height: 1080 },
        };

        const preset = presetMap[input.imageType] || "instagram_square";
        const customSize = sizeMap[input.imageType];

        const themeMap: Record<string, ImageTheme> = {
          minimal: "clinic_interior",
          gorgeous: "before_after",
          natural: "texture_skin",
          modern: "clinic_interior",
          elegant: "season_event",
        };
        const theme = themeMap[input.imageStyle] || "clinic_interior";

        // 画像タイプからContentTypeへのマッピング
        const contentTypeMap: Record<string, "instagram_post_image" | "instagram_story" | "ad_banner" | "lp_visual"> = {
          instagram_square: "instagram_post_image",
          instagram_vertical: "instagram_post_image",
          instagram_story: "instagram_story",
          ad_banner_horizontal: "ad_banner",
          ad_banner_square: "ad_banner",
          lp_visual: "lp_visual",
        };
        const contentType = contentTypeMap[input.imageType] || "instagram_post_image";

        const results = [];
        const contentText = `${input.campaignInfo.title}\n${input.campaignInfo.description}`;

        for (let i = 0; i < input.count; i++) {
          const options: ImageGenerationOptions = {
            preset,
            theme,
            customSize: preset === "custom" ? customSize : undefined,
            prompt: `${input.campaignInfo.description}. Style: ${input.imageStyle}. ${input.colorScheme ? `Color scheme: ${input.colorScheme}.` : ""}${input.includeElements?.logo ? " Include clinic logo." : ""}${input.includeElements?.price ? " Include price information." : ""}${input.includeElements?.textOverlay ? " Include text overlay." : ""}`,
          };

          const generatedImage = await generateImage(options, contentText);

          // コンプライアンスチェック（ビフォーアフター写真の場合）
          let complianceStatus = "compliant";
          let complianceReport = null;
          
          if (input.includeElements?.beforeAfter) {
            complianceStatus = "warning";
            complianceReport = JSON.stringify({
              warning: "ビフォーアフター写真は医療広告ガイドラインの条件を満たす必要があります",
              checkedAt: new Date().toISOString(),
            });
          }

          // データベースに保存
          const saved = await db.generatedContent.create({
            data: {
              userId: input.userId,
              strategyId: input.strategyId || 0,
              templateId: input.templateId || undefined,
              contentType: contentType,
              title: input.campaignInfo.title,
              content: generatedImage.url, // 画像URLを保存
              fileUrl: generatedImage.url,
              fileSize: null, // DALL-Eからは取得できない
              mimeType: "image/png",
              metadata: JSON.stringify({
                imageType: input.imageType,
                preset: generatedImage.preset,
                theme: generatedImage.theme,
                width: generatedImage.width,
                height: generatedImage.height,
                imageStyle: input.imageStyle,
                includeElements: input.includeElements,
                variationIndex: i,
              }),
              aiAgent: "chatgpt", // DALL-EはOpenAI
              complianceStatus,
              complianceReport,
              variations: JSON.stringify({ count: input.count, currentIndex: i }),
            },
          });

          results.push({
            id: saved.id,
            url: generatedImage.url,
            width: generatedImage.width,
            height: generatedImage.height,
            complianceStatus,
          });
        }

        return {
          results,
          message: `${input.count}件の画像が生成されました`,
        };
      } catch (error) {
        console.error("Image generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "画像生成に失敗しました",
        });
      }
    }),

  // 短尺動画生成（要件定義書3.3に基づく - フェーズ2準備）
  generateShortVideo: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        strategyId: z.number().int().positive().optional(),
        templateId: z.number().int().positive().optional(),
        videoType: z.enum(["reels", "tiktok", "youtube_shorts"]),
        campaignInfo: z.object({
          title: z.string().min(1),
          description: z.string().min(1).max(300),
        }),
        duration: z.number().int().refine((val) => [5, 10, 15].includes(val)).optional().default(10),
        aspectRatio: z.enum(["9:16", "16:9", "1:1", "4:5", "5:4", "3:2", "2:3"]).optional().default("9:16"),
        resolution: z.enum(["720p", "1080p"]).optional().default("720p"),
        bgmEnabled: z.boolean().optional().default(false),
        textOverlay: z.array(z.string()).optional().default([]),
        videoStyle: z.enum(["realistic", "animation", "slideshow"]).optional().default("realistic"),
        count: z.number().int().min(1).max(2).optional().default(2),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const results = [];
        const contentText = `${input.campaignInfo.title}\n${input.campaignInfo.description}`;

        for (let i = 0; i < input.count; i++) {
          const options: ShortVideoGenerationOptions = {
            videoType: input.videoType,
            prompt: input.campaignInfo.description,
            duration: input.duration as 5 | 10 | 15,
            aspectRatio: input.aspectRatio as "9:16" | "16:9" | "1:1" | "4:5" | "5:4" | "3:2" | "2:3",
            resolution: input.resolution,
            bgmEnabled: input.bgmEnabled,
            textOverlay: input.textOverlay,
            videoStyle: input.videoStyle,
          };

          const generatedVideo = await generateShortVideoWithPika(options, contentText);

          // データベースに保存
          const contentTypeMap: Record<string, "instagram_reels" | "tiktok_video" | "youtube_shorts"> = {
            reels: "instagram_reels",
            tiktok: "tiktok_video",
            youtube_shorts: "youtube_shorts",
          };
          const contentType = contentTypeMap[input.videoType] || "instagram_reels";

          const saved = await db.generatedContent.create({
            data: {
              userId: input.userId,
              strategyId: input.strategyId || 0,
              templateId: input.templateId || undefined,
              contentType: contentType,
              title: input.campaignInfo.title,
              content: generatedVideo.url,
              fileUrl: generatedVideo.url,
              mimeType: "video/mp4",
              metadata: JSON.stringify({
                videoType: input.videoType,
                duration: generatedVideo.duration,
                aspectRatio: input.aspectRatio,
                bgmEnabled: input.bgmEnabled,
                videoStyle: input.videoStyle,
                variationIndex: i,
              }),
              aiAgent: "pika", // Pika Labs (fal-ai経由)
              variations: JSON.stringify({ count: input.count, currentIndex: i }),
            },
          });

          results.push({
            id: saved.id,
            url: generatedVideo.url,
            duration: generatedVideo.duration,
            thumbnailUrl: generatedVideo.thumbnailUrl,
          });
        }

        return {
          results,
          message: `${input.count}件の${input.videoType}動画が生成されました`,
        };
      } catch (error) {
        console.error("Short video generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "短尺動画生成に失敗しました",
        });
      }
    }),

  // 施術説明動画生成（要件定義書3.4に基づく - フェーズ2準備）
  generateExplanationVideo: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        strategyId: z.number().int().positive().optional(),
        templateId: z.number().int().positive().optional(),
        videoType: z.enum(["treatment_explanation", "pre_care", "post_care", "faq"]),
        treatmentName: z.string().min(1),
        script: z.string().min(1).max(1000),
        duration: z.number().int().refine((val) => [60, 120, 180].includes(val)).optional().default(120),
        avatarId: z.string().optional(),
        language: z.enum(["ja", "en", "zh", "ko"]).optional().default("ja"),
        background: z.enum(["clinic", "simple"]).optional().default("simple"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const options: ExplanationVideoGenerationOptions = {
          videoType: input.videoType,
          treatmentName: input.treatmentName,
          script: input.script,
          duration: input.duration as 60 | 120 | 180 | undefined,
          avatarId: input.avatarId,
          language: input.language,
          background: input.background,
        };

        const generatedVideo = await generateExplanationVideoWithSynthesia(options);

        // データベースに保存
        const contentTypeMap: Record<string, "treatment_explanation_video" | "pre_care_video" | "post_care_video" | "faq_video"> = {
          treatment_explanation: "treatment_explanation_video",
          pre_care: "pre_care_video",
          post_care: "post_care_video",
          faq: "faq_video",
        };
        const contentType = contentTypeMap[input.videoType] || "treatment_explanation_video";

        const saved = await db.generatedContent.create({
          data: {
            userId: input.userId,
            strategyId: input.strategyId || 0,
            contentType: contentType,
            title: `${input.treatmentName} - ${input.videoType}`,
            content: generatedVideo.url,
            fileUrl: generatedVideo.url,
            mimeType: "video/mp4",
            metadata: JSON.stringify({
              videoType: input.videoType,
              treatmentName: input.treatmentName,
              duration: generatedVideo.duration,
              language: input.language,
              avatarId: input.avatarId,
            }),
            aiAgent: "chatgpt", // 暫定的
          },
        });

        return {
          id: saved.id,
          url: generatedVideo.url,
          duration: generatedVideo.duration,
          message: "施術説明動画が生成されました",
        };
      } catch (error) {
        console.error("Explanation video generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "施術説明動画生成に失敗しました",
        });
      }
    }),

  // テンプレート機能（要件定義書3.5.2に基づく - フェーズ3）
  createTemplate: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        name: z.string().min(1, "テンプレート名を入力してください"),
        contentType: z.enum([
          "instagram_lp",
          "website_article",
          "campaign_copy",
          "instagram_post_text",
          "instagram_post_image",
          "instagram_story",
          "ad_banner",
          "lp_visual",
          "instagram_reels",
          "tiktok_video",
          "youtube_shorts",
          "treatment_explanation_video",
          "pre_care_video",
          "post_care_video",
          "faq_video",
        ]),
        settings: z.record(z.string(), z.unknown()), // JSON形式の設定
        isDefault: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // デフォルトテンプレートを設定する場合、既存のデフォルトを解除
        if (input.isDefault) {
          await db.contentTemplate.updateMany({
            where: {
              userId: input.userId,
              contentType: input.contentType,
              isDefault: true,
            },
            data: {
              isDefault: false,
            },
          });
        }

        const template = await db.contentTemplate.create({
          data: {
            userId: input.userId,
            name: input.name,
            contentType: input.contentType,
            settings: JSON.stringify(input.settings),
            isDefault: input.isDefault,
          },
        });

        return {
          id: template.id,
          name: template.name,
          contentType: template.contentType,
          settings: JSON.parse(template.settings),
          isDefault: template.isDefault,
          message: "テンプレートを保存しました",
        };
      } catch (error) {
        console.error("Template creation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "テンプレートの保存に失敗しました",
        });
      }
    }),

  listTemplates: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        contentType: z
          .enum([
            "instagram_lp",
            "website_article",
            "campaign_copy",
            "instagram_post_text",
            "instagram_post_image",
            "instagram_story",
            "ad_banner",
            "lp_visual",
            "instagram_reels",
            "tiktok_video",
            "youtube_shorts",
            "treatment_explanation_video",
            "pre_care_video",
            "post_care_video",
            "faq_video",
          ])
          .optional(),
      }),
    )
    .query(async ({ input }) => {
      const where = {
        userId: input.userId,
        ...(input.contentType && { contentType: input.contentType }),
      };

      const templates = await db.contentTemplate.findMany({
        where,
        orderBy: [
          { isDefault: "desc" },
          { createdAt: "desc" },
        ],
      });

      return templates.map((template) => ({
        id: template.id,
        name: template.name,
        contentType: template.contentType,
        settings: JSON.parse(template.settings),
        isDefault: template.isDefault,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      }));
    }),

  getTemplate: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        userId: z.number().int().positive(),
      }),
    )
    .query(async ({ input }) => {
      const template = await db.contentTemplate.findFirst({
        where: {
          id: input.id,
          userId: input.userId,
        },
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "テンプレートが見つかりません",
        });
      }

      return {
        id: template.id,
        name: template.name,
        contentType: template.contentType,
        settings: JSON.parse(template.settings),
        isDefault: template.isDefault,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      };
    }),

  updateTemplate: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        userId: z.number().int().positive(),
        name: z.string().min(1).optional(),
        settings: z.record(z.string(), z.unknown()).optional(),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // 既存のテンプレートを確認
        const existing = await db.contentTemplate.findFirst({
          where: {
            id: input.id,
            userId: input.userId,
          },
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "テンプレートが見つかりません",
          });
        }

        // デフォルトテンプレートを設定する場合、既存のデフォルトを解除
        if (input.isDefault) {
          await db.contentTemplate.updateMany({
            where: {
              userId: input.userId,
              contentType: existing.contentType,
              isDefault: true,
              id: { not: input.id },
            },
            data: {
              isDefault: false,
            },
          });
        }

        const updateData: {
          name?: string;
          settings?: string;
          isDefault?: boolean;
        } = {};

        if (input.name !== undefined) updateData.name = input.name;
        if (input.settings !== undefined) updateData.settings = JSON.stringify(input.settings);
        if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;

        const template = await db.contentTemplate.update({
          where: { id: input.id },
          data: updateData,
        });

        return {
          id: template.id,
          name: template.name,
          contentType: template.contentType,
          settings: JSON.parse(template.settings),
          isDefault: template.isDefault,
          message: "テンプレートを更新しました",
        };
      } catch (error) {
        console.error("Template update error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "テンプレートの更新に失敗しました",
        });
      }
    }),

  deleteTemplate: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        userId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const template = await db.contentTemplate.findFirst({
          where: {
            id: input.id,
            userId: input.userId,
          },
        });

        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "テンプレートが見つかりません",
          });
        }

        await db.contentTemplate.delete({
          where: { id: input.id },
        });

        return {
          message: "テンプレートを削除しました",
        };
      } catch (error) {
        console.error("Template deletion error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "テンプレートの削除に失敗しました",
        });
      }
    }),

  // バッチ生成機能（要件定義書3.5.2に基づく - フェーズ3）
  batchGenerate: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        strategyId: z.number().int().positive().optional(),
        templateId: z.number().int().positive().optional(),
        contentType: z.enum([
          "instagram_post_text",
          "ad_banner",
          "website_article",
          "campaign_copy",
          "instagram_square",
          "instagram_vertical",
          "instagram_story",
          "ad_banner_horizontal",
          "ad_banner_square",
          "lp_visual",
        ]),
        campaigns: z.array(
          z.object({
            title: z.string().min(1),
            description: z.string().min(1).max(500),
            targetAudience: z.string().optional(),
            promotion: z.string().optional(),
          })
        ).min(1).max(100), // 最大100件まで
        options: z.object({
          tone: z.enum(["formal", "casual", "friendly", "professional"]).optional().default("friendly"),
          maxLength: z.number().int().positive().optional(),
          includeKeywords: z.array(z.string()).optional().default([]),
          ctaType: z.enum(["reserve", "details", "inquiry", "check_now"]).optional().default("reserve"),
          seoKeywords: z.array(z.string()).optional().default([]),
          imageStyle: z.enum(["minimal", "gorgeous", "natural", "modern", "elegant"]).optional(),
          colorScheme: z.string().optional(),
          includeElements: z.object({
            logo: z.boolean().optional().default(false),
            price: z.boolean().optional().default(false),
            textOverlay: z.boolean().optional().default(false),
            beforeAfter: z.boolean().optional().default(false),
          }).optional(),
          count: z.number().int().min(1).max(5).optional().default(1),
        }).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const results = [];
        const errors = [];
        const total = input.campaigns.length;
        
        // テキスト生成の場合
        const isTextContent = [
          "instagram_post_text",
          "ad_banner",
          "website_article",
          "campaign_copy",
        ].includes(input.contentType);
        
        // 画像生成の場合
        const isImageContent = [
          "instagram_square",
          "instagram_vertical",
          "instagram_story",
          "ad_banner_horizontal",
          "ad_banner_square",
          "lp_visual",
        ].includes(input.contentType);
        
        for (let i = 0; i < input.campaigns.length; i++) {
          const campaign = input.campaigns[i]!;
          
          try {
            if (isTextContent) {
              const options: TextGenerationOptions = {
                campaignInfo: campaign,
                tone: input.options?.tone || "friendly",
                maxLength: input.options?.maxLength,
                includeKeywords: input.options?.includeKeywords || [],
                ctaType: input.options?.ctaType || "reserve",
                seoKeywords: input.options?.seoKeywords || [],
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
                  result = await generateWebsiteArticle(campaign, input.options?.seoKeywords);
                  break;
                case "campaign_copy":
                  const campaignCopyTone = input.options?.tone === "professional" ? "professional" : 
                                         input.options?.tone === "casual" ? "friendly" : "friendly";
                  result = await generateCampaignCopy(campaign, campaignCopyTone);
                  break;
                default:
                  throw new Error(`Unsupported content type: ${input.contentType}`);
              }
              
              // コンプライアンスチェック
              const complianceCheck = checkProhibitedPhrases(result);
              const complianceStatus = complianceCheck.hasProhibited ? "violation" : "compliant";
              const complianceReport = JSON.stringify({
                hasProhibited: complianceCheck.hasProhibited,
                foundPhrases: complianceCheck.foundPhrases,
                checkedAt: new Date().toISOString(),
              });
              
              const saved = await db.generatedContent.create({
                data: {
                  userId: input.userId,
                  strategyId: input.strategyId || 0,
                  templateId: input.templateId || undefined,
                  contentType: input.contentType,
                  title: campaign.title,
                  content: result,
                  metadata: JSON.stringify({
                    tone: input.options?.tone,
                    maxLength: input.options?.maxLength,
                    includeKeywords: input.options?.includeKeywords,
                    ctaType: input.options?.ctaType,
                    seoKeywords: input.options?.seoKeywords,
                    batchIndex: i,
                  }),
                  aiAgent: "chatgpt",
                  complianceStatus,
                  complianceReport,
                },
              });
              
              results.push({
                index: i,
                campaignTitle: campaign.title,
                contentId: saved.id,
                status: "success",
              });
            } else if (isImageContent) {
              // 画像生成 - 既存のgenerateImage mutationと同じロジックを使用
              // 画像タイプからプリセットとサイズを決定
              const imageTypeMap: Record<string, { preset: ImagePreset; theme: ImageTheme; size: { width: number; height: number } }> = {
                instagram_square: { preset: "instagram_square", theme: "clinic_interior", size: { width: 1080, height: 1080 } },
                instagram_vertical: { preset: "custom", theme: "clinic_interior", size: { width: 1080, height: 1350 } },
                instagram_story: { preset: "custom", theme: "clinic_interior", size: { width: 1080, height: 1920 } },
                ad_banner_horizontal: { preset: "lp_banner", theme: "season_event", size: { width: 1200, height: 628 } },
                ad_banner_square: { preset: "instagram_square", theme: "season_event", size: { width: 1080, height: 1080 } },
                lp_visual: { preset: "custom", theme: "clinic_interior", size: { width: 1920, height: 1080 } },
              };
              
              const imageConfig = imageTypeMap[input.contentType] || imageTypeMap.instagram_square;
              
              const imageOptions: ImageGenerationOptions = {
                preset: imageConfig.preset,
                theme: imageConfig.theme,
                customSize: imageConfig.preset === "custom" ? imageConfig.size : undefined,
                prompt: `${campaign.title}: ${campaign.description}`,
              };
              
              const contentText = `${campaign.title}\n${campaign.description}`;
              const generatedImage = await generateImage(imageOptions, contentText);
              
              // コンプライアンスチェック（ビフォーアフター写真の場合）
              let complianceStatus: string | null = null;
              let complianceReport: string | null = null;
              
              if (input.options?.includeElements?.beforeAfter) {
                complianceStatus = "warning"; // ビフォーアフターは要確認
                complianceReport = JSON.stringify({
                  warning: "ビフォーアフター写真は医療広告ガイドラインに準拠しているか確認が必要です",
                  checkedAt: new Date().toISOString(),
                });
              }
              
              const saved = await db.generatedContent.create({
                data: {
                  userId: input.userId,
                  strategyId: input.strategyId || 0,
                  templateId: input.templateId || undefined,
                  contentType: input.contentType as any, // ContentType enumにキャスト
                  title: campaign.title,
                  content: generatedImage.url,
                  fileUrl: generatedImage.url,
                  mimeType: "image/png",
                  metadata: JSON.stringify({
                    imageType: input.contentType,
                    preset: generatedImage.preset,
                    theme: generatedImage.theme,
                    width: generatedImage.width,
                    height: generatedImage.height,
                    imageStyle: input.options?.imageStyle,
                    includeElements: input.options?.includeElements,
                    batchIndex: i,
                  }),
                  aiAgent: "chatgpt",
                  complianceStatus,
                  complianceReport,
                },
              });
              
              results.push({
                index: i,
                campaignTitle: campaign.title,
                contentId: saved.id,
                status: "success",
              });
            }
          } catch (error) {
            console.error(`Batch generation error for campaign ${i}:`, error);
            errors.push({
              index: i,
              campaignTitle: campaign.title,
              error: error instanceof Error ? error.message : "生成に失敗しました",
            });
          }
        }
        
        return {
          total,
          success: results.length,
          failed: errors.length,
          results,
          errors,
          message: `${results.length}/${total}件のコンテンツが生成されました`,
        };
      } catch (error) {
        console.error("Batch generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "バッチ生成に失敗しました",
        });
      }
    }),
});

