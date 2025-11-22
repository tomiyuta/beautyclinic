import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../trpc";
import { generateImage, type ImageGenerationOptions, type ImagePreset, type ImageTheme } from "@/server/services/image-generation";
import { imageGenerationInputSchema } from "@/server/api/schemas/content";
import { saveGeneratedContent } from "@/server/api/utils/generated-content";

export const contentImageRouter = router({
  // 画像生成
  generateImage: publicProcedure.input(imageGenerationInputSchema)
    .mutation(async ({ input }) => {
      try {
        // imageTypeからpresetとthemeをマッピング
        const imageTypeToPreset: Record<string, ImagePreset> = {
          instagram_square: "instagram_square",
          instagram_vertical: "custom",
          instagram_story: "custom",
          ad_banner_horizontal: "lp_banner",
          ad_banner_square: "instagram_square",
          lp_visual: "custom",
        };

        const imageTypeToCustomSize: Record<string, { width: number; height: number } | undefined> = {
          instagram_vertical: { width: 1080, height: 1350 },
          instagram_story: { width: 1080, height: 1920 },
          lp_visual: { width: 1920, height: 1080 },
        };

        const imageTypeToTheme: Record<string, ImageTheme> = {
          instagram_square: "clinic_interior",
          instagram_vertical: "clinic_interior",
          instagram_story: "season_event",
          ad_banner_horizontal: "season_event",
          ad_banner_square: "season_event",
          lp_visual: "clinic_interior",
        };

        const preset = imageTypeToPreset[input.imageType] || "instagram_square";
        const theme = imageTypeToTheme[input.imageType] || "clinic_interior";
        const customSize = imageTypeToCustomSize[input.imageType];

        // imageStyleをプロンプトに含める
        const stylePrompt = input.imageStyle 
          ? `Style: ${input.imageStyle === "gorgeous" ? "luxurious and elegant" : input.imageStyle === "minimal" ? "minimalist and clean" : input.imageStyle === "natural" ? "natural and organic" : input.imageStyle === "modern" ? "modern and contemporary" : "elegant and sophisticated"}. `
          : "";

        // カラースキームと含める要素をプロンプトに追加
        const colorSchemePrompt = input.colorScheme ? `Color scheme: ${input.colorScheme}. ` : "";
        const elementsPrompt = input.includeElements
          ? `Include: ${input.includeElements.logo ? "logo, " : ""}${input.includeElements.price ? "price information, " : ""}${input.includeElements.textOverlay ? "text overlay, " : ""}${input.includeElements.beforeAfter ? "before/after comparison, " : ""}`.replace(/, $/, "").trim()
          : "";

        // プロンプトを構築
        const enhancedPrompt = `${input.campaignInfo.description}${stylePrompt ? ` ${stylePrompt}` : ""}${colorSchemePrompt}${elementsPrompt ? ` ${elementsPrompt}` : ""}`;

        const options: ImageGenerationOptions = {
          prompt: enhancedPrompt,
          preset,
          theme,
          customSize,
        };

        const variations = [];
        for (let i = 0; i < input.count; i++) {
          const result = await generateImage(options);

          const saved = await saveGeneratedContent({
            userId: input.userId,
            strategyId: input.strategyId,
            templateId: input.templateId,
            contentType: input.imageType as any,
            title: input.campaignInfo.title,
            content: JSON.stringify({ prompt: options.prompt, imageUrl: result.url }),
            aiAgent: "chatgpt", // DALL-E 3はChatGPT経由
            file: {
              url: result.url,
              size: undefined,
              mimeType: "image/png",
            },
            metadata: {
              preset,
              theme,
              colorScheme: input.colorScheme,
              includeElements: input.includeElements,
              prompt: options.prompt,
            },
          });

          variations.push({
            id: saved.id,
            imageUrl: result.url,
            prompt: options.prompt,
          });
        }

        return {
          variations,
          message: `${input.count}件の画像が生成されました`,
        };
      } catch (error) {
        console.error("Image generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "画像生成に失敗しました",
        });
      }
    }),
});

