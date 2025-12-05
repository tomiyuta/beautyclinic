"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import Button from "@atlaskit/button";
import { RadioGroup } from "@atlaskit/radio";
import Select from "@atlaskit/select";
import SectionMessage from "@atlaskit/section-message";

import CouncilConfigPanel from "@/components/strategy/CouncilConfigPanel";
import CouncilResultView from "@/components/strategy/CouncilResultView";
import SingleResultView from "@/components/strategy/SingleResultView";
import DataStatusPanel from "@/components/strategy/DataStatusPanel";
import MarketDataSelectionDrawer from "@/components/strategy/MarketDataSelectionDrawer";

import type { CouncilConfig, CouncilModel, CouncilResult } from "@/types/ai-council";
import { DEFAULT_COUNCIL_CONFIG } from "@/types/ai-council";
import type { AnalysisMode, StrategyAnalysisType, AIProvider } from "@/types/strategy";
import type { ResearchHistoryItem } from "@/components/research/history/useResearchHistory";
import { USER_ID_PLACEHOLDER } from "@/lib/constants";

// 分析タイプ選択肢
const ANALYSIS_TYPE_OPTIONS = [
  { label: "総合分析", value: "comprehensive" },
  { label: "価格設定提案", value: "pricing" },
  { label: "キャンペーン案", value: "campaign" },
  { label: "新施術導入提案", value: "new-treatment" },
];

// 単一AI選択肢
const AI_PROVIDER_OPTIONS: { label: string; value: AIProvider }[] = [
  { label: "Claude", value: "claude" },
  { label: "ChatGPT", value: "chatgpt" },
  { label: "Gemini", value: "gemini" },
  { label: "Grok", value: "grok" },
];

interface MarketDataSelection {
  trendIds: number[];
  priceIds: number[];
  competitorIds: number[];
}

export default function StrategyAnalysisPage() {
  // 状態管理
  const [analysisType, setAnalysisType] = useState<StrategyAnalysisType>("comprehensive");
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("single");
  const [aiProvider, setAiProvider] = useState<AIProvider>("claude");
  const [councilConfig, setCouncilConfig] = useState<CouncilConfig>(DEFAULT_COUNCIL_CONFIG);
  
  // 市場調査データ選択
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [marketDataSelection, setMarketDataSelection] = useState<MarketDataSelection>({
    trendIds: [],
    priceIds: [],
    competitorIds: [],
  });
  const [useCustomSelection, setUseCustomSelection] = useState(false);

  // 結果
  const [singleResult, setSingleResult] = useState<{
    content: string;
    aiProvider: AIProvider;
    durationMs: number;
  } | null>(null);
  const [councilResult, setCouncilResult] = useState<CouncilResult | null>(null);
  const [resultMetadata, setResultMetadata] = useState<{
    analysisId: string;
    createdAt: Date;
  } | null>(null);

  // データ状態取得
  const { data: dataStatus, isLoading: isLoadingStatus } =
    api.strategy.getDataStatus.useQuery({ userId: USER_ID_PLACEHOLDER });

  // API呼び出し
  const singleMutation = api.strategy.runSingleAnalysis.useMutation({
    onSuccess: (data) => {
      setSingleResult(data);
      setCouncilResult(null);
      setResultMetadata({
        analysisId: `single_${Date.now()}`,
        createdAt: new Date(),
      });
    },
  });

  const councilMutation = api.strategy.runCouncilAnalysis.useMutation({
    onSuccess: (data) => {
      setCouncilResult(data);
      setSingleResult(null);
      setResultMetadata({
        analysisId: `council_${Date.now()}`,
        createdAt: new Date(),
      });
    },
  });

  const isLoading = singleMutation.isPending || councilMutation.isPending;

  // 分析実行
  const handleAnalyze = () => {
    const baseParams = {
      userId: USER_ID_PLACEHOLDER,
      analysisType,
      // カスタム選択が有効で、何かしら選択されている場合のみ送信
      ...(useCustomSelection && (
        marketDataSelection.trendIds.length > 0 ||
        marketDataSelection.priceIds.length > 0 ||
        marketDataSelection.competitorIds.length > 0
      ) && { marketDataSelection }),
    };

    if (analysisMode === "single") {
      singleMutation.mutate({
        ...baseParams,
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
        ...baseParams,
        councilConfig,
      });
    }
  };

  // 選択状態の表示用
  const getSelectionSummary = () => {
    if (!useCustomSelection) return "自動選択（最新データ）";
    
    const parts = [];
    if (marketDataSelection.trendIds.length > 0) {
      parts.push(`トレンド: ${marketDataSelection.trendIds.length}件`);
    }
    if (marketDataSelection.priceIds.length > 0) {
      parts.push(`価格: ${marketDataSelection.priceIds.length}件`);
    }
    if (marketDataSelection.competitorIds.length > 0) {
      parts.push(`競合: ${marketDataSelection.competitorIds.length}件`);
    }
    
    return parts.length > 0 ? parts.join(", ") : "未選択";
  };

  // データ不足警告
  const hasDataWarning =
    dataStatus &&
    (!dataStatus.products.available ||
      !dataStatus.marketData.available ||
      !dataStatus.snsData.available);

  const handleSelectHistoryItem = (item: ResearchHistoryItem) => {
    if (item.type !== "strategy") return;
    setSelectedHistory(item);
    setIsHistoryOpen(false);
  };

  return (
    <main style={{ minHeight: "100vh", background: "#F4F5F7", padding: "16px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 16px" }}>
        {/* ヘッダー */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#172B4D", marginBottom: "8px" }}>
            戦略分析
          </h1>
          <p style={{ fontSize: "14px", color: "#6B778C" }}>
            市場データとSNSトレンドを統合した戦略提案（単一AI / Council合議制対応）
          </p>
        </div>

        {/* 設定パネル */}
        <div style={{ marginBottom: "24px", borderRadius: "8px", border: "1px solid #DFE1E6", background: "#FFFFFF", padding: "24px" }}>
          {/* 分析タイプ選択 */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#172B4D" }}>
              分析タイプ
            </label>
            <div style={{ width: "256px" }}>
              <Select
                options={ANALYSIS_TYPE_OPTIONS}
                value={ANALYSIS_TYPE_OPTIONS.find((o) => o.value === analysisType)}
                onChange={(opt) =>
                  setAnalysisType((opt as any)?.value as StrategyAnalysisType)
                }
                isDisabled={isLoading}
              />
            </div>
          </div>

          {/* 分析モード切り替え */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#172B4D" }}>
              分析モード
            </label>
            <RadioGroup
              options={[
                { name: "mode", value: "single", label: "単一AI" },
                { name: "mode", value: "council", label: "Council（合議制）" },
              ]}
              value={analysisMode}
              onChange={(e) => setAnalysisMode(e.target.value as AnalysisMode)}
              isDisabled={isLoading}
            />
          </div>

          {/* 単一AI選択 or Council設定 */}
          {analysisMode === "single" ? (
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#172B4D" }}>
                使用AI
              </label>
              <div style={{ width: "192px" }}>
                <Select
                  options={AI_PROVIDER_OPTIONS}
                  value={AI_PROVIDER_OPTIONS.find((o) => o.value === aiProvider)}
                  onChange={(opt) => setAiProvider((opt as any)?.value as AIProvider)}
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

          {/* データ状態 */}
          <div style={{ marginBottom: "24px" }}>
            <DataStatusPanel status={dataStatus} isLoading={isLoadingStatus} />
          </div>

          {/* 市場調査データ選択 */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", marginBottom: "12px", fontSize: "14px", fontWeight: 500, color: "#172B4D" }}>
              市場調査データの選択
            </label>
            
            <div style={{ 
              border: "1px solid #DFE1E6", 
              borderRadius: "8px", 
              padding: "16px",
              background: "#F4F5F7"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <input
                  type="radio"
                  id="auto-selection"
                  name="data-selection"
                  checked={!useCustomSelection}
                  onChange={() => setUseCustomSelection(false)}
                  disabled={isLoading}
                />
                <label htmlFor="auto-selection" style={{ fontSize: "14px", color: "#172B4D" }}>
                  自動選択（各カテゴリの最新データ）
                </label>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <input
                  type="radio"
                  id="custom-selection"
                  name="data-selection"
                  checked={useCustomSelection}
                  onChange={() => setUseCustomSelection(true)}
                  disabled={isLoading}
                />
                <label htmlFor="custom-selection" style={{ fontSize: "14px", color: "#172B4D" }}>
                  カスタム選択（複数のAIデータを組み合わせ）
                </label>
              </div>
              
              {useCustomSelection && (
                <div style={{ 
                  marginTop: "16px", 
                  paddingTop: "16px", 
                  borderTop: "1px solid #DFE1E6" 
                }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between",
                    marginBottom: "8px"
                  }}>
                    <span style={{ fontSize: "14px", color: "#172B4D" }}>
                      選択状態: {getSelectionSummary()}
                    </span>
                    <Button
                      appearance="subtle"
                      onClick={() => setIsDrawerOpen(true)}
                      isDisabled={isLoading}
                    >
                      データを選択
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* データ不足警告 */}
          {hasDataWarning && (
            <div style={{ marginBottom: "24px" }}>
              <SectionMessage appearance="warning" title="データが不足しています">
                <p style={{ fontSize: "14px", margin: 0 }}>
                  分析精度を高めるため、市場調査・SNS調査を先に実行することを推奨します。
                </p>
              </SectionMessage>
            </div>
          )}

          {/* 分析実行ボタン */}
          <Button
            appearance="primary"
            onClick={handleAnalyze}
            isDisabled={isLoading || (analysisMode === "council" && councilConfig.models.length < 2)}
          >
            {isLoading
              ? "分析中..."
              : analysisMode === "single"
              ? "分析を実行"
              : "Council分析を実行"}
          </Button>
        </div>

        {/* エラー表示 */}
        {(singleMutation.error || councilMutation.error) && (
          <div style={{ marginBottom: "24px" }}>
            <SectionMessage appearance="error" title="エラーが発生しました">
              <p style={{ fontSize: "14px", margin: 0 }}>
                {singleMutation.error?.message || councilMutation.error?.message}
              </p>
            </SectionMessage>
          </div>
        )}

        {/* 結果表示 */}
        {analysisMode === "single" ? (
          <SingleResultView
            result={singleResult}
            isLoading={singleMutation.isPending}
            metadata={resultMetadata ? {
              analysisId: resultMetadata.analysisId,
              analysisType,
              userId: USER_ID_PLACEHOLDER,
              createdAt: resultMetadata.createdAt,
            } : undefined}
            inputData={useCustomSelection ? {
              marketDataSelection: marketDataSelection,
            } : undefined}
          />
        ) : (
          <CouncilResultView
            result={councilResult}
            isLoading={councilMutation.isPending}
            metadata={resultMetadata ? {
              analysisId: resultMetadata.analysisId,
              analysisType,
              userId: USER_ID_PLACEHOLDER,
              createdAt: resultMetadata.createdAt,
            } : undefined}
            inputData={useCustomSelection ? {
              marketDataSelection: marketDataSelection,
            } : undefined}
          />
        )}

        {/* データ選択ドロワー */}
        <MarketDataSelectionDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          selection={marketDataSelection}
          onSelectionChange={setMarketDataSelection}
        />
      </div>

      {/* 戦略分析履歴ドロワー */}
      <HistoryTrigger onClick={() => setIsHistoryOpen(true)} />
      <ResearchHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        type="strategy"
        onSelectItem={handleSelectHistoryItem}
      />
    </main>
  );
}
