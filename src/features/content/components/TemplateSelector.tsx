"use client";

import Select from "@atlaskit/select";
import Button from "@atlaskit/button";
import type { ContentGenerationFormState } from "../hooks/useContentGenerationFormState";

interface TemplateSelectorProps {
  formState: ContentGenerationFormState;
  templates: Array<{ id: number; name: string }> | undefined;
  onApplyTemplate: (templateId: number) => void;
  onDeleteTemplate: (templateId: number) => void;
  isDeleting: boolean;
}

export function TemplateSelector({
  formState,
  templates,
  onApplyTemplate,
  onDeleteTemplate,
  isDeleting,
}: TemplateSelectorProps) {
  const { template, selection } = formState;
  const { selectedTemplateId, setSelectedTemplateId } = template;
  const { contentType } = selection;

  if (!contentType || !templates || templates.length === 0) {
    return null;
  }

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
        テンプレート
      </label>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <Select
          options={templates.map((t) => ({ label: t.name, value: t.id }))}
          value={
            selectedTemplateId
              ? templates.find((t) => t.id === selectedTemplateId)
                ? {
                    label: templates.find((t) => t.id === selectedTemplateId)!.name,
                    value: selectedTemplateId,
                  }
                : null
              : null
          }
          onChange={(option) => {
            const templateId = option?.value as number | undefined;
            if (templateId) {
              onApplyTemplate(templateId);
            }
          }}
          placeholder="テンプレートを選択..."
          isClearable
        />
        {selectedTemplateId && (
          <Button
            appearance="subtle"
            onClick={() => {
              if (confirm("このテンプレートを削除しますか？")) {
                onDeleteTemplate(selectedTemplateId);
                setSelectedTemplateId(null);
              }
            }}
            isDisabled={isDeleting}
          >
            削除
          </Button>
        )}
      </div>
    </div>
  );
}


