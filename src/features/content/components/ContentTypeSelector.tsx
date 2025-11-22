"use client";

import Select from "@atlaskit/select";
import type { ContentCategory } from "../hooks/useContentGenerationFormState";
import {
  textContentTypeOptions,
  imageContentTypeOptions,
  videoContentTypeOptions,
  contentTypeOptions,
  type ContentTypeOption,
} from "../constants/content-type-options";

interface ContentTypeSelectorProps {
  contentCategory: ContentCategory;
  contentType: string;
  onContentTypeChange: (type: string) => void;
}

export function ContentTypeSelector({
  contentCategory,
  contentType,
  onContentTypeChange,
}: ContentTypeSelectorProps) {
  const getOptions = (): ContentTypeOption[] => {
    if (contentCategory === "text") return textContentTypeOptions;
    if (contentCategory === "image") return imageContentTypeOptions;
    if (contentCategory === "video") return videoContentTypeOptions;
    return contentTypeOptions;
  };

  const options = getOptions();
  const selectedOption = options.find((opt) => opt.value === contentType) || null;

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
        コンテンツタイプ *
      </label>
      <Select
        options={options}
        value={selectedOption}
        onChange={(option) =>
          onContentTypeChange((option?.value as string | undefined) || "")
        }
        placeholder="タイプを選択してください"
        isRequired
        isDisabled={!contentCategory}
      />
    </div>
  );
}


