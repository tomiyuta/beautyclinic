"use client";

import { useState, useEffect } from "react";
import Toggle from "@atlaskit/toggle";
import { Checkbox } from "@atlaskit/checkbox";
import { RadioGroup } from "@atlaskit/radio";
import Select from "@atlaskit/select";
import SectionMessage from "@atlaskit/section-message";
import type { CouncilConfig, CouncilModel, ChairmanMode } from "@/types/ai-council";

interface CouncilConfigPanelProps {
  config: CouncilConfig;
  onChange: (config: CouncilConfig) => void;
  disabled?: boolean;
}

const MODEL_OPTIONS: { label: string; value: CouncilModel }[] = [
  { label: "Claude", value: "claude" },
  { label: "ChatGPT", value: "chatgpt" },
  { label: "Gemini", value: "gemini" },
  { label: "Grok", value: "grok" },
];

const CHAIRMAN_MODE_OPTIONS = [
  { name: "chairmanMode", value: "auto", label: "自動（ピアレビュー1位）" },
  { name: "chairmanMode", value: "manual", label: "手動選択" },
];

export default function CouncilConfigPanel({
  config,
  onChange,
  disabled = false,
}: CouncilConfigPanelProps) {
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleModelToggle = (model: CouncilModel) => {
    const newModels = localConfig.models.includes(model)
      ? localConfig.models.filter((m) => m !== model)
      : [...localConfig.models, model];
    
    const newConfig = { ...localConfig, models: newModels };
    setLocalConfig(newConfig);
    onChange(newConfig);
  };

  const handlePeerReviewToggle = () => {
    // 議長「自動」の場合はピアレビュー必須
    if (localConfig.chairmanMode === "auto") return;
    
    const newConfig = {
      ...localConfig,
      enablePeerReview: !localConfig.enablePeerReview,
    };
    setLocalConfig(newConfig);
    onChange(newConfig);
  };

  const handleChairmanModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mode = e.target.value as ChairmanMode;
    const newConfig = {
      ...localConfig,
      chairmanMode: mode,
      // 「自動」選択時はピアレビュー強制ON
      enablePeerReview: mode === "auto" ? true : localConfig.enablePeerReview,
    };
    setLocalConfig(newConfig);
    onChange(newConfig);
  };

  const handleManualChairmanChange = (option: { value: CouncilModel } | null) => {
    if (!option) return;
    const newConfig = { ...localConfig, manualChairman: option.value };
    setLocalConfig(newConfig);
    onChange(newConfig);
  };

  const isModelSelected = (model: CouncilModel) => localConfig.models.includes(model);
  const selectedCount = localConfig.models.length;
  const isValid = selectedCount >= 2;

  return (
    <div style={{ padding: "16px", borderRadius: "4px", border: "1px solid #DFE1E6", background: "#F4F5F7" }}>
      <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>Council設定</h3>

      {/* 参加モデル選択 */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
          参加モデル（2つ以上選択）
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
          {MODEL_OPTIONS.map((option) => (
            <Checkbox
              key={option.value}
              isChecked={isModelSelected(option.value)}
              onChange={() => handleModelToggle(option.value)}
              label={option.label}
              isDisabled={disabled}
            />
          ))}
        </div>
        {!isValid && (
          <p style={{ marginTop: "8px", fontSize: "12px", color: "#DE350B" }}>
            2つ以上のモデルを選択してください
          </p>
        )}
      </div>

      {/* ピアレビュー設定 */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Toggle
            id="peer-review-toggle"
            isChecked={localConfig.enablePeerReview}
            onChange={handlePeerReviewToggle}
            isDisabled={disabled || localConfig.chairmanMode === "auto"}
          />
          <label htmlFor="peer-review-toggle" style={{ fontSize: "14px", color: "#42526E", cursor: "pointer" }}>
            ピアレビューを実行（AIが相互評価）
          </label>
        </div>
        {localConfig.chairmanMode === "auto" && (
          <p style={{ marginTop: "4px", fontSize: "12px", color: "#6B778C" }}>
            ※ 議長「自動」選択時はピアレビュー必須です
          </p>
        )}
      </div>

      {/* 議長選択 */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
          議長選択
        </label>
        <RadioGroup
          options={CHAIRMAN_MODE_OPTIONS}
          value={localConfig.chairmanMode}
          onChange={handleChairmanModeChange}
          isDisabled={disabled}
        />
      </div>

      {/* 手動選択時の議長ドロップダウン */}
      {localConfig.chairmanMode === "manual" && (
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
            議長
          </label>
          <div style={{ width: "200px" }}>
            <Select
              options={MODEL_OPTIONS.filter((o) => isModelSelected(o.value))}
              value={MODEL_OPTIONS.find((o) => o.value === localConfig.manualChairman)}
              onChange={handleManualChairmanChange}
              isDisabled={disabled}
              placeholder="議長を選択"
            />
          </div>
          {localConfig.manualChairman && !isModelSelected(localConfig.manualChairman) && (
            <p style={{ marginTop: "8px", fontSize: "12px", color: "#FF991F" }}>
              選択した議長が参加モデルに含まれていません
            </p>
          )}
        </div>
      )}

      {/* 処理時間の目安 */}
      <SectionMessage appearance="information">
        <p style={{ fontSize: "12px", margin: 0, lineHeight: "1.6" }}>
          <strong>処理時間の目安:</strong><br />
          Stage 1（並列クエリ）: 約30秒<br />
          {localConfig.enablePeerReview && <>Stage 2（ピアレビュー）: 約30秒<br /></>}
          Stage 3（議長統合）: 約20秒<br />
          <strong>合計: 約{localConfig.enablePeerReview ? "80" : "50"}秒</strong>
        </p>
      </SectionMessage>
    </div>
  );
}
