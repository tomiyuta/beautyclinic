"use client";

import { useState } from "react";
import Button from "@atlaskit/button";
import TextField from "@atlaskit/textfield";
import Textarea from "@atlaskit/textarea";
import Select from "@atlaskit/select";
import Banner from "@atlaskit/banner";
import Badge from "@atlaskit/badge";
import Tag from "@atlaskit/tag";
import Spinner from "@atlaskit/spinner";
import EmptyState from "@atlaskit/empty-state";
import Checkbox from "@atlaskit/checkbox";
import { api } from "@/trpc/react";
import { TRPCClientError } from "@trpc/client";

const USER_ID_PLACEHOLDER = 1;

// コンテンツタイプオプション（要件定義書に基づく）
const contentTypeOptions = [
  { label: "Instagram投稿", value: "instagram" },
  { label: "ブログ記事", value: "blog" },
  { label: "LP（ランディングページ）", value: "lp" },
];

// トーンオプション
const toneOptions = [
  { label: "上品で誠実", value: "上品で誠実" },
  { label: "カジュアルで親しみやすい", value: "カジュアルで親しみやすい" },
  { label: "プロフェッショナル", value: "プロフェッショナル" },
  { label: "トレンディ", value: "トレンディ" },
];

// CTAタイプオプション
const ctaTypeOptions = [
  { label: "予約", value: "予約" },
  { label: "カウンセリング", value: "カウンセリング" },
  { label: "LINE登録", value: "LINE登録" },
  { label: "なし", value: "なし" },
];

// 画像プリセットオプション
const imagePresetOptions = [
  { label: "Instagram正方形 (1080x1080)", value: "instagram_square" },
  { label: "LPバナー (1200x630)", value: "lp_banner" },
  { label: "カスタムサイズ", value: "custom" },
];

// 画像テーマオプション
const imageThemeOptions = [
  { label: "ビフォーアフター", value: "before_after" },
  { label: "季節・イベント", value: "season_event" },
  { label: "クリニック内装", value: "clinic_interior" },
  { label: "肌の質感", value: "texture_skin" },
];

// 記事の長さオプション
const articleLengthOptions = [
  { label: "短い (~800字)", value: "short" },
  { label: "中程度 (~1500字)", value: "medium" },
  { label: "長い (~2500字)", value: "long" },
];

// LPの主な目的オプション
const lpGoalOptions = [
  { label: "新規予約", value: "新規予約" },
  { label: "LINE登録", value: "LINE登録" },
  { label: "キャンペーン認知", value: "キャンペーン認知" },
];

export function ContentGenerator() {
  // 基本フォーム状態
  const [contentType, setContentType] = useState<"instagram" | "blog" | "lp" | "">("");
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [tone, setTone] = useState("上品で誠実");
  const [relatedTreatmentIds, setRelatedTreatmentIds] = useState<number[]>([]);
  const [snsResearchIds, setSnsResearchIds] = useState<number[]>([]);
  const [generateImage, setGenerateImage] = useState(true);

  // Instagram投稿用の状態
  const [hashtagsMaxCount, setHashtagsMaxCount] = useState(10);
  const [callToActionType, setCallToActionType] = useState<"予約" | "カウンセリング" | "LINE登録" | "なし">("予約");

  // ブログ記事用の状態
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [desiredLength, setDesiredLength] = useState<"short" | "medium" | "long">("medium");

  // LP用の状態
  const [primaryGoal, setPrimaryGoal] = useState<"新規予約" | "LINE登録" | "キャンペーン認知">("新規予約");
  const [normalPrice, setNormalPrice] = useState("");
  const [campaignPrice, setCampaignPrice] = useState("");

  // 画像生成設定
  const [imagePreset, setImagePreset] = useState<"instagram_square" | "lp_banner" | "custom">("instagram_square");
  const [imageTheme, setImageTheme] = useState("before_after");
  const [customWidth, setCustomWidth] = useState(1080);
  const [customHeight, setCustomHeight] = useState(1080);

  // UI状態
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [previewContent, setPreviewContent] = useState<{
    id: number;
    content: unknown;
    image?: { url: string } | null;
  } | null>(null);

  const utils = api.useUtils();

  // データ取得
  const productsQuery = api.product.list.useQuery({ userId: USER_ID_PLACEHOLDER });
  const snsResearchQuery = api.snsResearch.list.useQuery({ userId: USER_ID_PLACEHOLDER });

  // Mutations
  const instagramMutation = api.content.generateInstagramPostWithImage.useMutation({
    onSuccess: (data) => {
      setFeedback({
        type: "success",
        message: data.message || "Instagram投稿が生成されました",
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      void utils.content.listContents.invalidate({ userId: USER_ID_PLACEHOLDER });
      setPreviewContent({
        id: data.id,
        content: data.content,
        image: data.image && typeof data.image === "object" && data.image !== null && "url" in data.image
          ? { url: String((data.image as { url: string }).url) }
          : null,
      });
      resetForm();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      setFeedback({ type: "error", message });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    },
  });

  const blogMutation = api.content.generateBlogArticleWithImage.useMutation({
    onSuccess: (data) => {
      setFeedback({
        type: "success",
        message: data.message || "ブログ記事が生成されました",
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      void utils.content.listContents.invalidate({ userId: USER_ID_PLACEHOLDER });
      setPreviewContent({
        id: data.id,
        content: data.content,
        image: data.image && typeof data.image === "object" && data.image !== null && "url" in data.image
          ? { url: String((data.image as { url: string }).url) }
          : null,
      });
      resetForm();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      setFeedback({ type: "error", message });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    },
  });

  const lpMutation = api.content.generateLpWithImage.useMutation({
    onSuccess: (data) => {
      setFeedback({
        type: "success",
        message: data.message || "LPテキストが生成されました",
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      void utils.content.listContents.invalidate({ userId: USER_ID_PLACEHOLDER });
      setPreviewContent({
        id: data.id,
        content: data.content,
        image: data.image && typeof data.image === "object" && data.image !== null && "url" in data.image
          ? { url: String((data.image as { url: string }).url) }
          : null,
      });
      resetForm();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      setFeedback({ type: "error", message });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    },
  });

  // 履歴取得
  const contentsQuery = api.content.listContents.useQuery({
    userId: USER_ID_PLACEHOLDER,
    contentType: contentType || undefined,
    limit: 20,
  });

  const resetForm = () => {
    setCampaignTitle("");
    setCampaignDescription("");
    setTargetAudience("");
    setRelatedTreatmentIds([]);
    setSnsResearchIds([]);
    setSeoKeywords([]);
    setKeywordInput("");
    setNormalPrice("");
    setCampaignPrice("");
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
      const commonParams = {
        userId: USER_ID_PLACEHOLDER,
        campaignTitle: campaignTitle.trim(),
        campaignDescription: campaignDescription.trim(),
        targetAudience: targetAudience.trim() || undefined,
        tone,
        relatedTreatmentIds,
        snsResearchIds: snsResearchIds.length > 0 ? snsResearchIds : undefined,
        generateImage,
        imagePreset,
        imageTheme,
        customSize: imagePreset === "custom" ? { width: customWidth, height: customHeight } : undefined,
      };

      if (contentType === "instagram") {
        await instagramMutation.mutateAsync({
          ...commonParams,
          hashtagsPreference: { maxCount: hashtagsMaxCount },
          callToActionType,
        });
      } else if (contentType === "blog") {
        await blogMutation.mutateAsync({
          ...commonParams,
          seoKeywords,
          desiredLength,
        });
      } else if (contentType === "lp") {
        await lpMutation.mutateAsync({
          ...commonParams,
          primaryGoal,
          priceInfo:
            normalPrice || campaignPrice
              ? {
                  normalPrice: normalPrice || undefined,
                  campaignPrice: campaignPrice || undefined,
                }
              : undefined,
        });
      }
    } catch (error) {
      if (error instanceof TRPCClientError) {
        setFeedback({ type: "error", message: error.message });
        setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      }
    }
  };

  const isPending = instagramMutation.isPending || blogMutation.isPending || lpMutation.isPending;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 16px" }}>
      <header style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px", color: "#172B4D" }}>
          コンテンツ生成（新機能）
        </h1>
        <p style={{ fontSize: "14px", color: "#6B778C" }}>
          Instagram投稿、ブログ記事、LPテキストを自動生成します（画像生成対応）
        </p>
      </header>

      {/* フィードバックメッセージ */}
      {feedback.type && (
        <Banner appearance={feedback.type === "success" ? "announcement" : "error"}>
          {feedback.message}
        </Banner>
      )}

      {/* コンテンツ生成フォーム */}
      <section
        style={{
          marginBottom: "32px",
          padding: "32px",
          background: "#FFFFFF",
          borderRadius: "8px",
          border: "1px solid #DFE1E6",
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* コンテンツタイプ */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#42526E",
              }}
            >
              コンテンツタイプ *
            </label>
            <Select
              options={contentTypeOptions}
              value={contentType ? contentTypeOptions.find((opt) => opt.value === contentType) : null}
              onChange={(option) => setContentType((option?.value as typeof contentType) || "")}
              placeholder="選択してください"
              isRequired
            />
          </div>

          {/* 基本情報 */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#42526E",
              }}
            >
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
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#42526E",
              }}
            >
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
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#42526E",
              }}
            >
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

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#42526E",
              }}
            >
              ブランドトーン
            </label>
            <Select
              options={toneOptions}
              value={toneOptions.find((opt) => opt.value === tone)}
              onChange={(option) => setTone(option?.value || "上品で誠実")}
            />
          </div>

          {/* 関連施術選択 */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#42526E",
              }}
            >
              関連施術（複数選択可）
            </label>
            {productsQuery.isLoading ? (
              <Spinner size="small" />
            ) : productsQuery.data && productsQuery.data.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {productsQuery.data.map((product) => (
                  <div key={product.id} style={{ display: "flex", alignItems: "center" }}>
                    <Checkbox
                      isChecked={relatedTreatmentIds.includes(product.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRelatedTreatmentIds([...relatedTreatmentIds, product.id]);
                        } else {
                          setRelatedTreatmentIds(relatedTreatmentIds.filter((id) => id !== product.id));
                        }
                      }}
                      label={product.name}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: "14px", color: "#6B778C" }}>商品が登録されていません</span>
            )}
          </div>

          {/* SNS調査結果選択 */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#42526E",
              }}
            >
              SNS調査結果（複数選択可、任意）
            </label>
            {snsResearchQuery.isLoading ? (
              <Spinner size="small" />
            ) : snsResearchQuery.data && snsResearchQuery.data.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {snsResearchQuery.data.map((research) => (
                  <div key={research.id} style={{ display: "flex", alignItems: "center" }}>
                    <Checkbox
                      isChecked={snsResearchIds.includes(research.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSnsResearchIds([...snsResearchIds, research.id]);
                        } else {
                          setSnsResearchIds(snsResearchIds.filter((id) => id !== research.id));
                        }
                      }}
                      label={`${research.platform} - ${research.keywords.substring(0, 30)}...`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: "14px", color: "#6B778C" }}>
                調査結果がありません（任意項目です）
              </span>
            )}
          </div>

          {/* Instagram投稿用のオプション */}
          {contentType === "instagram" && (
            <>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#42526E",
                  }}
                >
                  ハッシュタグの最大数
                </label>
                <TextField
                  type="number"
                  min="3"
                  max="30"
                  value={hashtagsMaxCount.toString()}
                  onChange={(e) =>
                    setHashtagsMaxCount(Number.parseInt((e.target as HTMLInputElement).value, 10) || 10)
                  }
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#42526E",
                  }}
                >
                  行動喚起タイプ
                </label>
                <Select
                  options={ctaTypeOptions}
                  value={ctaTypeOptions.find((opt) => opt.value === callToActionType)}
                  onChange={(option) =>
                    setCallToActionType((option?.value as typeof callToActionType) || "予約")
                  }
                />
              </div>
            </>
          )}

          {/* ブログ記事用のオプション */}
          {contentType === "blog" && (
            <>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#42526E",
                  }}
                >
                  記事の長さ
                </label>
                <Select
                  options={articleLengthOptions}
                  value={articleLengthOptions.find((opt) => opt.value === desiredLength)}
                  onChange={(option) =>
                    setDesiredLength((option?.value as typeof desiredLength) || "medium")
                  }
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#42526E",
                  }}
                >
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
                  <Button type="button" appearance="default" onClick={handleAddKeyword}>
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
            </>
          )}

          {/* LP用のオプション */}
          {contentType === "lp" && (
            <>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#42526E",
                  }}
                >
                  主な目的
                </label>
                <Select
                  options={lpGoalOptions}
                  value={lpGoalOptions.find((opt) => opt.value === primaryGoal)}
                  onChange={(option) =>
                    setPrimaryGoal((option?.value as typeof primaryGoal) || "新規予約")
                  }
                />
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#42526E",
                    }}
                  >
                    通常価格
                  </label>
                  <TextField
                    type="text"
                    value={normalPrice}
                    onChange={(e) => setNormalPrice((e.target as HTMLInputElement).value)}
                    placeholder="例：¥50,000"
                    style={{ width: "100%" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#42526E",
                    }}
                  >
                    キャンペーン価格
                  </label>
                  <TextField
                    type="text"
                    value={campaignPrice}
                    onChange={(e) => setCampaignPrice((e.target as HTMLInputElement).value)}
                    placeholder="例：¥40,000"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            </>
          )}

          {/* 画像生成設定 */}
          <div
            style={{
              padding: "16px",
              background: "#F4F5F7",
              borderRadius: "8px",
              border: "1px solid #DFE1E6",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <Checkbox
                isChecked={generateImage}
                onChange={(e) => setGenerateImage(e.target.checked)}
                label="画像を生成する"
              />
            </div>
            {generateImage && (
              <>
                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#42526E",
                    }}
                  >
                    画像プリセット
                  </label>
                  <Select
                    options={imagePresetOptions}
                    value={imagePresetOptions.find((opt) => opt.value === imagePreset)}
                    onChange={(option) =>
                      setImagePreset((option?.value as typeof imagePreset) || "instagram_square")
                    }
                  />
                </div>
                {imagePreset === "custom" && (
                  <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "#42526E",
                        }}
                      >
                        幅
                      </label>
                      <TextField
                        type="number"
                        min="256"
                        max="2048"
                        value={customWidth.toString()}
                        onChange={(e) =>
                          setCustomWidth(Number.parseInt((e.target as HTMLInputElement).value, 10) || 1080)
                        }
                        style={{ width: "100%" }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "#42526E",
                        }}
                      >
                        高さ
                      </label>
                      <TextField
                        type="number"
                        min="256"
                        max="2048"
                        value={customHeight.toString()}
                        onChange={(e) =>
                          setCustomHeight(Number.parseInt((e.target as HTMLInputElement).value, 10) || 1080)
                        }
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#42526E",
                    }}
                  >
                    画像テーマ
                  </label>
                  <Select
                    options={imageThemeOptions}
                    value={imageThemeOptions.find((opt) => opt.value === imageTheme)}
                    onChange={(option) => setImageTheme(option?.value || "before_after")}
                  />
                </div>
              </>
            )}
          </div>

          <Button type="submit" appearance="primary" isDisabled={isPending}>
            {isPending ? (
              <>
                <Spinner size="small" /> 生成中...
              </>
            ) : (
              "コンテンツを生成"
            )}
          </Button>
        </form>
      </section>

      {/* プレビュー */}
      {previewContent && (
        <section
          style={{
            marginBottom: "32px",
            padding: "24px",
            background: "#FFFFFF",
            borderRadius: "8px",
            border: "1px solid #DFE1E6",
          }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
            プレビュー
          </h2>
          <div style={{ borderRadius: "8px", border: "1px solid #DFE1E6", background: "#F4F5F7", padding: "16px" }}>
            {contentType === "instagram" && (
              <div>
                <h3 style={{ marginBottom: "12px", fontSize: "14px", fontWeight: 600, color: "#172B4D" }}>
                  キャプション
                </h3>
                <div
                  style={{
                    whiteSpace: "pre-line",
                    fontSize: "14px",
                    lineHeight: "1.75",
                    color: "#172B4D",
                    marginBottom: "16px",
                  }}
                >
                  {typeof previewContent.content === "object" &&
                  previewContent.content !== null &&
                  "markdown" in previewContent.content
                    ? String((previewContent.content as { markdown: string }).markdown)
                    : String(previewContent.content)}
                </div>
                {previewContent.image !== null && 
                 previewContent.image !== undefined && 
                 previewContent.image.url ? (
                  <div style={{ marginTop: "16px" }}>
                    <h3 style={{ marginBottom: "8px", fontSize: "14px", fontWeight: 600, color: "#172B4D" }}>
                      生成された画像
                    </h3>
                    <img
                      src={previewContent.image.url}
                      alt="Generated content"
                      style={{ maxWidth: "100%", borderRadius: "8px" }}
                    />
                  </div>
                ) : null}
              </div>
            )}
            {contentType === "blog" && (
              <div>
                <div
                  style={{
                    whiteSpace: "pre-line",
                    fontSize: "14px",
                    lineHeight: "1.75",
                    color: "#172B4D",
                    marginBottom: "16px",
                  }}
                >
                  {typeof previewContent.content === "object" &&
                  previewContent.content !== null &&
                  "markdown" in previewContent.content
                    ? String((previewContent.content as { markdown: string }).markdown)
                    : String(previewContent.content)}
                </div>
                {previewContent.image !== null && 
                 previewContent.image !== undefined && 
                 previewContent.image.url ? (
                  <div style={{ marginTop: "16px" }}>
                    <h3 style={{ marginBottom: "8px", fontSize: "14px", fontWeight: 600, color: "#172B4D" }}>
                      アイキャッチ画像
                    </h3>
                    <img
                      src={previewContent.image.url}
                      alt="Generated content"
                      style={{ maxWidth: "100%", borderRadius: "8px" }}
                    />
                  </div>
                ) : null}
              </div>
            )}
            {contentType === "lp" && (
              <div>
                <div
                  style={{
                    whiteSpace: "pre-line",
                    fontSize: "14px",
                    lineHeight: "1.75",
                    color: "#172B4D",
                    marginBottom: "16px",
                  }}
                >
                  {typeof previewContent.content === "object" &&
                  previewContent.content !== null &&
                  "markdown" in previewContent.content
                    ? String((previewContent.content as { markdown: string }).markdown)
                    : String(previewContent.content)}
                </div>
                {previewContent.image !== null && 
                 previewContent.image !== undefined && 
                 previewContent.image.url ? (
                  <div style={{ marginTop: "16px" }}>
                    <h3 style={{ marginBottom: "8px", fontSize: "14px", fontWeight: 600, color: "#172B4D" }}>
                      LPヘッダー画像
                    </h3>
                    <img
                      src={previewContent.image.url}
                      alt="Generated content"
                      style={{ maxWidth: "100%", borderRadius: "8px" }}
                    />
                  </div>
                ) : null}
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
          <Banner appearance="error">エラー: {contentsQuery.error.message}</Banner>
        )}
        {contentsQuery.data && contentsQuery.data.contents.length === 0 && (
          <EmptyState
            header="まだ生成されたコンテンツがありません"
            description="上記のフォームからコンテンツを生成してください"
          />
        )}
        {contentsQuery.data && contentsQuery.data.contents.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {contentsQuery.data.contents.map((content) => (
              <div
                key={content.id}
                style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Badge appearance="added">{content.contentType}</Badge>
                    <span style={{ fontSize: "12px", color: "#6B778C" }}>
                      {new Date(content.createdAt).toLocaleString("ja-JP")}
                    </span>
                  </div>
                  <Badge
                    appearance={
                      content.status === "published"
                        ? "added"
                        : content.status === "approved"
                          ? "default"
                          : "removed"
                    }
                  >
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
                {content.images && content.images.length > 0 && (
                  <div style={{ marginBottom: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {content.images.map((img) => (
                      <img
                        key={img.id}
                        src={img.url}
                        alt="Generated"
                        style={{ maxWidth: "200px", borderRadius: "4px" }}
                      />
                    ))}
                  </div>
                )}
                <details>
                  <summary
                    style={{
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#42526E",
                      listStyle: "none",
                    }}
                  >
                    内容を表示
                  </summary>
                  <div style={{ marginTop: "8px" }}>
                    <pre
                      style={{
                        maxHeight: "240px",
                        overflow: "auto",
                        borderRadius: "4px",
                        background: "#F4F5F7",
                        padding: "12px",
                        fontSize: "12px",
                        color: "#172B4D",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {content.bodyMarkdown || content.content}
                    </pre>
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

export default ContentGenerator;

