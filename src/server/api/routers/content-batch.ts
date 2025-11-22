import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import {
  generateInstagramPostText,
  generateAdCopy,
  generateBlogArticle,
  generateCampaignCopy,
  type TextGenerationOptions,
} from "@/server/services/chatgpt";
import { generateImage, type ImageGenerationOptions } from "@/server/services/image-generation";
import { 
  generateShortVideoWithPika,
  generateExplanationVideoWithSynthesia,
} from "@/server/services/video-generation";
import { cleanTextForAdvertising, checkProhibitedPhrases } from "@/server/utils/advertising-guidelines";
import { saveGeneratedContent } from "@/server/api/utils/generated-content";

export const contentBatchRouter = router({
  // バッチ生成
  batchGenerate: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        strategyId: z.number().int().positive().optional(),
        templateId: z.number().int().positive().optional(),
        csvData: z.string().min(1),
        contentType: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { csvData, contentType, userId, strategyId, templateId } = input;

        // CSVデータをパース
        const lines = csvData.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "CSVデータにはヘッダー行と少なくとも1行のデータが必要です",
          });
        }

        const headers = lines[0]!.split(',').map(h => h.trim());
        const campaigns = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i]!.split(',').map(v => v.trim());
          const campaign: {
            title: string;
            description: string;
            targetAudience?: string;
            promotion?: string;
          } = {
            title: "",
            description: "",
          };

          headers.forEach((header, index) => {
            const value = values[index] || "";
            if (header.toLowerCase().includes('title') || header.toLowerCase().includes('タイトル')) {
              campaign.title = value;
            } else if (header.toLowerCase().includes('description') || header.toLowerCase().includes('説明')) {
              campaign.description = value;
            } else if (header.toLowerCase().includes('target') || header.toLowerCase().includes('ターゲット')) {
              campaign.targetAudience = value;
            } else if (header.toLowerCase().includes('promotion') || header.toLowerCase().includes('プロモーション')) {
              campaign.promotion = value;
            }
          });

          if (campaign.title && campaign.description) {
            campaigns.push(campaign);
          }
        }

        if (campaigns.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "有効なキャンペーンデータが見つかりません",
          });
        }

        // 非同期で生成を実行
        let success = 0;
        let failed = 0;

        const generatePromises = campaigns.map(async (campaign) => {
          try {
            // コンテンツタイプに応じて適切なサービス関数を直接呼び出す
            if (contentType.startsWith("instagram_") && !contentType.includes("reels") || 
                contentType === "campaign_copy" || 
                contentType === "website_article" ||
                contentType === "instagram_post_text" ||
                contentType === "ad_banner") {
              // テキスト生成
              const textOptions: TextGenerationOptions = {
                campaignInfo: campaign,
                tone: "friendly",
              };
              
              let result: string;
              switch (contentType) {
                case "instagram_post_text":
                  result = await generateInstagramPostText(textOptions);
                  break;
                case "ad_banner":
                  result = await generateAdCopy(textOptions);
                  break;
                case "website_article":
                  result = await generateBlogArticle(textOptions);
                  break;
                case "campaign_copy":
                  result = await generateCampaignCopy(campaign, "friendly");
                  break;
                default:
                  throw new Error(`Unsupported text content type: ${contentType}`);
              }
              
              // コンプライアンスチェック
              const complianceCheck = checkProhibitedPhrases(result);
              const cleanedResult = cleanTextForAdvertising(result);
              const complianceStatus = complianceCheck.hasProhibited ? "violation" : "compliant";
              
              await saveGeneratedContent({
                userId,
                strategyId,
                templateId,
                contentType: contentType as any,
                title: campaign.title,
                content: cleanedResult.cleanedText,
                aiAgent: "chatgpt",
                compliance: {
                  status: complianceStatus,
                  report: {
                    foundPhrases: complianceCheck.foundPhrases,
                    warnings: cleanedResult.warnings,
                  },
                },
              });
            } else if (contentType.includes("image") || contentType.includes("visual") || contentType.includes("banner")) {
              // 画像生成
              const imageOptions: ImageGenerationOptions = {
                prompt: campaign.description,
                preset: "instagram_square",
                theme: "clinic_interior",
              };
              
              const result = await generateImage(imageOptions);
              
              await saveGeneratedContent({
                userId,
                strategyId,
                templateId,
                contentType: contentType as any,
                title: campaign.title,
                content: JSON.stringify({ prompt: imageOptions.prompt }), // imageUrlはfileUrlに保存されているため不要
                aiAgent: "chatgpt",
                file: {
                  url: result.url,
                  size: undefined,
                  mimeType: "image/png",
                },
              });
            } else if (contentType.includes("video") || contentType.includes("reels") || contentType.includes("shorts")) {
              if (contentType.includes("explanation") || contentType.includes("care") || contentType.includes("faq")) {
                // 説明動画生成
                const result = await generateExplanationVideoWithSynthesia({
                  videoType: "treatment_explanation",
                  treatmentName: campaign.title,
                  script: campaign.description,
                  duration: 120,
                });
                
                await saveGeneratedContent({
                  userId,
                  strategyId,
                  templateId,
                  contentType: contentType as any,
                  title: campaign.title,
                  content: JSON.stringify({ script: campaign.description }), // videoUrlはfileUrlに保存されているため不要
                  aiAgent: "synthesia",
                  file: {
                    url: result.url,
                    size: undefined,
                    mimeType: "video/mp4",
                  },
                });
              } else {
                // 短尺動画生成
                const result = await generateShortVideoWithPika({
                  videoType: "reels",
                  prompt: campaign.description,
                  duration: 10,
                  aspectRatio: "9:16",
                });
                
                await saveGeneratedContent({
                  userId,
                  strategyId,
                  templateId,
                  contentType: contentType as any,
                  title: campaign.title,
                  content: JSON.stringify({ prompt: campaign.description }), // videoUrlはfileUrlに保存されているため不要
                  aiAgent: "pika",
                  file: {
                    url: result.url,
                    size: undefined,
                    mimeType: "video/mp4",
                  },
                });
              }
            }
            
            success++;
          } catch (error) {
            console.error(`Batch generation failed for campaign: ${campaign.title}`, error);
            failed++;
          }
        });

        await Promise.all(generatePromises);

        return {
          total: campaigns.length,
          success,
          failed,
          message: `${campaigns.length}件中${success}件の生成が完了しました`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Batch generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "バッチ生成に失敗しました",
        });
      }
    }),
});

