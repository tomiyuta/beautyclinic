"use client";

import { useState, useEffect } from "react";
import Button from "@atlaskit/button";
import TextField from "@atlaskit/textfield";
import Checkbox from "@atlaskit/checkbox";
import Select from "@atlaskit/select";
import Banner from "@atlaskit/banner";
import { defaultSettings, type AiContextSettings } from "@/types/ai-context-settings";

const modelOptions = [
  { label: "gpt-4o-mini（推奨）", value: "gpt-4o-mini" },
  { label: "gpt-4o", value: "gpt-4o" },
  { label: "gpt-4-turbo", value: "gpt-4-turbo" },
  { label: "gpt-3.5-turbo", value: "gpt-3.5-turbo" },
];

const storageOptions = [
  { label: "Database（MySQL）", value: "database" },
  { label: "S3 / R2", value: "s3" },
];

const jobTypeOptions = [
  { label: "タスク抽出のみ", value: "task_extraction" },
  { label: "フル処理（タスク抽出＋スキル学習）", value: "full_processing" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<AiContextSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // LocalStorageから読み込み（実際の運用ではDBに保存）
  useEffect(() => {
    const stored = localStorage.getItem("ai-context-settings");
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    
    // LocalStorageに保存（実際の運用ではAPIを呼び出してDBに保存）
    localStorage.setItem("ai-context-settings", JSON.stringify(settings));
    
    // 環境変数の更新は手動で行う必要があることを示す
    await new Promise((r) => setTimeout(r, 500));
    
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (confirm("設定をデフォルトに戻しますか？")) {
      setSettings(defaultSettings);
      localStorage.removeItem("ai-context-settings");
    }
  };

  const updateSetting = <K extends keyof AiContextSettings>(
    category: K,
    key: keyof AiContextSettings[K],
    value: AiContextSettings[K][keyof AiContextSettings[K]]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F4F5F7", padding: "24px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* ヘッダー */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#172B4D", marginBottom: "4px" }}>
            Acontext設定
          </h1>
          <p style={{ fontSize: "14px", color: "#6B778C" }}>
            タスク抽出、スキル学習、ストレージの設定を管理します
          </p>
        </div>

        {/* 注意書き */}
        <Banner appearance="warning">
          <p>
            一部の設定（モデル名、ストレージタイプなど）を本番環境に反映するには、
            環境変数の更新が必要です。ここでの設定はUIプレビュー用です。
          </p>
        </Banner>

        <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* タスク抽出 */}
          <div style={{
            borderRadius: "8px",
            border: "1px solid #DFE1E6",
            background: "#FFFFFF",
            padding: "24px",
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#172B4D", marginBottom: "16px" }}>
              タスク抽出
            </h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(250px, 100%), 1fr))",
              gap: "16px",
            }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>
                  モデル
                </label>
                <Select
                  options={modelOptions}
                  value={modelOptions.find((o) => o.value === settings.taskExtraction.model)}
                  onChange={(opt) => {
                    const option = opt as { value: string } | null;
                    if (option) updateSetting("taskExtraction", "model", option.value);
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>
                  タイムアウト (ms)
                </label>
                <TextField
                  type="text"
                  inputMode="numeric"
                  value={String(settings.taskExtraction.timeoutMs)}
                  onChange={(e) =>
                    updateSetting(
                      "taskExtraction",
                      "timeoutMs",
                      parseInt((e.target as HTMLInputElement).value) || 30000
                    )
                  }
                />
              </div>
            </div>
          </div>

          {/* スキル学習 */}
          <div style={{
            borderRadius: "8px",
            border: "1px solid #DFE1E6",
            background: "#FFFFFF",
            padding: "24px",
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#172B4D", marginBottom: "16px" }}>
              スキル学習
            </h2>
            <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
              <Checkbox
                isChecked={settings.skillLearning.enabled}
                onChange={(e) =>
                  updateSetting("skillLearning", "enabled", e.currentTarget.checked)
                }
              />
              <label style={{ fontSize: "14px" }}>
                自動スキル学習を有効化
              </label>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(250px, 100%), 1fr))",
              gap: "16px",
            }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>
                  モデル
                </label>
                <Select
                  options={modelOptions}
                  value={modelOptions.find((o) => o.value === settings.skillLearning.model)}
                  onChange={(opt) => {
                    const option = opt as { value: string } | null;
                    if (option) updateSetting("skillLearning", "model", option.value);
                  }}
                  isDisabled={!settings.skillLearning.enabled}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>
                  タイムアウト (ms)
                </label>
                <TextField
                  type="text"
                  inputMode="numeric"
                  value={String(settings.skillLearning.timeoutMs)}
                  onChange={(e) =>
                    updateSetting(
                      "skillLearning",
                      "timeoutMs",
                      parseInt((e.target as HTMLInputElement).value) || 30000
                    )
                  }
                  isDisabled={!settings.skillLearning.enabled}
                />
              </div>
            </div>
          </div>

          {/* Flush */}
          <div style={{
            borderRadius: "8px",
            border: "1px solid #DFE1E6",
            background: "#FFFFFF",
            padding: "24px",
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#172B4D", marginBottom: "16px" }}>
              Flush設定
            </h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(250px, 100%), 1fr))",
              gap: "16px",
            }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>
                  デフォルトタイムアウト (ms)
                </label>
                <TextField
                  type="text"
                  inputMode="numeric"
                  value={String(settings.flush.defaultTimeoutMs)}
                  onChange={(e) =>
                    updateSetting(
                      "flush",
                      "defaultTimeoutMs",
                      parseInt((e.target as HTMLInputElement).value) || 50000
                    )
                  }
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>
                  デフォルトジョブタイプ
                </label>
                <Select
                  options={jobTypeOptions}
                  value={jobTypeOptions.find((o) => o.value === settings.flush.defaultJobType)}
                  onChange={(opt) => {
                    const option = opt as { value: "task_extraction" | "full_processing" } | null;
                    if (option) updateSetting("flush", "defaultJobType", option.value);
                  }}
                />
              </div>
            </div>
          </div>

          {/* ストレージ */}
          <div style={{
            borderRadius: "8px",
            border: "1px solid #DFE1E6",
            background: "#FFFFFF",
            padding: "24px",
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#172B4D", marginBottom: "16px" }}>
              ストレージ
            </h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(250px, 100%), 1fr))",
              gap: "16px",
            }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>
                  ストレージタイプ
                </label>
                <Select
                  options={storageOptions}
                  value={storageOptions.find((o) => o.value === settings.storage.type)}
                  onChange={(opt) => {
                    const option = opt as { value: "database" | "s3" } | null;
                    if (option) updateSetting("storage", "type", option.value);
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>
                  DBしきい値 (bytes)
                </label>
                <TextField
                  type="text"
                  inputMode="numeric"
                  value={String(settings.storage.dbThreshold)}
                  onChange={(e) =>
                    updateSetting(
                      "storage",
                      "dbThreshold",
                      parseInt((e.target as HTMLInputElement).value) || 1048576
                    )
                  }
                />
                <p style={{ marginTop: "4px", fontSize: "12px", color: "#6B778C" }}>
                  この値を超えるファイルはS3に保存されます（{Math.round(settings.storage.dbThreshold / 1024 / 1024 * 100) / 100} MB）
                </p>
              </div>
            </div>
          </div>

          {/* 環境変数リファレンス */}
          <div style={{
            borderRadius: "8px",
            border: "1px solid #DFE1E6",
            background: "#F4F5F7",
            padding: "24px",
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#172B4D", marginBottom: "16px" }}>
              環境変数リファレンス
            </h2>
            <pre style={{
              overflowX: "auto",
              borderRadius: "4px",
              background: "#172B4D",
              padding: "16px",
              fontSize: "12px",
              color: "#FFFFFF",
              fontFamily: "monospace",
            }}>
{`# タスク抽出
AI_TASK_EXTRACTION_MODEL="${settings.taskExtraction.model}"
AI_TASK_EXTRACTION_TIMEOUT_MS=${settings.taskExtraction.timeoutMs}

# スキル学習
AI_SKILL_LEARNING_ENABLED=${settings.skillLearning.enabled}
AI_SKILL_LEARNING_MODEL="${settings.skillLearning.model}"
AI_SKILL_LEARNING_TIMEOUT_MS=${settings.skillLearning.timeoutMs}

# Flush
AI_FLUSH_DEFAULT_TIMEOUT_MS=${settings.flush.defaultTimeoutMs}
AI_FLUSH_DEFAULT_JOB_TYPE="${settings.flush.defaultJobType}"

# ストレージ
AI_STORAGE_TYPE="${settings.storage.type}"
AI_STORAGE_DB_THRESHOLD=${settings.storage.dbThreshold}`}
            </pre>
          </div>
        </div>

        {/* 保存ボタン */}
        <div style={{
          marginTop: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <Button appearance="subtle" onClick={handleReset}>
            デフォルトに戻す
          </Button>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {saved && (
              <span style={{ fontSize: "14px", color: "#36B37E" }}>✓ 保存しました</span>
            )}
            <Button
              appearance="primary"
              onClick={handleSave}
              isDisabled={isSaving}
            >
              {isSaving ? "保存中..." : "設定を保存"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

