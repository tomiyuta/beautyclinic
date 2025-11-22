"use client";

import { useState } from "react";
import TextField from "@atlaskit/textfield";
import Textarea from "@atlaskit/textarea";
import Select from "@atlaskit/select";
import Tag from "@atlaskit/tag";
import Button from "@atlaskit/button";
import type { ContentGenerationFormState } from "../hooks/useContentGenerationFormState";
import type { ContentTypeOption } from "../constants/content-type-options";
import {
  textContentTypeOptions,
  toneOptions,
  ctaTypeOptions,
  getDefaultMaxLength,
} from "../constants/content-type-options";

interface TextContentFormProps {
  formState: ContentGenerationFormState;
  contentType: string;
  onContentTypeChange: (type: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isPending: boolean;
}

export function TextContentForm({
  formState,
  contentType,
  onContentTypeChange,
  onSubmit,
  isPending,
}: TextContentFormProps) {
  const { campaign, text } = formState;
  const [keywordInput, setKeywordInput] = useState("");

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !text.includeKeywords.includes(keywordInput.trim())) {
      text.setIncludeKeywords([...text.includeKeywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    text.setIncludeKeywords(text.includeKeywords.filter((k) => k !== keyword));
  };

  const handleAddSeoKeyword = () => {
    if (keywordInput.trim() && !text.seoKeywords.includes(keywordInput.trim())) {
      text.setSeoKeywords([...text.seoKeywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const handleRemoveSeoKeyword = (keyword: string) => {
    text.setSeoKeywords(text.seoKeywords.filter((k) => k !== keyword));
  };

  const defaultMaxLength = contentType ? getDefaultMaxLength(contentType) : undefined;
  const effectiveMaxLength = text.maxLength || defaultMaxLength;

  return (
    <>
      {/* コンテンツタイプ選択 */}
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
          options={textContentTypeOptions}
          value={
            textContentTypeOptions.find((opt) => opt.value === contentType) || null
          }
          onChange={(option) =>
            onContentTypeChange((option?.value as string | undefined) || "")
          }
          placeholder="タイプを選択してください"
          isRequired
        />
      </div>

      {/* キャンペーン情報 */}
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
          value={campaign.campaignTitle}
          onChange={(e) => campaign.setCampaignTitle((e.target as HTMLInputElement).value)}
          placeholder="例: 12月年末特化キャンペーン"
          isRequired
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
          value={campaign.campaignDescription}
          onChange={(e) =>
            campaign.setCampaignDescription((e.target as HTMLTextAreaElement).value)
          }
          placeholder="キャンペーンの詳細を入力してください"
          minimumRows={4}
          isRequired
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
          value={campaign.targetAudience}
          onChange={(e) =>
            campaign.setTargetAudience((e.target as HTMLInputElement).value)
          }
          placeholder="例: 20-30代の女性"
        />
      </div>

      {/* テキスト生成オプション */}
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
          トーン
        </label>
        <Select
          options={toneOptions}
          value={toneOptions.find((opt) => opt.value === text.tone) || null}
          onChange={(option) =>
            text.setTone(
              (option?.value as "formal" | "casual" | "friendly" | "professional") ||
                "friendly"
            )
          }
          defaultValue={toneOptions.find((opt) => opt.value === "friendly") || null}
        />
      </div>

      {effectiveMaxLength && (
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
            最大文字数
          </label>
          <TextField
            type="number"
            value={text.maxLength?.toString() || effectiveMaxLength.toString()}
            onChange={(e) => {
              const val = parseInt((e.target as HTMLInputElement).value, 10);
              text.setMaxLength(isNaN(val) ? undefined : val);
            }}
            placeholder={effectiveMaxLength.toString()}
          />
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
          含めるキーワード
        </label>
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <TextField
            value={keywordInput}
            onChange={(e) => setKeywordInput((e.target as HTMLInputElement).value)}
            placeholder="キーワードを入力"
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddKeyword();
              }
            }}
          />
          <Button onClick={handleAddKeyword}>追加</Button>
        </div>
        {text.includeKeywords.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {text.includeKeywords.map((keyword, index) => (
              <Tag
                key={index}
                text={keyword}
                removeButtonLabel={`${keyword}を削除`}
                onAfterRemoveAction={() => {
                  handleRemoveKeyword(keyword);
                  return "Post Removal Hook";
                }}
              />
            ))}
          </div>
        )}
      </div>

      {contentType === "website_article" && (
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
              value={keywordInput}
              onChange={(e) => setKeywordInput((e.target as HTMLInputElement).value)}
              placeholder="SEOキーワードを入力"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSeoKeyword();
                }
              }}
            />
            <Button onClick={handleAddSeoKeyword}>追加</Button>
          </div>
          {text.seoKeywords.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {text.seoKeywords.map((keyword, index) => (
                <Tag
                  key={index}
                  text={keyword}
                  removeButtonLabel={`${keyword}を削除`}
                  onAfterRemoveAction={() => {
                    handleRemoveSeoKeyword(keyword);
                    return "Post Removal Hook";
                  }}
                />
              ))}
            </div>
          )}
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
          行動喚起タイプ
        </label>
        <Select
          options={ctaTypeOptions}
          value={ctaTypeOptions.find((opt) => opt.value === text.ctaType) || null}
          onChange={(option) =>
            text.setCtaType(
              (option?.value as "reserve" | "details" | "inquiry" | "check_now") ||
                "reserve"
            )
          }
          defaultValue={ctaTypeOptions.find((opt) => opt.value === "reserve") || null}
        />
      </div>

      <Button
        type="submit"
        appearance="primary"
        isDisabled={isPending || !contentType || !campaign.campaignTitle.trim() || !campaign.campaignDescription.trim()}
      >
        {isPending ? "生成中..." : "コンテンツを生成"}
      </Button>
    </>
  );
}

