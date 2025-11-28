import { TRPCClientError } from "@trpc/client";
import type { ContentGenerationFormState } from "./useContentGenerationFormState";
import type { useContentMutations } from "./useContentMutations";
import {
  videoContentTypeOptions,
  getDefaultMaxLength,
} from "../constants/content-type-options";
import { USER_ID_PLACEHOLDER } from "@/lib/constants";

type MutationsReturnType = ReturnType<typeof useContentMutations>;

export function useContentSubmit(
  formState: ContentGenerationFormState,
  mutations: MutationsReturnType
) {
  const {
    selection: { contentCategory, contentType },
    campaign: { campaignTitle, campaignDescription, targetAudience, promotion },
    text: { tone, maxLength, includeKeywords, ctaType, seoKeywords },
    image: { imageStyle, colorScheme, includeElements, imageCount },
    video: {
      videoDuration,
      videoAspectRatio,
      bgmEnabled,
      textOverlay,
      videoStyle,
      videoCount,
      treatmentName,
      videoScript,
      avatarId,
      videoLanguage,
      videoBackground,
    },
    campaign: { designApproach, lpCount },
    template: { selectedTemplateId },
    feedback: { setFeedback },
    preview: { setPreviewContent, setSelectedVariationIndex, setEditableContent },
  } = formState;

  const {
    instagramLPMutation,
    articleMutation,
    copyMutation,
    generateTextMutation,
    generateImageMutation,
    generateShortVideoMutation,
    generateExplanationVideoMutation,
  } = mutations;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback({ type: null, message: "" });
    setPreviewContent(null);
    setSelectedVariationIndex(0);
    setEditableContent({});

    if (!contentType) {
      setFeedback({
        type: "error",
        message: "コンテンツタイプを選択してください",
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      return;
    }

    if (!campaignTitle.trim() || !campaignDescription.trim()) {
      setFeedback({
        type: "error",
        message: "キャンペーン名と説明を入力してください",
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      return;
    }

    try {
      // 動画生成の場合
      if (contentCategory === "video") {
        const videoOption = videoContentTypeOptions.find((opt) => opt.value === contentType);

        if (videoOption?.type === "short") {
          // Map contentType to videoType enum
          const videoTypeMap: Record<string, "reels" | "tiktok" | "youtube_shorts"> = {
            instagram_reels: "reels",
            tiktok_video: "tiktok",
            youtube_shorts: "youtube_shorts",
          };
          const videoType = videoTypeMap[contentType] || "reels";

          await generateShortVideoMutation.mutateAsync({
            userId: USER_ID_PLACEHOLDER,
            videoType: videoType,
            templateId: selectedTemplateId || undefined,
            campaignInfo: {
              title: campaignTitle.trim(),
              description: campaignDescription.trim(),
            },
            duration: videoDuration,
            aspectRatio: videoAspectRatio,
            bgmEnabled: bgmEnabled,
            textOverlay: textOverlay,
            videoStyle: videoStyle,
            count: videoCount,
          });
        } else if (videoOption?.type === "explanation") {
          if (!treatmentName.trim() || !videoScript.trim()) {
            setFeedback({
              type: "error",
              message: "施術名とスクリプトを入力してください",
            });
            setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
            return;
          }

          // Map contentType to videoType enum
          const explanationVideoTypeMap: Record<string, "treatment_explanation" | "pre_care" | "post_care" | "faq"> = {
            treatment_explanation_video: "treatment_explanation",
            pre_care_video: "pre_care",
            post_care_video: "post_care",
            faq_video: "faq",
          };
          const explanationVideoType = explanationVideoTypeMap[contentType] || "treatment_explanation";

          await generateExplanationVideoMutation.mutateAsync({
            userId: USER_ID_PLACEHOLDER,
            videoType: explanationVideoType,
            treatmentName: treatmentName.trim(),
            script: videoScript.trim(),
            duration: 120,
            avatarId: avatarId || undefined,
            language: videoLanguage,
            background: videoBackground,
          });
        }
      }
      // 画像生成の場合
      else if (
        contentCategory === "image" &&
        [
          "instagram_square",
          "instagram_vertical",
          "instagram_story",
          "ad_banner_horizontal",
          "ad_banner_square",
          "lp_visual",
        ].includes(contentType)
      ) {
        await generateImageMutation.mutateAsync({
          userId: USER_ID_PLACEHOLDER,
          imageType: contentType as any,
          templateId: selectedTemplateId || undefined,
          campaignInfo: {
            title: campaignTitle.trim(),
            description: campaignDescription.trim(),
          },
          colorScheme: colorScheme || undefined,
          includeElements: includeElements,
          imageStyle: imageStyle,
          count: imageCount,
        });
      }
      // 拡張されたテキスト生成の場合
      else if (["instagram_post_text", "ad_banner"].includes(contentType)) {
        const effectiveMaxLength = maxLength || getDefaultMaxLength(contentType);
        await generateTextMutation.mutateAsync({
          userId: USER_ID_PLACEHOLDER,
          contentType: contentType as any,
          templateId: selectedTemplateId || undefined,
          campaignInfo: {
            title: campaignTitle.trim(),
            description: campaignDescription.trim(),
            targetAudience: targetAudience.trim() || undefined,
            promotion: promotion.trim() || undefined,
          },
          tone: tone,
          maxLength: effectiveMaxLength,
          includeKeywords: includeKeywords.length > 0 ? includeKeywords : undefined,
          ctaType: ctaType,
          seoKeywords: seoKeywords.length > 0 ? seoKeywords : undefined,
          count: lpCount,
        });
      }
      // 既存のコンテンツタイプ
      else if (contentType === "instagram_lp") {
        const result = await instagramLPMutation.mutateAsync({
          userId: USER_ID_PLACEHOLDER,
          campaignTitle: campaignTitle.trim(),
          campaignDescription: campaignDescription.trim(),
          targetAudience: targetAudience.trim() || undefined,
          promotion: promotion.trim() || undefined,
          designApproach,
          count: lpCount,
        });
        setPreviewContent({
          type: "instagram_lp",
          data: result,
        });
      } else if (contentType === "website_article") {
        const result = await articleMutation.mutateAsync({
          userId: USER_ID_PLACEHOLDER,
          campaignTitle: campaignTitle.trim(),
          campaignDescription: campaignDescription.trim(),
          targetAudience: targetAudience.trim() || undefined,
          seoKeywords: seoKeywords.length > 0 ? seoKeywords : undefined,
        });
        setPreviewContent({
          type: "website_article",
          data: result,
        });
      } else if (contentType === "campaign_copy") {
        const result = await copyMutation.mutateAsync({
          userId: USER_ID_PLACEHOLDER,
          campaignTitle: campaignTitle.trim(),
          campaignDescription: campaignDescription.trim(),
          targetAudience: targetAudience.trim() || undefined,
          promotion: promotion.trim() || undefined,
          tone:
            tone === "formal" || tone === "casual"
              ? "friendly"
              : tone === "professional"
                ? "professional"
                : "friendly",
        });
        setPreviewContent({
          type: "campaign_copy",
          data: result,
        });
      }
    } catch (error) {
      if (error instanceof TRPCClientError) {
        setFeedback({ type: "error", message: error.message });
        setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      }
    }
  };

  return { handleSubmit };
}

