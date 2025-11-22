import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../trpc";
import { 
  generateShortVideoWithPika, 
  generateExplanationVideoWithSynthesia,
  type ShortVideoGenerationOptions,
  type ExplanationVideoGenerationOptions 
} from "@/server/services/video-generation";
import {
  shortVideoGenerationInputSchema,
  explanationVideoGenerationInputSchema,
} from "@/server/api/schemas/content";
import { saveGeneratedContent } from "@/server/api/utils/generated-content";

export const contentVideoRouter = router({
  // 短尺動画生成
  generateShortVideo: publicProcedure.input(shortVideoGenerationInputSchema)
    .mutation(async ({ input }) => {
      try {
        const videoTypeMap: Record<string, "reels" | "tiktok" | "youtube_shorts"> = {
          instagram_reels: "reels",
          tiktok_video: "tiktok",
          youtube_shorts: "youtube_shorts",
        };

        const videoType = videoTypeMap[input.videoType] || "reels";

        const options: ShortVideoGenerationOptions = {
          videoType,
          prompt: input.campaignInfo.description,
          duration: input.duration as 5 | 10 | 15,
          aspectRatio: input.aspectRatio as "9:16" | "16:9" | "1:1" | "4:5" | "5:4" | "3:2" | "2:3",
          resolution: input.resolution,
          bgmEnabled: input.bgmEnabled,
          textOverlay: input.textOverlay,
          videoStyle: input.videoStyle,
        };

        const variations = [];
        for (let i = 0; i < input.count; i++) {
          const result = await generateShortVideoWithPika(options);

          const saved = await saveGeneratedContent({
            userId: input.userId,
            strategyId: input.strategyId,
            templateId: input.templateId,
            contentType: input.videoType as any,
            title: input.campaignInfo.title,
            content: JSON.stringify({ prompt: options.prompt }), // videoUrlはfileUrlに保存されているため不要
            file: {
              url: result.url,
              size: undefined, // GeneratedVideoにはfileSizeがない
              mimeType: "video/mp4",
            },
            aiAgent: "pika",
            metadata: {
              videoType,
              duration: input.duration,
              aspectRatio: input.aspectRatio,
              resolution: input.resolution,
              bgmEnabled: input.bgmEnabled,
              textOverlay: input.textOverlay,
              videoStyle: input.videoStyle,
            },
          });

          variations.push({
            id: saved.id,
            videoUrl: result.url,
            prompt: options.prompt,
          });
        }

        return {
          variations,
          message: `${input.count}件の短尺動画が生成されました`,
        };
      } catch (error) {
        console.error("Short video generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "短尺動画生成に失敗しました",
        });
      }
    }),

  // 説明動画生成
  generateExplanationVideo: publicProcedure.input(explanationVideoGenerationInputSchema)
    .mutation(async ({ input }) => {
      try {
        const videoTypeMap: Record<string, "treatment_explanation" | "pre_care" | "post_care" | "faq"> = {
          treatment_explanation_video: "treatment_explanation",
          pre_care_video: "pre_care",
          post_care_video: "post_care",
          faq_video: "faq",
        };

        const videoType = videoTypeMap[input.videoType] || "treatment_explanation";

        const options: ExplanationVideoGenerationOptions = {
          videoType,
          treatmentName: input.treatmentName,
          script: input.script,
          duration: input.duration as 60 | 120 | 180,
          avatarId: input.avatarId,
          language: input.language,
          background: input.background,
        };

        const result = await generateExplanationVideoWithSynthesia(options);

        const saved = await saveGeneratedContent({
          userId: input.userId,
          strategyId: input.strategyId,
          templateId: input.templateId,
          contentType: input.videoType as any,
          title: input.treatmentName,
          content: JSON.stringify({ script: input.script }), // videoUrlはfileUrlに保存されているため不要
          aiAgent: "synthesia",
          file: {
            url: result.url,
            size: undefined,
            mimeType: "video/mp4",
          },
          metadata: {
            videoType,
            treatmentName: input.treatmentName,
            script: input.script,
            duration: input.duration,
            avatarId: input.avatarId,
            language: input.language,
            background: input.background,
          },
        });

        return {
          id: saved.id,
          videoUrl: result.url,
          message: "説明動画が生成されました",
        };
      } catch (error) {
        console.error("Explanation video generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "説明動画生成に失敗しました",
        });
      }
    }),
});

