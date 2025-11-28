"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import Button from "@atlaskit/button";
import { RadioGroup } from "@atlaskit/radio";
import Select from "@atlaskit/select";
import TextArea from "@atlaskit/textarea";
import Banner from "@atlaskit/banner";
import Spinner from "@atlaskit/spinner";
import SectionMessage from "@atlaskit/section-message";
import ReactMarkdown from "react-markdown";
import CouncilConfigPanel from "@/components/strategy/CouncilConfigPanel";
import CouncilResultView from "@/components/strategy/CouncilResultView";
import type { CouncilConfig, CouncilModel, CouncilResult } from "@/types/ai-council";
import { DEFAULT_COUNCIL_CONFIG } from "@/types/ai-council";
import { USER_ID_PLACEHOLDER } from "@/lib/constants";

// 分析モード
type AnalysisMode = "single" | "council";

// 分析タイプ
const ANALYSIS_TYPE_OPTIONS = [
  { label: "総合分析", value: "comprehensive" },
  { label: "価格設定提案", value: "pricing" },
  { label: "キャンペーン案", value: "campaign" },
  { label: "新施術導入提案", value: "new-treatment" },
];

// 単一AI選択肢（Grok追加）
const AI_PROVIDER_OPTIONS: { label: string; value: CouncilModel }[] = [
  { label: "Claude", value: "claude" },
  { label: "ChatGPT", value: "chatgpt" },
  { label: "Gemini", value: "gemini" },
  { label: "Grok", value: "grok" },
];

export default function StrategyAnalysisCouncilPage() {
  // 状態管理
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("single");
  const [analysisType, setAnalysisType] = useState<string>("comprehensive");
  const [aiProvider, setAiProvider] = useState<CouncilModel>("claude");
  const [councilConfig, setCouncilConfig] = useState<CouncilConfig>(DEFAULT_COUNCIL_CONFIG);

  // 結果
  const [singleResult, setSingleResult] = useState<{ content: string; aiProvider: string; durationMs: number } | null>(null);
  const [councilResult, setCouncilResult] = useState<CouncilResult | null>(null);

  // API呼び出し
  const singleMutation = api.strategy.runSingleAnalysis.useMutation({
    onSuccess: (data) => {
      setSingleResult(data);
      setCouncilResult(null);
    },
  });

  const councilMutation = api.strategy.runCouncilAnalysis.useMutation({
    onSuccess: (data) => {
      setCouncilResult(data);
      setSingleResult(null);
    },
  });

  const isLoading = singleMutation.isPending || councilMutation.isPending;

  // 分析実行
  const handleAnalyze = () => {

    if (analysisMode === "single") {
      singleMutation.mutate({
        userId: USER_ID_PLACEHOLDER,
        analysisType: analysisType as any,
        aiProvider,
      });
    } else {
      // Council: バリデーション
      if (councilConfig.models.length < 2) {
        alert("Councilには2つ以上のモデルが必要です");
        return;
      }
      if (councilConfig.chairmanMode === "manual" && !councilConfig.manualChairman) {
        alert("議長を選択してください");
        return;
      }

      councilMutation.mutate({
        userId: USER_ID_PLACEHOLDER,
        analysisType: analysisType as any,
        councilConfig,
      });
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "#F4F5F7", padding: "16px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "48px 16px" }}>
        <header style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "12px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "#172B4D" }}>
              戦略統合（Council）
            </h1>
          </div>
          <p style={{ fontSize: "14px", color: "#6B778C" }}>
            市場データとSNSトレンドを統合した戦略提案（単一AI / Council合議制）
          </p>
        </header>

        <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* 設定パネル */}
          <div style={{ padding: "32px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "24px", color: "#172B4D" }}>
              分析設定
            </h2>

            {/* 分析タイプ選択 */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                分析タイプ
              </label>
              <div style={{ width: "300px" }}>
                <Select
                  options={ANALYSIS_TYPE_OPTIONS}
                  value={ANALYSIS_TYPE_OPTIONS.find((o) => o.value === analysisType)}
                  onChange={(opt) => setAnalysisType((opt as any)?.value ?? "comprehensive")}
                  isDisabled={isLoading}
                />
              </div>
            </div>

            {/* 分析モード切り替え */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                分析モード
              </label>
              <RadioGroup
                options={[
                  { name: "mode", value: "single", label: "単一AI" },
                  { name: "mode", value: "council", label: "Council（合議制）" },
                ]}
                value={analysisMode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnalysisMode(e.target.value as AnalysisMode)}
                isDisabled={isLoading}
              />
            </div>

            {/* 単一AI選択 or Council設定 */}
            {analysisMode === "single" ? (
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                  使用AI
                </label>
                <div style={{ width: "200px" }}>
                  <Select
                    options={AI_PROVIDER_OPTIONS}
                    value={AI_PROVIDER_OPTIONS.find((o) => o.value === aiProvider)}
                    onChange={(opt) => setAiProvider((opt as any)?.value ?? "claude")}
                    isDisabled={isLoading}
                  />
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: "24px" }}>
                <CouncilConfigPanel
                  config={councilConfig}
                  onChange={setCouncilConfig}
                  disabled={isLoading}
                />
              </div>
            )}


            {/* 分析実行ボタン */}
            <Button
              appearance="primary"
              onClick={handleAnalyze}
              isDisabled={isLoading || (analysisMode === "council" && councilConfig.models.length < 2)}
            >
              {isLoading ? "分析中..." : analysisMode === "single" ? "分析を実行" : "Council分析を実行"}
            </Button>
          </div>

          {/* エラー表示 */}
          {(singleMutation.error || councilMutation.error) && (
            <Banner appearance="error">
              <div>
                <p style={{ marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>
                  エラーが発生しました
                </p>
                <p style={{ fontSize: "14px", color: "#6B778C" }}>
                  {singleMutation.error?.message || councilMutation.error?.message}
                </p>
              </div>
            </Banner>
          )}

          {/* 結果表示 */}
          {isLoading && (
            <div style={{ padding: "32px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6", textAlign: "center" }}>
              <Spinner size="large" />
              <p style={{ marginTop: "16px", fontSize: "14px", color: "#6B778C" }}>
                {analysisMode === "council" ? "Council分析を実行中..." : "分析を実行中..."}
              </p>
            </div>
          )}

          {analysisMode === "single" && singleResult && !isLoading && (
            <div style={{ padding: "32px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#172B4D" }}>分析結果</h3>
                <div style={{ fontSize: "12px", color: "#6B778C" }}>
                  {singleResult.aiProvider} / {(singleResult.durationMs / 1000).toFixed(1)}秒
                </div>
              </div>
              <div style={{ whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "16px", fontSize: "14px", color: "#172B4D", lineHeight: "1.6" }}>
                <ReactMarkdown>{singleResult.content}</ReactMarkdown>
              </div>
            </div>
          )}

          {analysisMode === "council" && !isLoading && (
            <div style={{ padding: "32px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
              <CouncilResultView
                result={councilResult}
                isLoading={false}
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
