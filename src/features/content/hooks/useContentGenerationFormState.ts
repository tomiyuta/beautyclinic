import { useState } from "react";

export type ContentCategory = "text" | "image" | "video" | "";

export type FeedbackState = {
  type: "success" | "error" | null;
  message: string;
};

export type PreviewContentState = {
  type: string;
  data: unknown;
} | null;

export type IncludeElementsState = {
  logo: boolean;
  price: boolean;
  textOverlay: boolean;
  beforeAfter: boolean;
};

export type RealtimeComplianceSuggestion = {
  original: string;
  suggestion: string;
};

export type RealtimeComplianceState = {
  status: "compliant" | "warning" | "violation" | null;
  foundPhrases: string[];
  warnings: string[];
  cleanedText?: string;
  suggestions?: RealtimeComplianceSuggestion[];
} | null;

export type BatchProgressState = {
  total: number;
  success: number;
  failed: number;
} | null;

export type ContentGenerationFormState = ReturnType<typeof useContentGenerationFormState>;

const defaultIncludeElements: IncludeElementsState = {
  logo: false,
  price: false,
  textOverlay: false,
  beforeAfter: false,
};

export function useContentGenerationFormState() {
  const [contentCategory, setContentCategory] = useState<ContentCategory>("");
  const [contentType, setContentType] = useState<string>("");

  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [promotion, setPromotion] = useState("");
  const [designApproach, setDesignApproach] =
    useState<"minimal" | "bold" | "elegant" | "trendy">("trendy");
  const [lpCount, setLpCount] = useState(3);

  const [tone, setTone] =
    useState<"formal" | "casual" | "friendly" | "professional">("friendly");
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [maxLength, setMaxLength] = useState<number | undefined>(undefined);
  const [includeKeywords, setIncludeKeywords] = useState<string[]>([]);
  const [includeKeywordInput, setIncludeKeywordInput] = useState("");
  const [ctaType, setCtaType] =
    useState<"reserve" | "details" | "inquiry" | "check_now">("reserve");

  const [imageStyle, setImageStyle] =
    useState<"minimal" | "gorgeous" | "natural" | "modern" | "elegant">("modern");
  const [colorScheme, setColorScheme] = useState("");
  const [includeElements, setIncludeElements] = useState<IncludeElementsState>(
    defaultIncludeElements,
  );
  const [imageCount, setImageCount] = useState(4);

  const [videoDuration, setVideoDuration] = useState<5 | 10 | 15>(10);
  const [videoAspectRatio, setVideoAspectRatio] =
    useState<"9:16" | "16:9" | "1:1" | "4:5" | "5:4" | "3:2" | "2:3">("9:16");
  const [bgmEnabled, setBgmEnabled] = useState(false);
  const [textOverlay, setTextOverlay] = useState<string[]>([]);
  const [textOverlayInput, setTextOverlayInput] = useState("");
  const [videoStyle, setVideoStyle] =
    useState<"realistic" | "animation" | "slideshow">("realistic");
  const [videoCount, setVideoCount] = useState(2);
  const [treatmentName, setTreatmentName] = useState("");
  const [videoScript, setVideoScript] = useState("");
  const [avatarId, setAvatarId] = useState("");
  const [videoLanguage, setVideoLanguage] =
    useState<"ja" | "en" | "zh" | "ko">("ja");
  const [videoBackground, setVideoBackground] =
    useState<"clinic" | "simple">("simple");

  const [feedback, setFeedback] = useState<FeedbackState>({
    type: null,
    message: "",
  });
  const [previewContent, setPreviewContent] = useState<PreviewContentState>(null);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);
  const [editableContent, setEditableContent] = useState<Record<number, string>>(
    {},
  );

  const [showComplianceLogs, setShowComplianceLogs] = useState(false);
  const [realtimeCompliance, setRealtimeCompliance] =
    useState<RealtimeComplianceState>(null);
  const [isCheckingCompliance, setIsCheckingCompliance] = useState(false);
  const [highlightedText, setHighlightedText] = useState<string>("");

  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [batchProgress, setBatchProgress] =
    useState<BatchProgressState>(null);

  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null,
  );
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");

  return {
    selection: {
      contentCategory,
      setContentCategory,
      contentType,
      setContentType,
    },
    campaign: {
      campaignTitle,
      setCampaignTitle,
      campaignDescription,
      setCampaignDescription,
      targetAudience,
      setTargetAudience,
      promotion,
      setPromotion,
      designApproach,
      setDesignApproach,
      lpCount,
      setLpCount,
    },
    text: {
      tone,
      setTone,
      seoKeywords,
      setSeoKeywords,
      keywordInput,
      setKeywordInput,
      maxLength,
      setMaxLength,
      includeKeywords,
      setIncludeKeywords,
      includeKeywordInput,
      setIncludeKeywordInput,
      ctaType,
      setCtaType,
    },
    image: {
      imageStyle,
      setImageStyle,
      colorScheme,
      setColorScheme,
      includeElements,
      setIncludeElements,
      imageCount,
      setImageCount,
    },
    video: {
      videoDuration,
      setVideoDuration,
      videoAspectRatio,
      setVideoAspectRatio,
      bgmEnabled,
      setBgmEnabled,
      textOverlay,
      setTextOverlay,
      textOverlayInput,
      setTextOverlayInput,
      videoStyle,
      setVideoStyle,
      videoCount,
      setVideoCount,
      treatmentName,
      setTreatmentName,
      videoScript,
      setVideoScript,
      avatarId,
      setAvatarId,
      videoLanguage,
      setVideoLanguage,
      videoBackground,
      setVideoBackground,
    },
    feedback: {
      feedback,
      setFeedback,
    },
    preview: {
      previewContent,
      setPreviewContent,
      selectedVariationIndex,
      setSelectedVariationIndex,
      editableContent,
      setEditableContent,
    },
    compliance: {
      showComplianceLogs,
      setShowComplianceLogs,
      realtimeCompliance,
      setRealtimeCompliance,
      isCheckingCompliance,
      setIsCheckingCompliance,
      highlightedText,
      setHighlightedText,
    },
    batch: {
      showBatchDialog,
      setShowBatchDialog,
      csvFile,
      setCsvFile,
      batchProgress,
      setBatchProgress,
    },
    template: {
      selectedTemplateId,
      setSelectedTemplateId,
      showTemplateDialog,
      setShowTemplateDialog,
      templateName,
      setTemplateName,
    },
  };
}

