import { useRef, useEffect } from "react";
import type { ContentGenerationFormState } from "./useContentGenerationFormState";
import { api } from "@/trpc/react";

const USER_ID_PLACEHOLDER = 1;

export function useContentFormHandlers(formState: ContentGenerationFormState) {
  const {
    selection: { contentCategory, contentType, setContentType, setContentCategory },
    campaign: { campaignDescription, setCampaignDescription },
    text,
    compliance: { setRealtimeCompliance, setIsCheckingCompliance, setHighlightedText },
  } = formState;

  const utils = api.useUtils();
  const checkComplianceMutation = api.content.checkCompliance.useMutation();
  const complianceCheckTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 禁止フレーズに対する代替案を取得
  const getSuggestionForPhrase = (phrase: string): string | null => {
    const suggestions: Record<string, string> = {
      "完全に治る": "改善が期待できます",
      "必ず治る": "効果が期待できます",
      "絶対に治る": "改善が期待できます",
      "100%治る": "効果が期待できます",
      "確実に治る": "効果が期待できます",
      "必ず効果がある": "効果が期待できます",
      "絶対に効果がある": "改善が期待できます",
      "リスクなし": "安全性を重視した",
      "痛みなし": "痛みを最小限に抑えた",
      "ダウンタイムなし": "ダウンタイムを最小限に抑えた",
    };
    return suggestions[phrase] || null;
  };

  // リアルタイムコンプライアンスチェック
  const performRealtimeComplianceCheck = async (text: string) => {
    if (!text.trim() || text.length < 10) {
      setRealtimeCompliance(null);
      setHighlightedText("");
      return;
    }

    setIsCheckingCompliance(true);
    try {
      const result = await checkComplianceMutation.mutateAsync({
        content: text,
        contentType: "text",
      });

      let highlighted = text;
      const suggestions: Array<{ original: string; suggestion: string }> = [];

      if (result.foundPhrases && result.foundPhrases.length > 0) {
        result.foundPhrases.forEach((phrase: string) => {
          highlighted = highlighted.replace(
            new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
            `<mark style="background: #FFEBEE; color: #C62828; padding: 2px 4px; border-radius: 2px;">${phrase}</mark>`
          );

          const suggestion = getSuggestionForPhrase(phrase);
          if (suggestion) {
            suggestions.push({ original: phrase, suggestion });
          }
        });
      }

      setHighlightedText(highlighted);
      setRealtimeCompliance({
        status: result.status as "compliant" | "warning" | "violation" | null,
        foundPhrases: result.foundPhrases || [],
        warnings: result.warnings || [],
        cleanedText: result.cleanedText,
        suggestions,
      });
    } catch (error) {
      console.error("Realtime compliance check error:", error);
    } finally {
      setIsCheckingCompliance(false);
    }
  };

  // キャンペーン説明の変更時にリアルタイムチェック
  const handleCampaignDescriptionChange = (value: string) => {
    setCampaignDescription(value);

    if (complianceCheckTimerRef.current) {
      clearTimeout(complianceCheckTimerRef.current);
    }

    complianceCheckTimerRef.current = setTimeout(() => {
      if (contentCategory === "text" || contentCategory === "image") {
        performRealtimeComplianceCheck(value);
      }
    }, 500);
  };

  // 代替案を適用
  const handleApplySuggestion = (original: string, suggestion: string) => {
    const newText = campaignDescription.replace(
      new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
      suggestion
    );
    setCampaignDescription(newText);
    handleCampaignDescriptionChange(newText);
  };

  // コンテンツタイプが変更されたときにデフォルト値を設定
  const handleContentTypeChange = (newType: string) => {
    setContentType(newType);
    // カテゴリーも自動設定
    const { contentTypeOptions, getDefaultMaxLength } = require("../constants/content-type-options");
    const option = contentTypeOptions.find((opt: { value: string; category: string }) => opt.value === newType);
    if (option) {
      setContentCategory(option.category as "text" | "image" | "video");
      const defaultLength = getDefaultMaxLength(newType);
      if (defaultLength && text.setMaxLength) {
        text.setMaxLength(defaultLength);
      }
    }
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (complianceCheckTimerRef.current) {
        clearTimeout(complianceCheckTimerRef.current);
      }
    };
  }, []);

  return {
    handleCampaignDescriptionChange,
    handleApplySuggestion,
    handleContentTypeChange,
    performRealtimeComplianceCheck,
    getSuggestionForPhrase,
  };
}

