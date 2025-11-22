"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import html2canvas from "html2canvas";
import Button from "@atlaskit/button";
import TextField from "@atlaskit/textfield";
import Textarea from "@atlaskit/textarea";
import Select from "@atlaskit/select";
import Banner from "@atlaskit/banner";
import Badge from "@atlaskit/badge";
import Tag from "@atlaskit/tag";
import Spinner from "@atlaskit/spinner";
import EmptyState from "@atlaskit/empty-state";
import Tabs, { Tab, TabList, TabPanel } from "@atlaskit/tabs";
import Checkbox from "@atlaskit/checkbox";
// ModalDialogは後で実装（シンプルなconfirmダイアログで代替）
import { api } from "@/trpc/react";
import { TRPCClientError } from "@trpc/client";

const USER_ID_PLACEHOLDER = 1;

// Instagram LPの視覚的プレビューコンポーネント
function InstagramLPPreview({ content, onExportImage }: { content: unknown; onExportImage?: (element: HTMLElement) => void }) {
  const contentText = typeof content === "string" ? content : String(content);
  
  const parseContent = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    let title = '';
    let headline = '';
    let description = '';
    const keyPoints: string[] = [];
    const benefits: string[] = [];
    let callToAction = '';
    const hashtags: string[] = [];
    
    let currentSection = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      
      if (line.includes('タイトル') || line.includes('タイトル:')) {
        currentSection = 'title';
        title = line.replace(/.*[:：]\s*/, '').trim() || lines[i + 1]?.trim() || '';
        if (title) i++;
        continue;
      }
      if (line.includes('ヘッドライン') || line.includes('メインヘッドライン')) {
        currentSection = 'headline';
        headline = line.replace(/.*[:：]\s*/, '').trim() || lines[i + 1]?.trim() || '';
        if (headline) i++;
        continue;
      }
      if (line.includes('説明') || line.includes('説明文')) {
        currentSection = 'description';
        continue;
      }
      if (line.includes('ポイント') || line.includes('キーポイント') || line.includes('主要ポイント')) {
        currentSection = 'keyPoints';
        continue;
      }
      if (line.includes('メリット') || line.includes('特典') || line.includes('ベネフィット')) {
        currentSection = 'benefits';
        continue;
      }
      if (line.includes('行動喚起') || line.includes('CTA') || line.includes('コールトゥアクション')) {
        currentSection = 'cta';
        callToAction = line.replace(/.*[:：]\s*/, '').trim() || lines[i + 1]?.trim() || '';
        if (callToAction) i++;
        continue;
      }
      if (line.includes('ハッシュタグ') || line.includes('ハッシュタッグ')) {
        currentSection = 'hashtags';
        continue;
      }
      
      if (currentSection === 'title' && !title && line) title = line;
      else if (currentSection === 'headline' && !headline && line) headline = line;
      else if (currentSection === 'description' && line && !line.startsWith('-') && !line.startsWith('•') && !line.startsWith('*')) {
        description += (description ? '\n' : '') + line;
      }
      else if (currentSection === 'keyPoints' && (line.startsWith('-') || line.startsWith('•') || line.startsWith('*') || line.startsWith('✓'))) {
        keyPoints.push(line.replace(/^[-•*✓]\s*/, '').trim());
      }
      else if (currentSection === 'benefits' && (line.startsWith('-') || line.startsWith('•') || line.startsWith('*'))) {
        benefits.push(line.replace(/^[-•*]\s*/, '').trim());
      }
      else if (currentSection === 'cta' && !callToAction && line) callToAction = line;
      else if (currentSection === 'hashtags' && (line.includes('#') || line.match(/^[#＃]/))) {
        const tags = line.match(/#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g) || [];
        hashtags.push(...tags.map(t => t.replace('#', '')));
      }
    }
    
    if (!title && !headline && lines.length > 0) {
      headline = lines[0]!;
    }
    if (!description && lines.length > 1) {
      description = lines.slice(1, 4).join('\n');
    }
    
    return { title, headline, description, keyPoints, benefits, callToAction, hashtags };
  };
  
  const parsed = parseContent(contentText);
  const displayTitle = parsed.title || parsed.headline || '';
  const displayDescription = parsed.description || contentText.split('\n').slice(1, 4).join('\n') || contentText;

  const previewRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {onExportImage && (
        <Button
          appearance="primary"
          onClick={() => {
            if (previewRef.current) {
              onExportImage(previewRef.current);
            }
          }}
        >
          📥 画像としてダウンロード
        </Button>
      )}
      <div ref={previewRef} style={{ margin: "0 auto", maxWidth: "400px", borderRadius: "8px", border: "2px solid #C1C7D0", background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}>
        {/* Instagram風のヘッダー */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #DFE1E6", padding: "12px 16px", background: "#FFFFFF" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(to bottom right, #9333EA, #EC4899)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#172B4D" }}>美容クリニック</div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div style={{ padding: "24px", background: "#FFFFFF" }}>
          {displayTitle && (
            <h3 style={{ marginBottom: "16px", fontSize: "20px", fontWeight: 700, color: "#172B4D", lineHeight: "1.25" }}>
              {displayTitle}
            </h3>
          )}

          {displayDescription && (
            <p style={{ marginBottom: "16px", whiteSpace: "pre-line", fontSize: "14px", lineHeight: "1.75", color: "#42526E" }}>
              {displayDescription}
            </p>
          )}

          {parsed.keyPoints.length > 0 && (
            <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {parsed.keyPoints.map((point, index) => (
                <div key={index} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <span style={{ marginTop: "4px", color: "#0052CC", fontWeight: 700 }}>✓</span>
                  <span style={{ flex: 1, fontSize: "14px", color: "#42526E" }}>{point}</span>
                </div>
              ))}
            </div>
          )}

          {parsed.benefits.length > 0 && (
            <div style={{ marginBottom: "16px", borderRadius: "8px", background: "linear-gradient(to right, #FDF2F8, #FAF5FF)", padding: "16px" }}>
              <h4 style={{ marginBottom: "8px", fontSize: "14px", fontWeight: 600, color: "#172B4D" }}>✨ 特典</h4>
              <ul style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {parsed.benefits.map((benefit, index) => (
                  <li key={index} style={{ fontSize: "14px", color: "#42526E" }}>
                    • {benefit}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parsed.callToAction && (
            <button style={{ marginBottom: "16px", width: "100%", borderRadius: "8px", background: "linear-gradient(to right, #EC4899, #9333EA)", padding: "12px 16px", fontSize: "16px", fontWeight: 600, color: "#FFFFFF", border: "none", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
              {parsed.callToAction}
            </button>
          )}

          {parsed.hashtags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", borderTop: "1px solid #DFE1E6", paddingTop: "12px" }}>
              {parsed.hashtags.map((tag, index) => (
                <span
                  key={index}
                  style={{ fontSize: "12px", color: "#0052CC", fontWeight: 500 }}
                >
                  #{tag.replace(/^#/, "")}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div style={{ borderTop: "1px solid #DFE1E6", padding: "12px 16px", background: "#FFFFFF" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "16px", color: "#6B778C" }}>
            <span style={{ fontSize: "20px" }}>❤️</span>
            <span style={{ fontSize: "20px" }}>💬</span>
            <span style={{ fontSize: "20px" }}>📤</span>
            <span style={{ marginLeft: "auto", fontSize: "12px" }}>{new Date().toLocaleDateString("ja-JP")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// テキストコンテンツタイプ（要件定義書3.1に基づく）
const textContentTypeOptions: Array<{ label: string; value: string; category: string }> = [
  { label: "Instagram用LP案", value: "instagram_lp", category: "text" },
  { label: "Instagram投稿文", value: "instagram_post_text", category: "text" },
  { label: "HP記事", value: "website_article", category: "text" },
  { label: "ブログ記事", value: "website_article", category: "text" }, // 暫定的にwebsite_articleを使用
  { label: "キャンペーンコピー", value: "campaign_copy", category: "text" },
  { label: "広告文（リスティング）", value: "ad_banner", category: "text" },
];

// 画像コンテンツタイプ（要件定義書3.2に基づく）
const imageContentTypeOptions: Array<{ label: string; value: string; category: string; size?: string }> = [
  { label: "Instagram投稿（正方形）", value: "instagram_square", category: "image", size: "1080x1080" },
  { label: "Instagram投稿（縦型）", value: "instagram_vertical", category: "image", size: "1080x1350" },
  { label: "Instagramストーリー", value: "instagram_story", category: "image", size: "1080x1920" },
  { label: "広告バナー（横型）", value: "ad_banner_horizontal", category: "image", size: "1200x628" },
  { label: "広告バナー（正方形）", value: "ad_banner_square", category: "image", size: "1080x1080" },
  { label: "LP用ビジュアル", value: "lp_visual", category: "image", size: "1920x1080" },
];

// 動画コンテンツタイプ（要件定義書3.3, 3.4に基づく - フェーズ2）
const videoContentTypeOptions: Array<{ label: string; value: string; category: string; type: "short" | "explanation" }> = [
  { label: "Instagram Reels", value: "reels", category: "video", type: "short" },
  { label: "TikTok動画", value: "tiktok", category: "video", type: "short" },
  { label: "YouTube Shorts", value: "youtube_shorts", category: "video", type: "short" },
  { label: "施術説明動画", value: "treatment_explanation", category: "video", type: "explanation" },
  { label: "事前ケア動画", value: "pre_care", category: "video", type: "explanation" },
  { label: "アフターケア動画", value: "post_care", category: "video", type: "explanation" },
  { label: "FAQ動画", value: "faq", category: "video", type: "explanation" },
];

const contentTypeOptions = [...textContentTypeOptions, ...imageContentTypeOptions, ...videoContentTypeOptions];

const designApproachOptions = [
  { label: "トレンディ", value: "trendy" },
  { label: "ミニマル", value: "minimal" },
  { label: "大胆", value: "bold" },
  { label: "エレガント", value: "elegant" },
];

const toneOptions = [
  { label: "フォーマル", value: "formal" },
  { label: "カジュアル", value: "casual" },
  { label: "親しみやすい", value: "friendly" },
  { label: "プロフェッショナル", value: "professional" },
];

const ctaTypeOptions = [
  { label: "予約する", value: "reserve" },
  { label: "詳細を見る", value: "details" },
  { label: "問い合わせる", value: "inquiry" },
  { label: "今すぐチェック", value: "check_now" },
];

const imageStyleOptions = [
  { label: "ミニマル", value: "minimal" },
  { label: "ゴージャス", value: "gorgeous" },
  { label: "ナチュラル", value: "natural" },
  { label: "モダン", value: "modern" },
  { label: "エレガント", value: "elegant" },
];

const videoDurationOptions = [
  { label: "5秒", value: 5 },
  { label: "10秒", value: 10 },
  { label: "15秒", value: 15 },
];

const videoAspectRatioOptions = [
  { label: "9:16 (縦型)", value: "9:16" },
  { label: "16:9 (横型)", value: "16:9" },
  { label: "1:1 (正方形)", value: "1:1" },
];

const videoStyleOptions = [
  { label: "リアル", value: "realistic" },
  { label: "アニメーション", value: "animation" },
  { label: "スライドショー", value: "slideshow" },
];

const videoLanguageOptions = [
  { label: "日本語", value: "ja" },
  { label: "英語", value: "en" },
  { label: "中国語", value: "zh" },
  { label: "韓国語", value: "ko" },
];

const videoBackgroundOptions = [
  { label: "クリニック", value: "clinic" },
  { label: "シンプル", value: "simple" },
];

export function ContentGeneration() {
  const [contentCategory, setContentCategory] = useState<"text" | "image" | "video" | "">("");
  const [contentType, setContentType] = useState<string>("");
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [promotion, setPromotion] = useState("");
  const [designApproach, setDesignApproach] = useState<
    "minimal" | "bold" | "elegant" | "trendy"
  >("trendy");
  const [lpCount, setLpCount] = useState(3);
  const [tone, setTone] = useState<"formal" | "casual" | "friendly" | "professional">("friendly");
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  
  // 新規追加（要件定義書3.1に基づく）
  const [maxLength, setMaxLength] = useState<number | undefined>(undefined);
  const [includeKeywords, setIncludeKeywords] = useState<string[]>([]);
  const [includeKeywordInput, setIncludeKeywordInput] = useState("");
  const [ctaType, setCtaType] = useState<"reserve" | "details" | "inquiry" | "check_now">("reserve");
  
  // 画像生成用（要件定義書3.2に基づく）
  const [imageStyle, setImageStyle] = useState<"minimal" | "gorgeous" | "natural" | "modern" | "elegant">("modern");
  const [colorScheme, setColorScheme] = useState("");
  const [includeElements, setIncludeElements] = useState({
    logo: false,
    price: false,
    textOverlay: false,
    beforeAfter: false,
  });
  const [imageCount, setImageCount] = useState(4);
  
  // 動画生成用（要件定義書3.3, 3.4に基づく - フェーズ2）
  const [videoDuration, setVideoDuration] = useState<5 | 10 | 15>(10);
  const [videoAspectRatio, setVideoAspectRatio] = useState<"9:16" | "16:9" | "1:1">("9:16");
  const [bgmEnabled, setBgmEnabled] = useState(false);
  const [textOverlay, setTextOverlay] = useState<string[]>([]);
  const [textOverlayInput, setTextOverlayInput] = useState("");
  const [videoStyle, setVideoStyle] = useState<"realistic" | "animation" | "slideshow">("realistic");
  const [videoCount, setVideoCount] = useState(2);
  const [treatmentName, setTreatmentName] = useState("");
  const [videoScript, setVideoScript] = useState("");
  const [avatarId, setAvatarId] = useState("");
  const [videoLanguage, setVideoLanguage] = useState<"ja" | "en" | "zh" | "ko">("ja");
  const [videoBackground, setVideoBackground] = useState<"clinic" | "simple">("simple");
  
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [previewContent, setPreviewContent] = useState<{
    type: string;
    data: unknown;
  } | null>(null);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);
  const [editableContent, setEditableContent] = useState<Record<number, string>>({});

  const utils = api.useUtils();

  const instagramLPMutation = api.content.generateInstagramLP.useMutation({
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "Instagram LP案が生成されました",
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
      resetForm();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      setFeedback({ type: "error", message });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    },
  });

  const articleMutation = api.content.generateWebsiteArticle.useMutation({
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "HP記事が生成されました",
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
      resetForm();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      setFeedback({ type: "error", message });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    },
  });

  const copyMutation = api.content.generateCampaignCopy.useMutation({
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "キャンペーンコピーが生成されました",
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
      resetForm();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      setFeedback({ type: "error", message });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    },
  });

  // 新規追加：拡張されたテキスト生成（要件定義書3.1に基づく）
  const generateTextMutation = api.content.generateText.useMutation({
    onSuccess: (data) => {
      setFeedback({
        type: "success",
        message: data.message,
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
      setPreviewContent({
        type: contentType,
        data: data.results,
      });
      setSelectedVariationIndex(0);
      // 初期編集可能コンテンツを設定
      const initialEditableContent: Record<number, string> = {};
      data.results.forEach((result: Record<string, unknown>, index: number) => {
        const id = typeof result.id === "number" ? result.id : index;
        const content = typeof result.content === "string" ? result.content : String(result.content || "");
        initialEditableContent[id] = content;
      });
      setEditableContent(initialEditableContent);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      setFeedback({ type: "error", message });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    },
  });

  // 新規追加：画像生成（要件定義書3.2に基づく）
  const generateImageMutation = api.content.generateImage.useMutation({
    onSuccess: (data) => {
      setFeedback({
        type: "success",
        message: data.message,
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
      setPreviewContent({
        type: "image",
        data: data.results,
      });
      setSelectedVariationIndex(0);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      setFeedback({ type: "error", message });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    },
  });

  // コンプライアンスチェック
  const checkComplianceMutation = api.content.checkCompliance.useMutation();

  // コンプライアンスログ（要件定義書3.5.3に基づく - フェーズ3）
  const [showComplianceLogs, setShowComplianceLogs] = useState(false);
  const complianceLogsQuery = api.content.listComplianceLogs.useQuery({
    userId: USER_ID_PLACEHOLDER,
    limit: 50,
  }, {
    enabled: showComplianceLogs,
  });

  // バッチ生成機能（要件定義書3.5.2に基づく - フェーズ3）
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ total: number; success: number; failed: number } | null>(null);
  
  // リアルタイムコンプライアンスチェック（要件定義書3.5.3に基づく）
  const [realtimeCompliance, setRealtimeCompliance] = useState<{
    status: "compliant" | "warning" | "violation" | null;
    foundPhrases: string[];
    warnings: string[];
    cleanedText?: string;
    suggestions?: Array<{ original: string; suggestion: string }>;
  } | null>(null);
  const [isCheckingCompliance, setIsCheckingCompliance] = useState(false);
  const [highlightedText, setHighlightedText] = useState<string>("");
  
  // デバウンス用のタイマー
  const complianceCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  
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
      
      // 問題箇所をハイライト
      let highlighted = text;
      const suggestions: Array<{ original: string; suggestion: string }> = [];
      
      if (result.foundPhrases && result.foundPhrases.length > 0) {
        result.foundPhrases.forEach((phrase: string) => {
          // ハイライト用のマーカーを追加
          highlighted = highlighted.replace(
            new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            `<mark style="background: #FFEBEE; color: #C62828; padding: 2px 4px; border-radius: 2px;">${phrase}</mark>`
          );
          
          // 代替案を生成
          const suggestion = getSuggestionForPhrase(phrase);
          if (suggestion) {
            suggestions.push({ original: phrase, suggestion });
          }
        });
      }
      
      setHighlightedText(highlighted);
      setRealtimeCompliance({
        status: result.status,
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
  
  // 禁止フレーズに対する代替案を取得
  const getSuggestionForPhrase = (phrase: string): string | null => {
    const suggestions: Record<string, string> = {
      "完全に治る": "改善が期待できます",
      "必ず治る": "効果が期待できます",
      "絶対に治る": "改善が期待できます",
      "100%治る": "効果が期待できます",
      "確実に治る": "効果が期待できます",
      "必ず効果がある": "効果が期待できます",
      "絶対に効果がある": "効果が期待できます",
      "完全に効果がある": "効果が期待できます",
      "No.1": "実績豊富な",
      "一番": "実績豊富な",
      "最高": "高品質な",
      "最強": "効果的な",
      "唯一": "独自の",
      "他にない": "特徴的な",
      "革命的な": "先進的な",
      "驚異的な": "優れた",
      "奇跡的な": "効果的な",
      "即効性": "効果が期待できる",
      "即座に": "早期に",
      "すぐに治る": "改善が期待できます",
      "たった1回で": "効果的な",
      "1回で完璧": "効果的な",
      "副作用なし": "安全性を重視した",
      "リスクなし": "安全性を重視した",
      "痛みなし": "痛みを最小限に抑えた",
      "ダウンタイムなし": "ダウンタイムを最小限に抑えた",
    };
    
    return suggestions[phrase] || null;
  };
  
  // 代替案を適用
  const handleApplySuggestion = (original: string, suggestion: string) => {
    const newText = campaignDescription.replace(new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), suggestion);
    setCampaignDescription(newText);
    handleCampaignDescriptionChange(newText);
  };
  
  // キャンペーン説明の変更時にリアルタイムチェック
  const handleCampaignDescriptionChange = (value: string) => {
    setCampaignDescription(value);
    
    // デバウンス（500ms後にチェック）
    if (complianceCheckTimerRef.current) {
      clearTimeout(complianceCheckTimerRef.current);
    }
    
    complianceCheckTimerRef.current = setTimeout(() => {
      if (contentCategory === "text" || contentCategory === "image") {
        performRealtimeComplianceCheck(value);
      }
    }, 500);
  };
  
  const batchGenerateMutation = api.content.batchGenerate.useMutation({
    onSuccess: (data) => {
      setFeedback({
        type: "success",
        message: data.message,
      });
      setBatchProgress({
        total: data.total,
        success: data.success,
        failed: data.failed,
      });
      setShowBatchDialog(false);
      setCsvFile(null);
      setTimeout(() => {
        setFeedback({ type: null, message: "" });
        setBatchProgress(null);
      }, 10000);
      void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "バッチ生成に失敗しました";
      setFeedback({ type: "error", message });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    },
  });

  // CSVファイルをパース
  const handleCsvUpload = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      setFeedback({
        type: "error",
        message: "CSVファイルにはヘッダー行と少なくとも1行のデータが必要です",
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      return;
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
      setFeedback({
        type: "error",
        message: "有効なキャンペーンデータが見つかりませんでした",
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      return;
    }
    
    // バッチ生成を実行
    if (!contentType) {
      setFeedback({
        type: "error",
        message: "コンテンツタイプを選択してください",
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      return;
    }
    
    const isTextContent = ["instagram_post_text", "ad_banner", "website_article", "campaign_copy"].includes(contentType);
    const isImageContent = ["instagram_square", "instagram_vertical", "instagram_story", "ad_banner_horizontal", "ad_banner_square", "lp_visual"].includes(contentType);
    
    if (!isTextContent && !isImageContent) {
      setFeedback({
        type: "error",
        message: "バッチ生成はテキストまたは画像コンテンツのみ対応しています",
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      return;
    }
    
    batchGenerateMutation.mutate({
      userId: USER_ID_PLACEHOLDER,
      strategyId: undefined,
      templateId: selectedTemplateId || undefined,
      contentType: contentType as any,
      campaigns,
      options: {
        tone,
        maxLength,
        includeKeywords,
        ctaType,
        seoKeywords,
        imageStyle,
        colorScheme,
        includeElements,
        count: 1,
      },
    });
  };

  // 動画生成用mutation（要件定義書3.3, 3.4に基づく - フェーズ2）
  const generateShortVideoMutation = api.content.generateShortVideo.useMutation({
    onSuccess: (data) => {
      setFeedback({
        type: "success",
        message: data.message,
      });
      setPreviewContent({
        type: "video",
        data: data.results,
      });
      setSelectedVariationIndex(0);
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "動画生成に失敗しました";
      setFeedback({ type: "error", message });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    },
  });

  const generateExplanationVideoMutation = api.content.generateExplanationVideo.useMutation({
    onSuccess: (data) => {
      setFeedback({
        type: "success",
        message: data.message,
      });
      setPreviewContent({
        type: "video",
        data: { id: data.id, url: data.url, duration: data.duration },
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "説明動画生成に失敗しました";
      setFeedback({ type: "error", message });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    },
  });

  const contentsQuery = api.content.list.useQuery({
    userId: USER_ID_PLACEHOLDER,
  });

  // テンプレート機能（要件定義書3.5.2に基づく - フェーズ3）
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const templatesQuery = api.content.listTemplates.useQuery({
    userId: USER_ID_PLACEHOLDER,
    contentType: contentType as any,
  }, {
    enabled: !!contentType,
  });

  const createTemplateMutation = api.content.createTemplate.useMutation({
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "テンプレートを保存しました",
      });
      setShowTemplateDialog(false);
      setTemplateName("");
      void templatesQuery.refetch();
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "テンプレートの保存に失敗しました";
      setFeedback({ type: "error", message });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    },
  });

  const deleteTemplateMutation = api.content.deleteTemplate.useMutation({
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "テンプレートを削除しました",
      });
      void templatesQuery.refetch();
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "テンプレートの削除に失敗しました";
      setFeedback({ type: "error", message });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    },
  });

  // テンプレートを適用
  const handleApplyTemplate = (templateId: number) => {
    const template = templatesQuery.data?.find(t => t.id === templateId);
    if (!template) return;

    const settings = template.settings as Record<string, unknown>;
    setSelectedTemplateId(templateId);

    // テンプレートの設定をフォームに適用
    if (settings.tone) setTone(settings.tone as typeof tone);
    if (settings.maxLength) setMaxLength(settings.maxLength as number);
    if (settings.ctaType) setCtaType(settings.ctaType as typeof ctaType);
    if (settings.imageStyle) setImageStyle(settings.imageStyle as typeof imageStyle);
    if (settings.colorScheme) setColorScheme(settings.colorScheme as string);
    if (settings.includeElements) setIncludeElements(settings.includeElements as typeof includeElements);
    if (settings.imageCount) setImageCount(settings.imageCount as number);
    if (settings.videoDuration) setVideoDuration(settings.videoDuration as typeof videoDuration);
    if (settings.videoAspectRatio) setVideoAspectRatio(settings.videoAspectRatio as typeof videoAspectRatio);
    if (settings.videoStyle) setVideoStyle(settings.videoStyle as typeof videoStyle);
    if (settings.includeKeywords && Array.isArray(settings.includeKeywords)) {
      setIncludeKeywords(settings.includeKeywords as string[]);
    }
    if (settings.seoKeywords && Array.isArray(settings.seoKeywords)) {
      setSeoKeywords(settings.seoKeywords as string[]);
    }

    setFeedback({
      type: "success",
      message: "テンプレートを適用しました",
    });
    setTimeout(() => setFeedback({ type: null, message: "" }), 3000);
  };

  // テンプレートを保存
  const handleSaveTemplate = () => {
    if (!contentType || !templateName.trim()) {
      setFeedback({
        type: "error",
        message: "テンプレート名を入力してください",
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      return;
    }

    const settings: Record<string, unknown> = {
      tone,
      maxLength,
      ctaType,
      imageStyle,
      colorScheme,
      includeElements,
      imageCount,
      videoDuration,
      videoAspectRatio,
      videoStyle,
      includeKeywords,
      seoKeywords,
    };

    createTemplateMutation.mutate({
      userId: USER_ID_PLACEHOLDER,
      name: templateName.trim(),
      contentType: contentType as any,
      settings,
      isDefault: false,
    });
  };

  const modelInfoQuery = api.content.getCurrentModel.useQuery(undefined, {
    retry: 2,
    staleTime: 60000, // 1分間キャッシュ
  });

  // APIキーの状態を取得（動画生成用）
  const apiKeyStatusQuery = api.apiKey.getApiKeyStatus.useQuery(undefined, {
    retry: 2,
    staleTime: 60000, // 1分間キャッシュ
  });

  // コンテンツタイプに応じた使用AIを決定
  const getCurrentAIInfo = () => {
    if (!contentCategory || !contentType) {
      return { ...(modelInfoQuery.data || { aiAgent: "chatgpt", model: "gpt-5.1" }), backgroundColor: "#0052CC" };
    }

    // 動画生成の場合
    if (contentCategory === "video") {
      // videoContentTypeOptionsから該当するタイプを取得
      const videoType = videoContentTypeOptions.find(opt => opt.value === contentType);
      
      if (videoType) {
        // 短尺動画の場合
        if (videoType.type === "short") {
          const pikaLabsSet = apiKeyStatusQuery.data?.pikaLabs;
          return {
            aiAgent: "pika",
            model: pikaLabsSet ? "Pika Labs" : "未設定",
            backgroundColor: pikaLabsSet ? "#0052CC" : "#DE350B",
          };
        }
        // 説明動画の場合
        else if (videoType.type === "explanation") {
          const synthesiaSet = apiKeyStatusQuery.data?.synthesia;
          return {
            aiAgent: "synthesia",
            model: synthesiaSet ? "Synthesia" : "未設定",
            backgroundColor: synthesiaSet ? "#0052CC" : "#DE350B",
          };
        }
      }
    }

    // 画像生成の場合
    if (contentCategory === "image") {
      return {
        aiAgent: "chatgpt",
        model: "DALL-E 3",
        backgroundColor: "#0052CC",
      };
    }

    // テキスト生成の場合（デフォルト）
    return { ...(modelInfoQuery.data || { aiAgent: "chatgpt", model: "gpt-5.1" }), backgroundColor: "#0052CC" };
  };

  // コンテンツタイプやAPIキー状態が変更されたときに再計算
  // apiKeyStatusQuery.dataの変更を確実に検知するため、データ全体を依存配列に含める
  const currentAIInfo = useMemo(() => getCurrentAIInfo(), [
    contentCategory,
    contentType,
    apiKeyStatusQuery.data?.pikaLabs,
    apiKeyStatusQuery.data?.synthesia,
    modelInfoQuery.data,
  ]);

  const resetForm = () => {
    setCampaignTitle("");
    setCampaignDescription("");
    setTargetAudience("");
    setPromotion("");
    setSeoKeywords([]);
    setKeywordInput("");
    setIncludeKeywords([]);
    setIncludeKeywordInput("");
    setMaxLength(undefined);
    setCtaType("reserve");
    setColorScheme("");
    setIncludeElements({ logo: false, price: false, textOverlay: false, beforeAfter: false });
    setSelectedTemplateId(null);
    setTemplateName("");
    setShowTemplateDialog(false);
    setRealtimeCompliance(null);
    setHighlightedText("");
    
    // タイマーをクリア
    if (complianceCheckTimerRef.current) {
      clearTimeout(complianceCheckTimerRef.current);
      complianceCheckTimerRef.current = null;
    }
  };
  
  // コンポーネントのアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (complianceCheckTimerRef.current) {
        clearTimeout(complianceCheckTimerRef.current);
      }
    };
  }, []);

  const handleExportImage = async (element: HTMLElement) => {
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        useCORS: true,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });
      
      const url = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.download = `instagram-lp-${Date.now()}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setFeedback({
        type: "success",
        message: "画像をダウンロードしました",
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    } catch (error) {
      console.error("画像出力エラー:", error);
      setFeedback({
        type: "error",
        message: "画像の出力に失敗しました",
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    }
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !seoKeywords.includes(keywordInput.trim())) {
      setSeoKeywords([...seoKeywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setSeoKeywords(seoKeywords.filter((k) => k !== keyword));
  };

  const handleAddIncludeKeyword = () => {
    if (includeKeywordInput.trim() && !includeKeywords.includes(includeKeywordInput.trim())) {
      setIncludeKeywords([...includeKeywords, includeKeywordInput.trim()]);
      setIncludeKeywordInput("");
    }
  };

  const handleRemoveIncludeKeyword = (keyword: string) => {
    setIncludeKeywords(includeKeywords.filter((k) => k !== keyword));
  };

  const handleAddTextOverlay = () => {
    if (textOverlayInput.trim() && !textOverlay.includes(textOverlayInput.trim())) {
      setTextOverlay([...textOverlay, textOverlayInput.trim()]);
      setTextOverlayInput("");
    }
  };

  const handleRemoveTextOverlay = (overlay: string) => {
    setTextOverlay(textOverlay.filter((o) => o !== overlay));
  };

  // コンテンツタイプに応じたデフォルト文字数制限を取得
  const getDefaultMaxLength = (type: string): number | undefined => {
    const defaults: Record<string, number> = {
      instagram_post_text: 2200,
      ad_banner: 100,
      website_article: 3000,
      campaign_copy: 300,
    };
    return defaults[type];
  };

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
      // 動画生成の場合（要件定義書3.3, 3.4に基づく - フェーズ2）
      if (contentCategory === "video") {
        const videoOption = videoContentTypeOptions.find(opt => opt.value === contentType);
        
        if (videoOption?.type === "short") {
          // 短尺動画生成
          await generateShortVideoMutation.mutateAsync({
            userId: USER_ID_PLACEHOLDER,
            videoType: contentType as "reels" | "tiktok" | "youtube_shorts",
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
          // 施術説明動画生成
          if (!treatmentName.trim() || !videoScript.trim()) {
            setFeedback({
              type: "error",
              message: "施術名とスクリプトを入力してください",
            });
            setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
            return;
          }
          
          await generateExplanationVideoMutation.mutateAsync({
            userId: USER_ID_PLACEHOLDER,
            videoType: contentType as "treatment_explanation" | "pre_care" | "post_care" | "faq",
            treatmentName: treatmentName.trim(),
            script: videoScript.trim(),
            duration: 120, // デフォルト120秒
            avatarId: avatarId || undefined,
            language: videoLanguage,
            background: videoBackground,
          });
        }
      }
      // 画像生成の場合
      else if (contentCategory === "image" && [
        "instagram_square", "instagram_vertical", "instagram_story",
        "ad_banner_horizontal", "ad_banner_square", "lp_visual"
      ].includes(contentType)) {
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
          tone: tone === "formal" || tone === "casual" ? "friendly" : tone === "professional" ? "professional" : "friendly",
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

  const getContentTypeLabel = (type: string) => {
    const option = contentTypeOptions.find(opt => opt.value === type);
    return option ? option.label : type;
  };

  const getComplianceStatusLabel = (status: string | null | undefined) => {
    if (!status) return null;
    switch (status) {
      case "compliant":
        return { label: "準拠", appearance: "added" as const };
      case "warning":
        return { label: "警告", appearance: "default" as const };
      case "violation":
        return { label: "違反", appearance: "removed" as const };
      default:
        return null;
    }
  };

  const isPending = instagramLPMutation.isPending || articleMutation.isPending || copyMutation.isPending || 
                    generateTextMutation.isPending || generateImageMutation.isPending || 
                    generateShortVideoMutation.isPending || generateExplanationVideoMutation.isPending;

  // コンテンツタイプが変更されたときにデフォルト値を設定
  const handleContentTypeChange = (newType: string) => {
    setContentType(newType);
    const option = contentTypeOptions.find(opt => opt.value === newType);
    if (option) {
      setContentCategory(option.category as "text" | "image" | "video");
      const defaultLength = getDefaultMaxLength(newType);
      if (defaultLength) {
        setMaxLength(defaultLength);
      }
    }
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "48px 16px" }}>
      <header style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "#172B4D" }}>
            コンテンツ生成
          </h1>
          {currentAIInfo && (
            <div
              style={{
                padding: "4px 12px",
                borderRadius: "3px",
                backgroundColor: (currentAIInfo as any).backgroundColor || (currentAIInfo.model === "未設定" ? "#DE350B" : "#0052CC"),
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 500,
                whiteSpace: "nowrap",
                display: "inline-block",
              }}
            >
              使用AI: {currentAIInfo.aiAgent.toUpperCase()} ({currentAIInfo.model})
            </div>
          )}
        </div>
        <p style={{ fontSize: "14px", color: "#6B778C" }}>
          キャンペーン用のマーケティング素材を自動生成します
        </p>
      </header>

      {/* フィードバックメッセージ */}
      {feedback.type && (
        <Banner appearance={feedback.type === "success" ? "announcement" : "error"}>
          {feedback.message}
        </Banner>
      )}

      {/* コンテンツ生成フォーム */}
      <section style={{ marginBottom: "32px", padding: "32px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* カテゴリー選択 */}
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
              コンテンツカテゴリー *
            </label>
            <Select
              options={[
                { label: "テキストコンテンツ", value: "text" },
                { label: "画像コンテンツ", value: "image" },
                { label: "動画コンテンツ", value: "video" },
              ]}
              value={contentCategory ? { 
                label: contentCategory === "text" ? "テキストコンテンツ" : 
                       contentCategory === "image" ? "画像コンテンツ" : 
                       "動画コンテンツ", 
                value: contentCategory 
              } : null}
              onChange={(option) => {
                const cat = (option?.value as "text" | "image" | "video" | undefined) || "";
                setContentCategory(cat);
                setContentType("");
              }}
              placeholder="カテゴリーを選択してください"
              isRequired
            />
          </div>

          {/* コンテンツタイプ選択 */}
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
              コンテンツタイプ *
            </label>
            <Select
              options={
                contentCategory === "text" ? textContentTypeOptions : 
                contentCategory === "image" ? imageContentTypeOptions : 
                contentCategory === "video" ? videoContentTypeOptions : 
                contentTypeOptions
              }
              value={contentType ? (
                contentCategory === "text" ? textContentTypeOptions : 
                contentCategory === "image" ? imageContentTypeOptions : 
                contentCategory === "video" ? videoContentTypeOptions : 
                contentTypeOptions
              ).find(opt => opt.value === contentType) || null : null}
              onChange={(option) => handleContentTypeChange((option?.value as string | undefined) || "")}
              placeholder="タイプを選択してください"
              isRequired
              isDisabled={!contentCategory}
            />
          </div>

          {/* テンプレート選択（要件定義書3.5.2に基づく - フェーズ3） */}
          {contentType && templatesQuery.data && templatesQuery.data.length > 0 && (
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                テンプレート
              </label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <Select
                  options={templatesQuery.data.map(t => ({ label: t.name, value: t.id }))}
                  value={selectedTemplateId ? templatesQuery.data.find(t => t.id === selectedTemplateId) ? { label: templatesQuery.data.find(t => t.id === selectedTemplateId)!.name, value: selectedTemplateId } : null : null}
                  onChange={(option) => {
                    const templateId = option?.value as number | undefined;
                    if (templateId) handleApplyTemplate(templateId);
                  }}
                  placeholder="テンプレートを選択..."
                  isClearable
                />
                {selectedTemplateId && (
                  <Button
                    appearance="subtle"
                    onClick={() => {
                      if (confirm("このテンプレートを削除しますか？")) {
                        deleteTemplateMutation.mutate({
                          userId: USER_ID_PLACEHOLDER,
                          id: selectedTemplateId,
                        });
                        setSelectedTemplateId(null);
                      }
                    }}
                    isDisabled={deleteTemplateMutation.isPending}
                  >
                    削除
                  </Button>
                )}
              </div>
            </div>
          )}

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
              キャンペーン名 *
            </label>
            <TextField
              isRequired
              type="text"
              value={campaignTitle}
              onChange={(e) => setCampaignTitle((e.target as HTMLInputElement).value)}
              placeholder="例：11月限定 ダーマペンキャンペーン"
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
              キャンペーン説明 *
            </label>
            <div>
              <Textarea
                isRequired
                value={campaignDescription}
                onChange={(e) => handleCampaignDescriptionChange((e.target as HTMLTextAreaElement).value)}
                placeholder="キャンペーンの詳細な説明を入力してください"
                minimumRows={4}
                style={{ width: "100%" }}
              />
              {/* リアルタイムコンプライアンスチェック表示（要件定義書3.5.3に基づく） */}
              {realtimeCompliance && (contentCategory === "text" || contentCategory === "image") && (
                <div style={{ marginTop: "8px" }}>
                  {realtimeCompliance.status === "violation" && (
                    <div style={{ marginBottom: "8px" }}>
                      <Banner appearance="error">
                        <div style={{ fontSize: "14px" }}>
                          <strong>禁止フレーズが検出されました:</strong>
                          <ul style={{ margin: "4px 0 0 20px", padding: 0 }}>
                            {realtimeCompliance.foundPhrases.map((phrase, i) => (
                              <li key={i}>{phrase}</li>
                            ))}
                          </ul>
                        </div>
                      </Banner>
                      
                      {/* 問題箇所のハイライト表示 */}
                      {highlightedText && (
                        <div style={{ marginTop: "8px", padding: "12px", background: "#F4F5F7", borderRadius: "4px", border: "1px solid #DFE1E6" }}>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: "#172B4D", marginBottom: "4px" }}>
                            問題箇所（赤色でハイライト）:
                          </div>
                          <div 
                            style={{ fontSize: "14px", lineHeight: "1.6", color: "#172B4D" }}
                            dangerouslySetInnerHTML={{ __html: highlightedText }}
                          />
                        </div>
                      )}
                      
                      {/* 代替案の自動提示 */}
                      {realtimeCompliance.suggestions && realtimeCompliance.suggestions.length > 0 && (
                        <div style={{ marginTop: "8px", padding: "12px", background: "#E3FCEF", borderRadius: "4px", border: "1px solid #36B37E" }}>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: "#172B4D", marginBottom: "8px" }}>
                            推奨される代替表現:
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {realtimeCompliance.suggestions.map((suggestion: { original: string; suggestion: string }, i: number) => (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                                <span style={{ color: "#C62828" }}>「{suggestion.original}」</span>
                                <span>→</span>
                                <span style={{ color: "#36B37E", fontWeight: 600 }}>「{suggestion.suggestion}」</span>
                                <Button
                                  appearance="subtle"
                                  onClick={() => handleApplySuggestion(suggestion.original, suggestion.suggestion)}
                                >
                                  適用
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* 自動修正されたテキストを表示 */}
                      {realtimeCompliance.cleanedText && realtimeCompliance.cleanedText !== campaignDescription && (
                        <div style={{ marginTop: "8px", padding: "12px", background: "#FFF4E5", borderRadius: "4px", border: "1px solid #FFC400" }}>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: "#172B4D", marginBottom: "4px" }}>
                            自動修正案:
                          </div>
                          <div style={{ fontSize: "14px", lineHeight: "1.6", color: "#172B4D", marginBottom: "8px", whiteSpace: "pre-wrap" }}>
                            {realtimeCompliance.cleanedText}
                          </div>
                          <Button
                            appearance="default"
                            onClick={() => {
                              setCampaignDescription(realtimeCompliance.cleanedText || "");
                              handleCampaignDescriptionChange(realtimeCompliance.cleanedText || "");
                            }}
                          >
                            自動修正を適用
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {realtimeCompliance.status === "warning" && realtimeCompliance.warnings.length > 0 && (
                    <Banner appearance="warning">
                      <div style={{ fontSize: "14px" }}>
                        <strong>警告:</strong>
                        <ul style={{ margin: "4px 0 0 20px", padding: 0 }}>
                          {realtimeCompliance.warnings.map((warning, i) => (
                            <li key={i}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    </Banner>
                  )}
                  {realtimeCompliance.status === "compliant" && !isCheckingCompliance && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#36B37E" }}>
                      <span>✓</span>
                      <span>医療広告ガイドラインに準拠しています</span>
                    </div>
                  )}
                  {isCheckingCompliance && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#6B778C" }}>
                      <Spinner size="small" />
                      <span>コンプライアンスチェック中...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
              ターゲット層
            </label>
            <TextField
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience((e.target as HTMLInputElement).value)}
              placeholder="例：20-50代の美容に興味のある女性"
              style={{ width: "100%" }}
            />
          </div>

          {contentType === "instagram_lp" && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                  プロモーション内容
                </label>
                <TextField
                  type="text"
                  value={promotion}
                  onChange={(e) => setPromotion((e.target as HTMLInputElement).value)}
                  placeholder="例：初回20%OFF、2回目以降10%OFF"
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                  デザインアプローチ
                </label>
                <Select
                  options={designApproachOptions}
                  value={designApproachOptions.find(opt => opt.value === designApproach)}
                  onChange={(option) => setDesignApproach((option?.value as typeof designApproach) || "trendy")}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                  生成件数
                </label>
                <TextField
                  type="number"
                  min="1"
                  max="5"
                  value={lpCount.toString()}
                  onChange={(e) => setLpCount(Number.parseInt((e.target as HTMLInputElement).value, 10) || 3)}
                  style={{ width: "100%" }}
                />
              </div>
            </>
          )}

          {contentType === "website_article" && (
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                SEOキーワード
              </label>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <TextField
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                  placeholder="例：美容皮膚科、ダーマペン"
                  style={{ flex: 1 }}
                />
                <Button
                  type="button"
                  appearance="default"
                  onClick={handleAddKeyword}
                >
                  追加
                </Button>
              </div>
              {seoKeywords.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {seoKeywords.map((keyword) => (
                    <div key={keyword} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Tag text={keyword} />
                      <Button
                        appearance="subtle-link"
                        onClick={() => handleRemoveKeyword(keyword)}
                        style={{ padding: "0", minWidth: "auto" }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {contentType === "campaign_copy" && (
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                トーン
              </label>
              <Select
                options={toneOptions}
                value={toneOptions.find(opt => opt.value === tone)}
                onChange={(option) => setTone((option?.value as typeof tone) || "friendly")}
              />
            </div>
          )}

          {/* 拡張されたテキスト生成用の入力項目（要件定義書3.1に基づく） */}
          {["instagram_post_text", "ad_banner"].includes(contentType) && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                  トーン&マナー
                </label>
                <Select
                  options={toneOptions}
                  value={toneOptions.find(opt => opt.value === tone)}
                  onChange={(option) => setTone((option?.value as typeof tone) || "friendly")}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                  文字数制限
                </label>
                <TextField
                  type="number"
                  value={maxLength?.toString() || ""}
                  onChange={(e) => setMaxLength(Number.parseInt((e.target as HTMLInputElement).value, 10) || undefined)}
                  placeholder={`デフォルト: ${getDefaultMaxLength(contentType) || "なし"}`}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                  含めるキーワード
                </label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <TextField
                    type="text"
                    value={includeKeywordInput}
                    onChange={(e) => setIncludeKeywordInput((e.target as HTMLInputElement).value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddIncludeKeyword();
                      }
                    }}
                    placeholder="カンマ区切りで入力"
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="button"
                    appearance="default"
                    onClick={handleAddIncludeKeyword}
                  >
                    追加
                  </Button>
                </div>
                {includeKeywords.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {includeKeywords.map((keyword) => (
                      <div key={keyword} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Tag text={keyword} />
                        <Button
                          type="button"
                          appearance="subtle"
                          onClick={() => handleRemoveIncludeKeyword(keyword)}
                          style={{ padding: "0", minWidth: "auto" }}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                  CTA種類
                </label>
                <Select
                  options={ctaTypeOptions}
                  value={ctaTypeOptions.find(opt => opt.value === ctaType)}
                  onChange={(option) => setCtaType((option?.value as typeof ctaType) || "reserve")}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                  生成件数
                </label>
                <TextField
                  type="number"
                  min="1"
                  max="5"
                  value={lpCount.toString()}
                  onChange={(e) => setLpCount(Number.parseInt((e.target as HTMLInputElement).value, 10) || 3)}
                  style={{ width: "100%" }}
                />
              </div>
            </>
          )}

          {/* 画像生成用の入力項目（要件定義書3.2に基づく） */}
          {contentCategory === "image" && [
            "instagram_square", "instagram_vertical", "instagram_story",
            "ad_banner_horizontal", "ad_banner_square", "lp_visual"
          ].includes(contentType) && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                  画像スタイル
                </label>
                <Select
                  options={imageStyleOptions}
                  value={imageStyleOptions.find(opt => opt.value === imageStyle)}
                  onChange={(option) => setImageStyle((option?.value as typeof imageStyle) || "modern")}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                  カラースキーム
                </label>
                <TextField
                  type="text"
                  value={colorScheme}
                  onChange={(e) => setColorScheme((e.target as HTMLInputElement).value)}
                  placeholder="例：パステル、ビビッド、モノトーン"
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                  含める要素
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={includeElements.logo}
                      onChange={(e) => setIncludeElements({ ...includeElements, logo: e.target.checked })}
                    />
                    <span>クリニックロゴ</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={includeElements.price}
                      onChange={(e) => setIncludeElements({ ...includeElements, price: e.target.checked })}
                    />
                    <span>価格表示</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={includeElements.textOverlay}
                      onChange={(e) => setIncludeElements({ ...includeElements, textOverlay: e.target.checked })}
                    />
                    <span>テキストオーバーレイ</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={includeElements.beforeAfter}
                      onChange={(e) => setIncludeElements({ ...includeElements, beforeAfter: e.target.checked })}
                    />
                    <span>ビフォーアフター（ガイドライン準拠チェック付き）</span>
                  </label>
                </div>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                  生成件数
                </label>
                <TextField
                  type="number"
                  min="1"
                  max="4"
                  value={imageCount.toString()}
                  onChange={(e) => setImageCount(Number.parseInt((e.target as HTMLInputElement).value, 10) || 4)}
                  style={{ width: "100%" }}
                />
              </div>
            </>
          )}

          {/* 動画生成用の入力項目（要件定義書3.3, 3.4に基づく - フェーズ2） */}
          {contentCategory === "video" && (
            <>
              {["reels", "tiktok", "youtube_shorts"].includes(contentType) && (
                <>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px",                     fontWeight: 500, color: "#42526E" }}>
                      動画の長さ
                    </label>
                    <Select
                      options={videoDurationOptions}
                      value={videoDurationOptions.find(opt => opt.value === videoDuration)}
                      onChange={(option) => setVideoDuration((option?.value as 5 | 10 | 15) || 10)}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                      アスペクト比
                    </label>
                    <Select
                      options={videoAspectRatioOptions}
                      value={videoAspectRatioOptions.find(opt => opt.value === videoAspectRatio)}
                      onChange={(option) => setVideoAspectRatio((option?.value as "9:16" | "16:9" | "1:1") || "9:16")}
                    />
                  </div>
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={bgmEnabled}
                        onChange={(e) => setBgmEnabled(e.target.checked)}
                      />
                      <span>BGMを有効にする</span>
                    </label>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                      テキストオーバーレイ
                    </label>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                      <TextField
                        type="text"
                        value={textOverlayInput}
                        onChange={(e) => setTextOverlayInput((e.target as HTMLInputElement).value)}
                        placeholder="テキストを入力"
                        style={{ flex: 1 }}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTextOverlay();
                          }
                        }}
                      />
                      <Button onClick={handleAddTextOverlay}>追加</Button>
                    </div>
                    {textOverlay.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {textOverlay.map((overlay, index) => (
                          <div key={index} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 8px", background: "#F4F5F7", borderRadius: "4px" }}>
                            <span style={{ fontSize: "12px" }}>{overlay}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTextOverlay(overlay)}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#6B778C" }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                      動画スタイル
                    </label>
                    <Select
                      options={videoStyleOptions}
                      value={videoStyleOptions.find(opt => opt.value === videoStyle)}
                      onChange={(option) => setVideoStyle((option?.value as "realistic" | "animation" | "slideshow") || "realistic")}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                      生成件数
                    </label>
                    <TextField
                      type="number"
                      min="1"
                      max="2"
                      value={videoCount.toString()}
                      onChange={(e) => setVideoCount(Number.parseInt((e.target as HTMLInputElement).value, 10) || 2)}
                      style={{ width: "100%" }}
                    />
                  </div>
                </>
              )}
              {["treatment_explanation", "pre_care", "post_care", "faq"].includes(contentType) && (
                <>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                      施術名 *
                    </label>
                    <TextField
                      isRequired
                      type="text"
                      value={treatmentName}
                      onChange={(e) => setTreatmentName((e.target as HTMLInputElement).value)}
                      placeholder="例：ダーマペン"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                      スクリプト *
                    </label>
                    <Textarea
                      isRequired
                      value={videoScript}
                      onChange={(e) => setVideoScript((e.target as HTMLTextAreaElement).value)}
                      placeholder="動画の台本を入力してください"
                      minimumRows={6}
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                      言語
                    </label>
                    <Select
                      options={videoLanguageOptions}
                      value={videoLanguageOptions.find(opt => opt.value === videoLanguage)}
                      onChange={(option) => setVideoLanguage((option?.value as "ja" | "en" | "zh" | "ko") || "ja")}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                      背景
                    </label>
                    <Select
                      options={videoBackgroundOptions}
                      value={videoBackgroundOptions.find(opt => opt.value === videoBackground)}
                      onChange={(option) => setVideoBackground((option?.value as "clinic" | "simple") || "simple")}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                      アバターID（オプション）
                    </label>
                    <TextField
                      type="text"
                      value={avatarId}
                      onChange={(e) => setAvatarId((e.target as HTMLInputElement).value)}
                      placeholder="デフォルトアバターを使用する場合は空欄"
                      style={{ width: "100%" }}
                    />
                  </div>
                </>
              )}
            </>
          )}

          <div style={{ display: "flex", gap: "8px", justifyContent: "space-between", alignItems: "center" }}>
            <Button
              type="submit"
              appearance="primary"
              isDisabled={isPending}
            >
              {isPending ? "生成中..." : "コンテンツを生成"}
            </Button>
            <div style={{ display: "flex", gap: "8px" }}>
              {contentType && (
                <Button
                  appearance="default"
                  onClick={() => setShowTemplateDialog(true)}
                  isDisabled={isPending || !contentType}
                >
                  テンプレートとして保存
                </Button>
              )}
              <Button
                appearance="default"
                onClick={() => setShowBatchDialog(true)}
                isDisabled={isPending || !contentType}
              >
                CSV一括生成
              </Button>
            </div>
          </div>
        </form>
      </section>

      {/* バッチ生成ダイアログ */}
      {showBatchDialog && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "#FFFFFF",
            borderRadius: "8px",
            padding: "24px",
            minWidth: "500px",
            maxWidth: "700px",
            boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)",
          }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
              CSV一括生成
            </h3>
            <div style={{ marginBottom: "16px", fontSize: "14px", color: "#42526E" }}>
              <p style={{ marginBottom: "8px" }}>CSVファイル形式:</p>
              <pre style={{ background: "#F4F5F7", padding: "12px", borderRadius: "4px", fontSize: "12px", overflow: "auto" }}>
{`title,description,targetAudience,promotion
キャンペーン1,説明文1,ターゲット1,プロモーション1
キャンペーン2,説明文2,ターゲット2,プロモーション2`}
              </pre>
              <p style={{ marginTop: "8px", fontSize: "12px", color: "#6B778C" }}>
                ※ title（タイトル）とdescription（説明）は必須です。最大100件まで対応。
              </p>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setCsvFile(file);
                }}
                style={{ width: "100%" }}
              />
            </div>
            {batchProgress && (
              <div style={{ marginBottom: "16px", padding: "12px", background: "#E3FCEF", borderRadius: "4px" }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#172B4D", marginBottom: "4px" }}>
                  進捗: {batchProgress.success}/{batchProgress.total} 成功
                  {batchProgress.failed > 0 && `, ${batchProgress.failed} 失敗`}
                </div>
                <div style={{ width: "100%", height: "8px", background: "#DFE1E6", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{
                    width: `${(batchProgress.success / batchProgress.total) * 100}%`,
                    height: "100%",
                    background: "#36B37E",
                    transition: "width 0.3s",
                  }} />
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <Button
                appearance="subtle"
                onClick={() => {
                  setShowBatchDialog(false);
                  setCsvFile(null);
                  setBatchProgress(null);
                }}
              >
                キャンセル
              </Button>
              <Button
                appearance="primary"
                onClick={() => {
                  if (csvFile) {
                    handleCsvUpload(csvFile);
                  } else {
                    setFeedback({
                      type: "error",
                      message: "CSVファイルを選択してください",
                    });
                    setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
                  }
                }}
                isDisabled={!csvFile || batchGenerateMutation.isPending}
              >
                {batchGenerateMutation.isPending ? "生成中..." : "一括生成を開始"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* テンプレート保存ダイアログ */}
      {showTemplateDialog && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "#FFFFFF",
            borderRadius: "8px",
            padding: "24px",
            minWidth: "400px",
            maxWidth: "600px",
            boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)",
          }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
              テンプレートを保存
            </h3>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                テンプレート名 *
              </label>
              <TextField
                isRequired
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName((e.target as HTMLInputElement).value)}
                placeholder="例：Instagram投稿用デフォルト設定"
                style={{ width: "100%" }}
                autoFocus
              />
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <Button
                appearance="subtle"
                onClick={() => {
                  setShowTemplateDialog(false);
                  setTemplateName("");
                }}
              >
                キャンセル
              </Button>
              <Button
                appearance="primary"
                onClick={handleSaveTemplate}
                isDisabled={!templateName.trim() || createTemplateMutation.isPending}
              >
                {createTemplateMutation.isPending ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* プレビュー */}
      {previewContent && (
        <section style={{ marginBottom: "32px", padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>プレビュー</h2>
          <div style={{ borderRadius: "8px", border: "1px solid #DFE1E6", background: "#F4F5F7", padding: "16px" }}>
            {previewContent.type === "instagram_lp" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {Array.isArray(previewContent.data) &&
                  "results" in previewContent.data &&
                  Array.isArray(previewContent.data.results) &&
                  previewContent.data.results.map((item: unknown, index: number) => {
                    const result =
                      typeof item === "object" &&
                      item !== null &&
                      "result" in item
                        ? item.result
                        : null;
                    if (!result) return null;

                    return (
                      <div
                        key={index}
                        style={{ borderRadius: "8px", border: "1px solid #C1C7D0", background: "#FFFFFF", padding: "16px" }}
                      >
                        <h3 style={{ marginBottom: "16px", fontSize: "14px", fontWeight: 600, color: "#172B4D" }}>
                          案 {index + 1}
                          {"approach" in (item as Record<string, unknown>) &&
                            typeof (item as Record<string, unknown>).approach === "string" && (
                              <span style={{ marginLeft: "8px", fontSize: "12px", color: "#6B778C" }}>
                                ({(item as Record<string, unknown>).approach as string})
                              </span>
                            )}
                        </h3>
                        <InstagramLPPreview 
                          content={typeof result === "string" ? result : String(result)} 
                          onExportImage={handleExportImage}
                        />
                      </div>
                    );
                  })}
              </div>
            )}
            {previewContent.type === "website_article" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {"result" in (previewContent.data as Record<string, unknown>) && (
                  <div style={{ whiteSpace: "pre-line", fontSize: "14px", lineHeight: "1.75", color: "#172B4D" }}>
                    {typeof (previewContent.data as Record<string, unknown>).result === "string"
                      ? (previewContent.data as Record<string, unknown>).result as React.ReactNode
                      : String((previewContent.data as Record<string, unknown>).result)}
                  </div>
                )}
              </div>
            )}
            {previewContent.type === "campaign_copy" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {"result" in (previewContent.data as Record<string, unknown>) && (
                  <div style={{ whiteSpace: "pre-line", fontSize: "14px", lineHeight: "1.75", color: "#42526E" }}>
                    {typeof (previewContent.data as Record<string, unknown>).result === "string"
                      ? (previewContent.data as Record<string, unknown>).result as React.ReactNode
                      : String((previewContent.data as Record<string, unknown>).result)}
                  </div>
                )}
              </div>
            )}
            {/* 拡張されたテキスト生成のプレビュー（タブ形式） */}
            {["instagram_post_text", "ad_banner"].includes(previewContent.type) && Array.isArray(previewContent.data) && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#172B4D" }}>
                    生成結果
                  </h3>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Button
                      appearance="default"
                      onClick={async () => {
                        // 再生成（同じ入力で再生成）
                        setFeedback({ type: null, message: "" });
                        setPreviewContent(null);
                        setSelectedVariationIndex(0);
                        setEditableContent({});
                        
                        try {
                          if (["instagram_post_text", "ad_banner"].includes(contentType)) {
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
                        } catch (error) {
                          if (error instanceof TRPCClientError) {
                            setFeedback({ type: "error", message: error.message });
                            setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
                          }
                        }
                      }}
                      isDisabled={isPending}
                    >
                      再生成
                    </Button>
                  </div>
                </div>
                <Tabs
                  id="variation-tabs"
                  selected={selectedVariationIndex}
                  onChange={(index) => setSelectedVariationIndex(index)}
                >
                  <TabList>
                    {(previewContent.data as Array<Record<string, unknown>>).map((_, index) => (
                      <Tab key={index}>
                        バリエーション {index + 1}
                      </Tab>
                    ))}
                  </TabList>
                  {(previewContent.data as Array<Record<string, unknown>>).map((result, index) => {
                    const complianceStatus = typeof result.complianceStatus === "string" ? result.complianceStatus : undefined;
                    const resultId = typeof result.id === "number" ? result.id : index;
                    const content = editableContent[resultId] !== undefined 
                      ? editableContent[resultId] 
                      : (typeof result.content === "string" ? result.content : String(result.content || ""));
                    const complianceReport = result.complianceReport && typeof result.complianceReport === "object" 
                      ? result.complianceReport as Record<string, unknown> 
                      : null;
                    const foundPhrases = complianceReport && Array.isArray(complianceReport.foundPhrases) 
                      ? complianceReport.foundPhrases as string[] 
                      : [];
                    const charCount = content.length;
                    
                    return (
                      <TabPanel key={index}>
                        <div style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6", background: "#FFFFFF" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {complianceStatus && (
                                <Badge appearance={
                                  complianceStatus === "compliant" ? "added" : 
                                  complianceStatus === "warning" ? "default" : "removed"
                                }>
                                  {complianceStatus === "compliant" ? "準拠" : 
                                   complianceStatus === "warning" ? "警告" : "違反"}
                                </Badge>
                              )}
                              <span style={{ fontSize: "12px", color: "#6B778C" }}>
                                文字数: {charCount}
                              </span>
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <Button
                                appearance="subtle"
                                onClick={() => {
                                  // テキストファイルとしてダウンロード
                                  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement("a");
                                  link.download = `${previewContent.type}-${index + 1}-${Date.now()}.txt`;
                                  link.href = url;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  URL.revokeObjectURL(url);
                                }}
                              >
                                TXTダウンロード
                              </Button>
                              <Button
                                appearance="subtle"
                                onClick={() => {
                                  // JSON形式でエクスポート
                                  const exportData = {
                                    contentType: previewContent.type,
                                    variationIndex: index,
                                    content,
                                    complianceStatus,
                                    complianceReport,
                                    metadata: result,
                                    exportedAt: new Date().toISOString(),
                                  };
                                  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement("a");
                                  link.download = `${previewContent.type}-${index + 1}-${Date.now()}.json`;
                                  link.href = url;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  URL.revokeObjectURL(url);
                                }}
                              >
                                JSONダウンロード
                              </Button>
                            </div>
                          </div>
                          <Textarea
                            value={content}
                            onChange={(e) => {
                              const newContent = (e.target as HTMLTextAreaElement).value;
                              setEditableContent({ ...editableContent, [resultId]: newContent });
                            }}
                            placeholder="コンテンツを編集できます"
                            style={{ minHeight: "200px", fontSize: "14px", lineHeight: "1.75" }}
                          />
                          {foundPhrases.length > 0 && (
                            <div style={{ marginTop: "12px", padding: "12px", background: "#F4F5F7", borderRadius: "4px" }}>
                              <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", color: "#42526E" }}>
                                コンプライアンスチェック結果:
                              </div>
                              <div style={{ fontSize: "12px", color: "#DE350B" }}>
                                検出された禁止表現: {foundPhrases.join(", ")}
                              </div>
                            </div>
                          )}
                        </div>
                      </TabPanel>
                    );
                  })}
                </Tabs>
              </div>
            )}
            {/* 画像生成のプレビュー（グリッド表示） */}
            {previewContent.type === "image" && Array.isArray(previewContent.data) && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#172B4D" }}>
                    生成結果
                  </h3>
                  <Button
                    appearance="default"
                    onClick={async () => {
                      // 再生成
                      setFeedback({ type: null, message: "" });
                      setPreviewContent(null);
                      setSelectedVariationIndex(0);
                      
                      try {
                        if (contentCategory === "image" && [
                          "instagram_square", "instagram_vertical", "instagram_story",
                          "ad_banner_horizontal", "ad_banner_square", "lp_visual"
                        ].includes(contentType)) {
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
                      } catch (error) {
                        if (error instanceof TRPCClientError) {
                          setFeedback({ type: "error", message: error.message });
                          setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
                        }
                      }
                    }}
                    isDisabled={isPending}
                  >
                    再生成
                  </Button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
                  {(previewContent.data as Array<Record<string, unknown>>).map((result, index) => {
                    const complianceStatus = typeof result.complianceStatus === "string" ? result.complianceStatus : undefined;
                    const imageUrl = typeof result.url === "string" ? result.url : null;
                    const width = typeof result.width === "number" ? result.width : undefined;
                    const height = typeof result.height === "number" ? result.height : undefined;
                    
                    return (
                      <div key={index} style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6", background: "#FFFFFF" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#172B4D" }}>
                            バリエーション {index + 1}
                          </h3>
                          {complianceStatus && (
                            <Badge appearance={
                              complianceStatus === "compliant" ? "added" : 
                              complianceStatus === "warning" ? "default" : "removed"
                            }>
                              {complianceStatus === "compliant" ? "準拠" : 
                               complianceStatus === "warning" ? "警告" : "違反"}
                            </Badge>
                          )}
                        </div>
                        {imageUrl && (
                          <>
                            <div style={{ marginBottom: "8px", textAlign: "center" }}>
                              <img 
                                src={imageUrl} 
                                alt={`Generated image ${index + 1}`}
                                style={{ maxWidth: "100%", maxHeight: "400px", borderRadius: "4px", border: "1px solid #DFE1E6", objectFit: "contain" }}
                              />
                            </div>
                            {width && height && (
                              <div style={{ fontSize: "12px", color: "#6B778C", marginBottom: "8px", textAlign: "center" }}>
                                サイズ: {width} × {height}px
                              </div>
                            )}
                            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                              <Button
                                appearance="default"
                                onClick={() => {
                                  const link = document.createElement("a");
                                  link.download = `generated-image-${index + 1}-${Date.now()}.png`;
                                  link.href = imageUrl;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                              >
                                ダウンロード
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* 動画生成のプレビュー（要件定義書3.3, 3.4に基づく - フェーズ2） */}
            {previewContent.type === "video" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#172B4D" }}>
                    生成結果
                  </h3>
                  <Button
                    appearance="default"
                    onClick={async () => {
                      // 再生成
                      setFeedback({ type: null, message: "" });
                      setPreviewContent(null);
                      setSelectedVariationIndex(0);
                      
                      try {
                        if (contentCategory === "video") {
                          const videoOption = videoContentTypeOptions.find(opt => opt.value === contentType);
                          
                          if (videoOption?.type === "short") {
                            await generateShortVideoMutation.mutateAsync({
                              userId: USER_ID_PLACEHOLDER,
                              videoType: contentType as "reels" | "tiktok" | "youtube_shorts",
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
          await generateExplanationVideoMutation.mutateAsync({
            userId: USER_ID_PLACEHOLDER,
            videoType: contentType as "treatment_explanation" | "pre_care" | "post_care" | "faq",
            templateId: selectedTemplateId || undefined,
            treatmentName: treatmentName.trim(),
            script: videoScript.trim(),
            duration: 120,
            avatarId: avatarId || undefined,
            language: videoLanguage,
            background: videoBackground,
          });
                          }
                        }
                      } catch (error) {
                        if (error instanceof TRPCClientError) {
                          setFeedback({ type: "error", message: error.message });
                          setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
                        }
                      }
                    }}
                    isDisabled={isPending}
                  >
                    再生成
                  </Button>
                </div>
                {Array.isArray(previewContent.data) ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
                    {(previewContent.data as Array<Record<string, unknown>>).map((result, index) => {
                      const videoUrl = typeof result.url === "string" ? result.url : null;
                      const duration = typeof result.duration === "number" ? result.duration : undefined;
                      const thumbnailUrl = typeof result.thumbnailUrl === "string" ? result.thumbnailUrl : null;
                      
                      return (
                        <div key={index} style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6", background: "#FFFFFF" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#172B4D" }}>
                              バリエーション {index + 1}
                            </h3>
                            {duration && (
                              <span style={{ fontSize: "12px", color: "#6B778C" }}>
                                {duration}秒
                              </span>
                            )}
                          </div>
                          {videoUrl && (
                            <>
                              <div style={{ marginBottom: "8px", textAlign: "center" }}>
                                {thumbnailUrl ? (
                                  <img 
                                    src={thumbnailUrl} 
                                    alt={`Video thumbnail ${index + 1}`}
                                    style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "4px", border: "1px solid #DFE1E6", objectFit: "contain" }}
                                  />
                                ) : (
                                  <div style={{ 
                                    width: "100%", 
                                    height: "200px", 
                                    background: "#F4F5F7", 
                                    borderRadius: "4px", 
                                    display: "flex", 
                                    alignItems: "center", 
                                    justifyContent: "center",
                                    border: "1px solid #DFE1E6"
                                  }}>
                                    <span style={{ fontSize: "14px", color: "#6B778C" }}>動画プレビュー</span>
                                  </div>
                                )}
                              </div>
                              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                                <Button
                                  appearance="default"
                                  onClick={() => {
                                    window.open(videoUrl, "_blank");
                                  }}
                                >
                                  動画を開く
                                </Button>
                                <Button
                                  appearance="default"
                                  onClick={() => {
                                    const link = document.createElement("a");
                                    link.download = `generated-video-${index + 1}-${Date.now()}.mp4`;
                                    link.href = videoUrl;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }}
                                >
                                  ダウンロード
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6", background: "#FFFFFF" }}>
                    {typeof previewContent.data === "object" && previewContent.data !== null && "url" in previewContent.data && (
                      <>
                        <div style={{ marginBottom: "8px", textAlign: "center" }}>
                          <div style={{ 
                            width: "100%", 
                            height: "200px", 
                            background: "#F4F5F7", 
                            borderRadius: "4px", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            border: "1px solid #DFE1E6"
                          }}>
                            <span style={{ fontSize: "14px", color: "#6B778C" }}>動画プレビュー</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                          <Button
                            appearance="default"
                            onClick={() => {
                              const url = typeof (previewContent.data as Record<string, unknown>).url === "string" 
                                ? (previewContent.data as Record<string, unknown>).url as string 
                                : "";
                              if (url) window.open(url, "_blank");
                            }}
                          >
                            動画を開く
                          </Button>
                          <Button
                            appearance="default"
                            onClick={() => {
                              const url = typeof (previewContent.data as Record<string, unknown>).url === "string" 
                                ? (previewContent.data as Record<string, unknown>).url as string 
                                : "";
                              if (url) {
                                const link = document.createElement("a");
                                link.download = `generated-video-${Date.now()}.mp4`;
                                link.href = url;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }
                            }}
                          >
                            ダウンロード
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 生成履歴 */}
      <section style={{ padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6", marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#172B4D" }}>
            生成コンテンツ履歴
          </h2>
          <Button
            appearance="default"
            onClick={() => setShowComplianceLogs(!showComplianceLogs)}
          >
            {showComplianceLogs ? "コンプライアンスログを閉じる" : "コンプライアンスログを表示"}
          </Button>
        </div>
        {contentsQuery.isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "16px" }}>
            <Spinner size="small" />
            <span style={{ fontSize: "14px", color: "#6B778C" }}>読み込み中...</span>
          </div>
        )}
        {contentsQuery.error && (
          <Banner appearance="error">
            エラー: {contentsQuery.error.message}
          </Banner>
        )}
        {contentsQuery.data && contentsQuery.data.length === 0 && (
          <EmptyState
            header="まだ生成されたコンテンツがありません"
            description="上記のフォームからコンテンツを生成してください"
          />
        )}
        {contentsQuery.data && contentsQuery.data.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {contentsQuery.data.map((content) => (
              <div
                key={content.id}
                style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <Badge appearance="added">
                      {getContentTypeLabel(content.contentType)}
                    </Badge>
                    {content.complianceStatus && (() => {
                      const complianceInfo = getComplianceStatusLabel(content.complianceStatus);
                      return complianceInfo ? (
                        <Badge appearance={complianceInfo.appearance}>
                          {complianceInfo.label}
                        </Badge>
                      ) : null;
                    })()}
                    <span style={{ fontSize: "12px", color: "#6B778C" }}>
                      {new Date(content.createdAt).toLocaleString("ja-JP")}
                    </span>
                  </div>
                  <Badge appearance={content.status === "published" ? "added" : content.status === "approved" ? "default" : "removed"}>
                    {content.status === "published"
                      ? "公開済み"
                      : content.status === "approved"
                        ? "承認済み"
                        : "下書き"}
                  </Badge>
                </div>
                <h3 style={{ marginBottom: "8px", fontSize: "14px", fontWeight: 600, color: "#172B4D" }}>
                  {content.title}
                </h3>
                <details>
                  <summary style={{ cursor: "pointer", fontSize: "14px", fontWeight: 500, color: "#42526E", listStyle: "none" }}>
                    内容を表示
                  </summary>
                  <div style={{ marginTop: "8px" }}>
                    {content.contentType === "instagram_lp" ? (
                      <InstagramLPPreview 
                        content={content.content} 
                        onExportImage={handleExportImage}
                      />
                    ) : content.fileUrl && typeof content.fileUrl === "string" ? (
                      // ファイルURLがある場合（画像または動画）
                      (() => {
                        const mimeType = content.mimeType && typeof content.mimeType === "string" ? content.mimeType : "";
                        const isVideo = mimeType.startsWith("video/");
                        const videoContentTypes = ["instagram_reels", "tiktok_video", "youtube_shorts", "treatment_explanation_video", "pre_care_video", "post_care_video", "faq_video"];
                        const isVideoContent = videoContentTypes.includes(content.contentType);
                        const shouldShowVideo = isVideo || isVideoContent;
                        
                        // 動画コンテンツの場合
                        if (shouldShowVideo) {
                          const extension = mimeType.includes("mp4") ? "mp4" : mimeType.split("/")[1]?.split(";")[0] || "mp4";
                          return (
                            <div>
                              <video 
                                src={content.fileUrl} 
                                controls
                                style={{ maxWidth: "100%", maxHeight: "400px", borderRadius: "4px", border: "1px solid #DFE1E6" }}
                              >
                                お使いのブラウザは動画タグをサポートしていません。
                              </video>
                              <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                                <Button
                                  appearance="subtle"
                                  onClick={() => {
                                    if (content.fileUrl && typeof content.fileUrl === "string") {
                                      const link = document.createElement("a");
                                      link.download = `${content.contentType}-${content.id}-${Date.now()}.${extension}`;
                                      link.href = content.fileUrl;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }
                                  }}
                                >
                                  動画をダウンロード
                                </Button>
                              </div>
                            </div>
                          );
                        }
                        
                        // 画像コンテンツの場合
                        const extension = mimeType ? (mimeType.split("/")[1]?.split(";")[0] || "png") : "png";
                        return (
                          <div>
                            <img 
                              src={content.fileUrl} 
                              alt={content.title || "Generated content"}
                              style={{ maxWidth: "100%", maxHeight: "400px", borderRadius: "4px", border: "1px solid #DFE1E6" }}
                              onError={(e) => {
                                console.error("画像の読み込みに失敗しました:", content.fileUrl);
                                const target = e.target as HTMLImageElement;
                                if (target.parentElement) {
                                  const fallback = document.createElement("pre");
                                  fallback.style.cssText = "maxHeight: 240px; overflow: auto; borderRadius: 4px; background: #F4F5F7; padding: 12px; fontSize: 12px; color: #172B4D; whiteSpace: pre-wrap;";
                                  fallback.textContent = typeof content.content === "string" ? content.content : String(content.content);
                                  target.parentElement.replaceChild(fallback, target);
                                }
                              }}
                            />
                            <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                              <Button
                                appearance="subtle"
                                onClick={() => {
                                  if (content.fileUrl && typeof content.fileUrl === "string") {
                                    const link = document.createElement("a");
                                    link.download = `${content.contentType}-${content.id}-${Date.now()}.${extension}`;
                                    link.href = content.fileUrl;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }
                                }}
                              >
                                画像をダウンロード
                              </Button>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <pre style={{ maxHeight: "240px", overflow: "auto", borderRadius: "4px", background: "#F4F5F7", padding: "12px", fontSize: "12px", color: "#172B4D", whiteSpace: "pre-wrap" }}>
                        {typeof content.content === "string"
                          ? content.content
                          : String(content.content)}
                      </pre>
                    )}
                    {content.complianceReport && typeof content.complianceReport === "string" && (() => {
                      try {
                        const report = JSON.parse(content.complianceReport);
                        const foundPhrases = Array.isArray(report.foundPhrases) ? report.foundPhrases : [];
                        if (foundPhrases.length > 0) {
                          return (
                            <div style={{ marginTop: "12px", padding: "12px", background: "#FFF4E5", borderRadius: "4px", border: "1px solid #FFAB00" }}>
                              <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", color: "#42526E" }}>
                                コンプライアンスチェック結果:
                              </div>
                              <div style={{ fontSize: "12px", color: "#DE350B" }}>
                                検出された禁止表現: {foundPhrases.join(", ")}
                              </div>
                            </div>
                          );
                        }
                      } catch (e) {
                        return null;
                      }
                      return null;
                    })()}
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* コンプライアンスログ（要件定義書3.5.3に基づく - フェーズ3） */}
      {showComplianceLogs && (
        <section style={{ padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
            コンプライアンスログ
          </h2>
          {complianceLogsQuery.isLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "16px" }}>
              <Spinner size="small" />
              <span style={{ fontSize: "14px", color: "#6B778C" }}>読み込み中...</span>
            </div>
          )}
          {complianceLogsQuery.error && (
            <Banner appearance="error">
              エラー: {complianceLogsQuery.error.message}
            </Banner>
          )}
          {complianceLogsQuery.data && complianceLogsQuery.data.length === 0 && (
            <EmptyState
              header="コンプライアンスログがありません"
              description="コンテンツ生成時に自動的にチェックされます"
            />
          )}
          {complianceLogsQuery.data && complianceLogsQuery.data.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {complianceLogsQuery.data.map((log, index) => {
                const complianceInfo = getComplianceStatusLabel(log.status);
                const violations = log.violations && typeof log.violations === "object" && "foundPhrases" in log.violations
                  ? (log.violations as { foundPhrases?: string[] }).foundPhrases || []
                  : Array.isArray(log.violations) ? log.violations : [];
                
                return (
                  <div
                    key={log.id || index}
                    style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        {complianceInfo && (
                          <Badge appearance={complianceInfo.appearance}>
                            {complianceInfo.label}
                          </Badge>
                        )}
                        <Badge appearance="default">
                          {log.checkType === "text" ? "テキスト" : log.checkType === "image" ? "画像" : "動画"}
                        </Badge>
                        <span style={{ fontSize: "12px", color: "#6B778C" }}>
                          {new Date(log.checkedAt).toLocaleString("ja-JP")}
                        </span>
                      </div>
                      <span style={{ fontSize: "12px", color: "#6B778C" }}>
                        コンテンツID: {log.contentId}
                      </span>
                    </div>
                    {violations.length > 0 && (
                      <div style={{ marginTop: "8px", padding: "12px", background: "#FFF4E5", borderRadius: "4px", border: "1px solid #FFC400" }}>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#172B4D", marginBottom: "8px" }}>
                          検出された禁止フレーズ:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", color: "#42526E" }}>
                          {violations.map((phrase, i) => (
                            <li key={i}>{phrase}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {log.warnings && (() => {
                      const warnings = Array.isArray(log.warnings) 
                        ? log.warnings 
                        : typeof log.warnings === "object" && log.warnings !== null && "warnings" in log.warnings
                          ? Array.isArray((log.warnings as { warnings?: unknown[] }).warnings)
                            ? (log.warnings as { warnings: unknown[] }).warnings
                            : []
                          : [];
                      
                      return warnings.length > 0 ? (
                        <div style={{ marginTop: "8px", padding: "12px", background: "#E3FCEF", borderRadius: "4px", border: "1px solid #36B37E" }}>
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "#172B4D", marginBottom: "8px" }}>
                            警告:
                          </div>
                          <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", color: "#42526E" }}>
                            {warnings.map((warning: unknown, i: number) => (
                              <li key={i}>{typeof warning === "string" ? warning : String(warning)}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null;
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default ContentGeneration;
