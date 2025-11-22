"use client";

import Select from "@atlaskit/select";
import type { ContentCategory } from "../hooks/useContentGenerationFormState";

interface ContentCategorySelectorProps {
  contentCategory: ContentCategory;
  onCategoryChange: (category: ContentCategory) => void;
  onContentTypeReset: () => void;
}

export function ContentCategorySelector({
  contentCategory,
  onCategoryChange,
  onContentTypeReset,
}: ContentCategorySelectorProps) {
  return (
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
        コンテンツカテゴリー *
      </label>
      <Select
        options={[
          { label: "テキストコンテンツ", value: "text" },
          { label: "画像コンテンツ", value: "image" },
          { label: "動画コンテンツ", value: "video" },
        ]}
        value={
          contentCategory
            ? {
                label:
                  contentCategory === "text"
                    ? "テキストコンテンツ"
                    : contentCategory === "image"
                      ? "画像コンテンツ"
                      : "動画コンテンツ",
                value: contentCategory,
              }
            : null
        }
        onChange={(option) => {
          const cat = (option?.value as ContentCategory | undefined) || "";
          onCategoryChange(cat);
          onContentTypeReset();
        }}
        placeholder="カテゴリーを選択してください"
        isRequired
      />
    </div>
  );
}


