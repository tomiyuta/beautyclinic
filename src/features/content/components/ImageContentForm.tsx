"use client";

import { useState } from "react";
import TextField from "@atlaskit/textfield";
import Textarea from "@atlaskit/textarea";
import Select from "@atlaskit/select";
import Checkbox from "@atlaskit/checkbox";
import Button from "@atlaskit/button";
import type { ContentGenerationFormState } from "../hooks/useContentGenerationFormState";
import {
  imageContentTypeOptions,
  imageStyleOptions,
} from "../constants/content-type-options";

interface ImageContentFormProps {
  formState: ContentGenerationFormState;
  contentType: string;
  onContentTypeChange: (type: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isPending: boolean;
}

export function ImageContentForm({
  formState,
  contentType,
  onContentTypeChange,
  onSubmit,
  isPending,
}: ImageContentFormProps) {
  const { campaign, image } = formState;

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
          画像タイプ *
        </label>
        <Select
          options={imageContentTypeOptions}
          value={
            imageContentTypeOptions.find((opt) => opt.value === contentType) || null
          }
          onChange={(option) =>
            onContentTypeChange((option?.value as string | undefined) || "")
          }
          placeholder="タイプを選択してください"
          isRequired
        />
        {imageContentTypeOptions.find((opt) => opt.value === contentType)?.size && (
          <p style={{ fontSize: "12px", color: "#6B778C", marginTop: "4px" }}>
            推奨サイズ: {imageContentTypeOptions.find((opt) => opt.value === contentType)?.size}
          </p>
        )}
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
          placeholder="画像生成のための説明を入力してください（300文字以内）"
          minimumRows={3}
          isRequired
          maxLength={300}
        />
      </div>

      {/* 画像生成オプション */}
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
          画像スタイル
        </label>
        <Select
          options={imageStyleOptions}
          value={imageStyleOptions.find((opt) => opt.value === image.imageStyle) || null}
          onChange={(option) =>
            image.setImageStyle(
              (option?.value as "minimal" | "gorgeous" | "natural" | "modern" | "elegant") ||
                "modern"
            )
          }
          defaultValue={imageStyleOptions.find((opt) => opt.value === "modern") || null}
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
          カラースキーム
        </label>
        <TextField
          value={image.colorScheme}
          onChange={(e) => image.setColorScheme((e.target as HTMLInputElement).value)}
          placeholder="例: ピンクとゴールド"
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
          含める要素
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Checkbox
            label="ロゴ"
            isChecked={image.includeElements.logo}
            onChange={(e) =>
              image.setIncludeElements({
                ...image.includeElements,
                logo: (e.target as HTMLInputElement).checked,
              })
            }
          />
          <Checkbox
            label="価格"
            isChecked={image.includeElements.price}
            onChange={(e) =>
              image.setIncludeElements({
                ...image.includeElements,
                price: (e.target as HTMLInputElement).checked,
              })
            }
          />
          <Checkbox
            label="テキストオーバーレイ"
            isChecked={image.includeElements.textOverlay}
            onChange={(e) =>
              image.setIncludeElements({
                ...image.includeElements,
                textOverlay: (e.target as HTMLInputElement).checked,
              })
            }
          />
          <Checkbox
            label="ビフォーアフター"
            isChecked={image.includeElements.beforeAfter}
            onChange={(e) =>
              image.setIncludeElements({
                ...image.includeElements,
                beforeAfter: (e.target as HTMLInputElement).checked,
              })
            }
          />
        </div>
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
          生成数
        </label>
        <TextField
          type="number"
          value={image.imageCount.toString()}
          onChange={(e) => {
            const val = parseInt((e.target as HTMLInputElement).value, 10);
            image.setImageCount(isNaN(val) ? 4 : Math.min(Math.max(val, 1), 4));
          }}
          min={1}
          max={4}
        />
      </div>

      <Button
        type="submit"
        appearance="primary"
        isDisabled={isPending || !contentType || !campaign.campaignTitle.trim() || !campaign.campaignDescription.trim()}
      >
        {isPending ? "生成中..." : "画像を生成"}
      </Button>
    </>
  );
}

