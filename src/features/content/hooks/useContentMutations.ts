import { api } from "@/trpc/react";
import { TRPCClientError } from "@trpc/client";
import type { ContentGenerationFormState } from "./useContentGenerationFormState";
import { USER_ID_PLACEHOLDER } from "@/lib/constants";

export function useContentMutations(formState: ContentGenerationFormState) {
  const utils = api.useUtils();
  const { feedback, preview, selection } = formState;

  // 既存のmutation
  const instagramLPMutation = api.content.generateInstagramLP.useMutation({
    onSuccess: () => {
      feedback.setFeedback({
        type: "success",
        message: "Instagram LP案が生成されました",
      });
      setTimeout(() => feedback.setFeedback({ type: null, message: "" }), 5000);
      void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      feedback.setFeedback({ type: "error", message });
      setTimeout(() => feedback.setFeedback({ type: null, message: "" }), 5000);
    },
  });

  const articleMutation = api.content.generateWebsiteArticle.useMutation({
    onSuccess: () => {
      feedback.setFeedback({
        type: "success",
        message: "HP記事が生成されました",
      });
      setTimeout(() => feedback.setFeedback({ type: null, message: "" }), 5000);
      void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      feedback.setFeedback({ type: "error", message });
      setTimeout(() => feedback.setFeedback({ type: null, message: "" }), 5000);
    },
  });

  const copyMutation = api.content.generateCampaignCopy.useMutation({
    onSuccess: () => {
      feedback.setFeedback({
        type: "success",
        message: "キャンペーンコピーが生成されました",
      });
      setTimeout(() => feedback.setFeedback({ type: null, message: "" }), 5000);
      void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      feedback.setFeedback({ type: "error", message });
      setTimeout(() => feedback.setFeedback({ type: null, message: "" }), 5000);
    },
  });

  // 拡張されたテキスト生成
  const generateTextMutation = api.content.generateText.useMutation({
    onSuccess: (data) => {
      feedback.setFeedback({
        type: "success",
        message: data.message,
      });
      setTimeout(() => feedback.setFeedback({ type: null, message: "" }), 5000);
      void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
      preview.setPreviewContent({
        type: selection.contentType,
        data: data.variations || [],
      });
      preview.setSelectedVariationIndex(0);
      const initialEditableContent: Record<number, string> = {};
      (data.variations || []).forEach((result: Record<string, unknown>, index: number) => {
        const id = typeof result.id === "number" ? result.id : index;
        const content = typeof result.content === "string" ? result.content : String(result.content || "");
        initialEditableContent[id] = content;
      });
      preview.setEditableContent(initialEditableContent);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      feedback.setFeedback({ type: "error", message });
      setTimeout(() => feedback.setFeedback({ type: null, message: "" }), 5000);
    },
  });

  // 画像生成
  const generateImageMutation = api.content.generateImage.useMutation({
    onSuccess: (data) => {
      feedback.setFeedback({
        type: "success",
        message: data.message,
      });
      setTimeout(() => feedback.setFeedback({ type: null, message: "" }), 5000);
      void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
      preview.setPreviewContent({
        type: "image",
        data: data.variations || [],
      });
      preview.setSelectedVariationIndex(0);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      feedback.setFeedback({ type: "error", message });
      setTimeout(() => feedback.setFeedback({ type: null, message: "" }), 5000);
    },
  });

  // 動画生成
  const generateShortVideoMutation = api.content.generateShortVideo.useMutation({
    onSuccess: (data) => {
      feedback.setFeedback({
        type: "success",
        message: data.message,
      });
      preview.setPreviewContent({
        type: "video",
        data: data.variations || [],
      });
      preview.setSelectedVariationIndex(0);
      setTimeout(() => feedback.setFeedback({ type: null, message: "" }), 5000);
      void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "動画生成に失敗しました";
      feedback.setFeedback({ type: "error", message });
      setTimeout(() => feedback.setFeedback({ type: null, message: "" }), 5000);
    },
  });

  const generateExplanationVideoMutation = api.content.generateExplanationVideo.useMutation({
    onSuccess: (data) => {
      feedback.setFeedback({
        type: "success",
        message: data.message,
      });
      preview.setPreviewContent({
        type: "video",
        data: { id: data.id, url: data.videoUrl, videoUrl: data.videoUrl },
      });
      setTimeout(() => feedback.setFeedback({ type: null, message: "" }), 5000);
      void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "説明動画生成に失敗しました";
      feedback.setFeedback({ type: "error", message });
      setTimeout(() => feedback.setFeedback({ type: null, message: "" }), 5000);
    },
  });

  const isPending =
    instagramLPMutation.isPending ||
    articleMutation.isPending ||
    copyMutation.isPending ||
    generateTextMutation.isPending ||
    generateImageMutation.isPending ||
    generateShortVideoMutation.isPending ||
    generateExplanationVideoMutation.isPending;

  return {
    instagramLPMutation,
    articleMutation,
    copyMutation,
    generateTextMutation,
    generateImageMutation,
    generateShortVideoMutation,
    generateExplanationVideoMutation,
    isPending,
  };
}

