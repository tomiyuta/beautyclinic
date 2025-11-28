"use client";

import { ReactNode } from "react";
import { ContentCategorySelector } from "./ContentCategorySelector";
import { ContentTypeSelector } from "./ContentTypeSelector";
import { CampaignInfoFields } from "./CampaignInfoFields";
import { TextContentForm } from "./TextContentForm";
import { ImageContentForm } from "./ImageContentForm";
import { VideoContentForm } from "./VideoContentForm";
import { TemplateSelector } from "./TemplateSelector";
import { InstagramLPPreview } from "./InstagramLPPreview";
import Button from "@atlaskit/button";
import TextField from "@atlaskit/textfield";
import Select from "@atlaskit/select";
import type { ContentGenerationFormState } from "../hooks/useContentGenerationFormState";
import {
  designApproachOptions,
  getDefaultMaxLength,
  toneOptions,
  ctaTypeOptions,
} from "../constants/content-type-options";
import Tag from "@atlaskit/tag";
import Badge from "@atlaskit/badge";

interface StepProps {
  formState: ContentGenerationFormState;
  handlers: {
    handleCampaignDescriptionChange: (value: string) => void;
    handleApplySuggestion: (suggestion: string) => void;
    handleContentTypeChange: (type: string) => void;
  };
  templates?: any[];
  onApplyTemplate: (id: number) => void;
  onDeleteTemplate: (id: number) => void;
  isDeleting: boolean;
}

// Step 1: 基本設定（カテゴリー + タイプ選択）
export function Step1BasicSettings({ formState, handlers }: StepProps) {
  const {
    selection: { contentCategory, setContentCategory, contentType, setContentType },
  } = formState;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <ContentCategorySelector
        contentCategory={contentCategory}
        onCategoryChange={setContentCategory}
        onContentTypeReset={() => setContentType("")}
      />

      {contentCategory && (
        <ContentTypeSelector
          contentCategory={contentCategory}
          contentType={contentType}
          onContentTypeChange={handlers.handleContentTypeChange}
        />
      )}
    </div>
  );
}

// Step 2: キャンペーン情報
export function Step2CampaignInfo({ 
  formState, 
  handlers,
  templates,
  onApplyTemplate,
  onDeleteTemplate,
  isDeleting,
}: StepProps) {
  const {
    selection: { contentCategory, contentType },
    campaign: { promotion, setPromotion, designApproach, setDesignApproach, lpCount, setLpCount },
  } = formState;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* テンプレート選択 */}
      <TemplateSelector
        formState={formState}
        templates={templates}
        onApplyTemplate={onApplyTemplate}
        onDeleteTemplate={onDeleteTemplate}
        isDeleting={isDeleting}
      />

      {/* キャンペーン情報フィールド */}
      <CampaignInfoFields
        formState={formState}
        contentCategory={contentCategory}
        onCampaignDescriptionChange={handlers.handleCampaignDescriptionChange}
        onApplySuggestion={handlers.handleApplySuggestion}
      />

      {/* Instagram LP専用フィールド */}
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
    </div>
  );
}

// Step 3: 詳細設定（カテゴリー別）
export function Step3DetailSettings({ formState, handlers }: StepProps) {
  const {
    selection: { contentCategory, contentType },
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
    campaign: { lpCount, setLpCount },
  } = formState;

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* SEOキーワード（website_article専用） */}
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

      {/* トーン（campaign_copy専用） */}
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

      {/* 拡張テキスト生成フィールド */}
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

      {/* カテゴリー別の詳細フォーム（既存コンポーネントを活用） */}
      {contentCategory === "text" && !["instagram_post_text", "ad_banner", "website_article", "campaign_copy"].includes(contentType) && (
        <div style={{ padding: "16px", background: "#F4F5F7", borderRadius: "8px" }}>
          <p style={{ fontSize: "14px", color: "#6B778C", margin: 0 }}>
            このコンテンツタイプには追加の設定項目はありません。次のステップに進んでください。
          </p>
        </div>
      )}

      {contentCategory === "image" && [
        "instagram_square", "instagram_vertical", "instagram_story",
        "ad_banner_horizontal", "ad_banner_square", "lp_visual"
      ].includes(contentType) && (
        <ImageContentForm
          formState={formState}
          contentType={contentType}
          onContentTypeChange={handlers.handleContentTypeChange}
          onSubmit={async (e) => { e.preventDefault(); }}
          isPending={false}
        />
      )}

      {contentCategory === "video" && (
        <VideoContentForm
          formState={formState}
          contentType={contentType}
          onContentTypeChange={handlers.handleContentTypeChange}
          onSubmit={async (e) => { e.preventDefault(); }}
          isPending={false}
        />
      )}
    </div>
  );
}

// Step 4: 確認と生成
export function Step4Confirmation({ formState }: Pick<StepProps, "formState">) {
  const {
    selection: { contentCategory, contentType },
    campaign: { campaignTitle, campaignDescription, targetAudience, promotion },
    text: { tone, maxLength, includeKeywords, ctaType, seoKeywords },
    image: { imageStyle, colorScheme, includeElements, imageCount },
    video: { videoDuration, videoAspectRatio, videoStyle, videoCount },
  } = formState;

  const getContentCategoryLabel = (cat: string) => {
    switch (cat) {
      case "text": return "テキストコンテンツ";
      case "image": return "画像コンテンツ";
      case "video": return "動画コンテンツ";
      default: return cat;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ padding: "24px", background: "#F4F5F7", borderRadius: "8px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
          設定内容の確認
        </h3>

        {/* 基本設定 */}
        <div style={{ marginBottom: "16px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "#42526E" }}>
            基本設定
          </h4>
          <div style={{ fontSize: "14px", color: "#172B4D", lineHeight: "1.6" }}>
            <div><strong>カテゴリー:</strong> {getContentCategoryLabel(contentCategory)}</div>
            <div><strong>コンテンツタイプ:</strong> {contentType}</div>
          </div>
        </div>

        {/* キャンペーン情報 */}
        <div style={{ marginBottom: "16px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "#42526E" }}>
            キャンペーン情報
          </h4>
          <div style={{ fontSize: "14px", color: "#172B4D", lineHeight: "1.6" }}>
            <div><strong>タイトル:</strong> {campaignTitle}</div>
            <div><strong>説明:</strong> {campaignDescription}</div>
            {targetAudience && <div><strong>ターゲット層:</strong> {targetAudience}</div>}
            {promotion && <div><strong>プロモーション:</strong> {promotion}</div>}
          </div>
        </div>

        {/* 詳細設定（カテゴリー別） */}
        {contentCategory === "text" && (
          <div style={{ marginBottom: "16px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "#42526E" }}>
              テキスト設定
            </h4>
            <div style={{ fontSize: "14px", color: "#172B4D", lineHeight: "1.6" }}>
              <div><strong>トーン:</strong> {tone}</div>
              {maxLength && <div><strong>文字数制限:</strong> {maxLength}文字</div>}
              {includeKeywords.length > 0 && (
                <div><strong>含めるキーワード:</strong> {includeKeywords.join(", ")}</div>
              )}
              {seoKeywords.length > 0 && (
                <div><strong>SEOキーワード:</strong> {seoKeywords.join(", ")}</div>
              )}
              <div><strong>CTA種類:</strong> {ctaType}</div>
            </div>
          </div>
        )}

        {contentCategory === "image" && (
          <div style={{ marginBottom: "16px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "#42526E" }}>
              画像設定
            </h4>
            <div style={{ fontSize: "14px", color: "#172B4D", lineHeight: "1.6" }}>
              <div><strong>スタイル:</strong> {imageStyle}</div>
              {colorScheme && <div><strong>カラースキーム:</strong> {colorScheme}</div>}
              <div><strong>生成件数:</strong> {imageCount}枚</div>
              <div><strong>含める要素:</strong> {
                Object.entries(includeElements)
                  .filter(([_, value]) => value)
                  .map(([key]) => key)
                  .join(", ") || "なし"
              }</div>
            </div>
          </div>
        )}

        {contentCategory === "video" && (
          <div style={{ marginBottom: "16px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "#42526E" }}>
              動画設定
            </h4>
            <div style={{ fontSize: "14px", color: "#172B4D", lineHeight: "1.6" }}>
              <div><strong>尺:</strong> {videoDuration}秒</div>
              <div><strong>アスペクト比:</strong> {videoAspectRatio}</div>
              <div><strong>スタイル:</strong> {videoStyle}</div>
              <div><strong>生成件数:</strong> {videoCount}本</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "16px", background: "#E3FCEF", borderRadius: "8px", border: "1px solid #36B37E" }}>
        <p style={{ fontSize: "14px", color: "#172B4D", margin: 0 }}>
          ✓ 設定内容を確認し、問題がなければ「完了」ボタンをクリックしてコンテンツを生成してください。
        </p>
      </div>
    </div>
  );
}

