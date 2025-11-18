"use client";

import { useState, useRef } from "react";
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

const contentTypeOptions = [
  { label: "Instagram用LP案", value: "instagram_lp" },
  { label: "HP記事", value: "website_article" },
  { label: "キャンペーンコピー", value: "campaign_copy" },
];

const designApproachOptions = [
  { label: "トレンディ", value: "trendy" },
  { label: "ミニマル", value: "minimal" },
  { label: "大胆", value: "bold" },
  { label: "エレガント", value: "elegant" },
];

const toneOptions = [
  { label: "親しみやすい", value: "friendly" },
  { label: "プロフェッショナル", value: "professional" },
  { label: "トレンディ", value: "trendy" },
];

export function ContentGeneration() {
  const [contentType, setContentType] = useState<
    "instagram_lp" | "website_article" | "campaign_copy" | ""
  >("");
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [promotion, setPromotion] = useState("");
  const [designApproach, setDesignApproach] = useState<
    "minimal" | "bold" | "elegant" | "trendy"
  >("trendy");
  const [lpCount, setLpCount] = useState(3);
  const [tone, setTone] = useState<"professional" | "friendly" | "trendy">(
    "friendly",
  );
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [previewContent, setPreviewContent] = useState<{
    type: string;
    data: unknown;
  } | null>(null);

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

  const contentsQuery = api.content.list.useQuery({
    userId: USER_ID_PLACEHOLDER,
  });

  const modelInfoQuery = api.content.getCurrentModel.useQuery(undefined, {
    retry: 2,
    staleTime: 60000, // 1分間キャッシュ
  });

  const resetForm = () => {
    setCampaignTitle("");
    setCampaignDescription("");
    setTargetAudience("");
    setPromotion("");
    setSeoKeywords([]);
    setKeywordInput("");
  };

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback({ type: null, message: "" });
    setPreviewContent(null);

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
      if (contentType === "instagram_lp") {
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
          tone,
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
    switch (type) {
      case "instagram_lp":
        return "Instagram LP";
      case "website_article":
        return "HP記事";
      case "campaign_copy":
        return "キャンペーンコピー";
      default:
        return type;
    }
  };

  const isPending = instagramLPMutation.isPending || articleMutation.isPending || copyMutation.isPending;

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "48px 16px" }}>
      <header style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "#172B4D" }}>
            コンテンツ生成
          </h1>
          {modelInfoQuery.data && (
            <div
              style={{
                padding: "4px 12px",
                borderRadius: "3px",
                backgroundColor: "#0052CC",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 500,
                whiteSpace: "nowrap",
                display: "inline-block",
              }}
            >
              使用AI: {modelInfoQuery.data.aiAgent.toUpperCase()} ({modelInfoQuery.data.model})
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
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
              コンテンツタイプ *
            </label>
            <Select
              options={contentTypeOptions}
              value={contentType ? contentTypeOptions.find(opt => opt.value === contentType) : null}
              onChange={(option) => setContentType((option?.value as typeof contentType) || "")}
              placeholder="選択してください"
              isRequired
            />
          </div>

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
            <Textarea
              isRequired
              value={campaignDescription}
              onChange={(e) => setCampaignDescription((e.target as HTMLTextAreaElement).value)}
              placeholder="キャンペーンの詳細な説明を入力してください"
              minimumRows={4}
              style={{ width: "100%" }}
            />
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

          <Button
            type="submit"
            appearance="primary"
            isDisabled={isPending}
          >
            {isPending ? "生成中..." : "コンテンツを生成"}
          </Button>
        </form>
      </section>

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
          </div>
        </section>
      )}

      {/* 生成履歴 */}
      <section style={{ padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
          生成コンテンツ履歴
        </h2>
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
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Badge appearance="added">
                      {getContentTypeLabel(content.contentType)}
                    </Badge>
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
                    ) : (
                      <pre style={{ maxHeight: "240px", overflow: "auto", borderRadius: "4px", background: "#F4F5F7", padding: "12px", fontSize: "12px", color: "#172B4D", whiteSpace: "pre-wrap" }}>
                        {typeof content.content === "string"
                          ? content.content
                          : String(content.content)}
                      </pre>
                    )}
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default ContentGeneration;
