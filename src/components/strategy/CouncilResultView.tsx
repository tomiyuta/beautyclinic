"use client";

import { useState } from "react";
import Badge from "@atlaskit/badge";
import Tabs, { Tab, TabList, TabPanel } from "@atlaskit/tabs";
import Spinner from "@atlaskit/spinner";
import ReactMarkdown from "react-markdown";
import Button from "@atlaskit/button";
import { useToastContext } from "@/components/ToastProvider";
import type { CouncilResult, CouncilModel } from "@/types/ai-council";
import DownloadButton from "./DownloadButton";
import type { AnalysisResultData } from "./DownloadUtils";

interface CouncilResultViewProps {
  result: CouncilResult | null;
  isLoading?: boolean;
  // ダウンロード用の追加メタデータ
  metadata?: {
    analysisId?: string;
    analysisType?: string;
    userId?: number;
    createdAt?: Date;
    location?: string;
  };
  inputData?: {
    productIds?: number[];
    marketDataSelection?: {
      trendIds?: number[];
      priceIds?: number[];
      competitorIds?: number[];
    };
  };
}

const MODEL_LABELS: Record<CouncilModel, string> = {
  claude: "Claude",
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  grok: "Grok",
};

export default function CouncilResultView({
  result,
  isLoading = false,
  metadata,
  inputData,
}: CouncilResultViewProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const toast = useToastContext();

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px" }}>
        <Spinner size="large" />
        <p style={{ marginTop: "16px", fontSize: "14px", color: "#6B778C" }}>Council分析を実行中...</p>
        <p style={{ marginTop: "8px", fontSize: "12px", color: "#6B778C" }}>
          複数のAIが並列で分析しています（約1-2分）
        </p>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const validResponses = result.stage1.responses.filter((r) => !r.error);

  // ダウンロード用データを準備
  const downloadData: AnalysisResultData = {
    councilResult: result,
    metadata: {
      analysisId: metadata?.analysisId || `council_${Date.now()}`,
      analysisType: metadata?.analysisType || 'comprehensive',
      analysisMode: 'council',
      userId: metadata?.userId || 1,
      createdAt: metadata?.createdAt || new Date(),
      location: metadata?.location,
    },
    inputData,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ヘッダー情報 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#172B4D" }}>
          📊 Council分析結果
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ fontSize: "12px", color: "#6B778C" }}>
            総処理時間: {(result.totalDurationMs / 1000).toFixed(1)}秒
          </div>
          <Button
            appearance="subtle"
            onClick={handleCopy}
            style={{
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "999px",
            }}
          >
            <span style={{ fontSize: "14px" }}>📋</span>
            <span>テキストをコピー</span>
          </Button>
        </div>
      </div>

      {/* 最終統合結果 */}
      <div style={{ padding: "24px", borderRadius: "8px", border: "2px solid #0052CC", background: "#E3FCEF" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#172B4D" }}>最終統合結果</h4>
          <Badge appearance="added">
            議長: {MODEL_LABELS[result.stage3.chairman]}
          </Badge>
          <span style={{ fontSize: "12px", color: "#6B778C" }}>
            ({(result.stage3.durationMs / 1000).toFixed(1)}秒)
          </span>
        </div>
        <div style={{ whiteSpace: "pre-wrap", borderRadius: "4px", background: "#FFFFFF", padding: "16px", fontSize: "14px", color: "#172B4D", lineHeight: "1.6" }}>
          <ReactMarkdown>{result.stage3.content}</ReactMarkdown>
        </div>
      </div>

      {/* ピアレビュー結果 */}
      {result.stage2 && result.stage2.aggregateRankings.length > 0 && (
        <div style={{ padding: "24px", borderRadius: "8px", border: "1px solid #DFE1E6", background: "#FFFFFF" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
            🏆 ピアレビュー結果（AI相互評価）
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            {result.stage2.aggregateRankings.map((ranking, index) => (
              <div
                key={ranking.model}
                style={{
                  padding: "16px",
                  borderRadius: "4px",
                  background: index === 0 ? "#FFF4E5" : "#F4F5F7",
                  border: index === 0 ? "2px solid #FF991F" : "1px solid #DFE1E6",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "16px", fontWeight: 600, color: index === 0 ? "#FF991F" : "#42526E" }}>
                    {index + 1}位
                  </span>
                  <Badge appearance={index === 0 ? "added" : "default"}>
                    {MODEL_LABELS[ranking.model]}
                  </Badge>
                </div>
                <p style={{ margin: 0, fontSize: "12px", color: "#6B778C" }}>
                  平均 {ranking.averageRank.toFixed(2)} 位 / {ranking.votes} 票
                </p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: "12px", fontSize: "12px", color: "#6B778C" }}>
            ※ 各AIが他のAIの回答を匿名で評価し、順位付けしました
          </p>
        </div>
      )}

      {/* 各AIの個別回答 */}
      <div style={{ borderRadius: "8px", border: "1px solid #DFE1E6", background: "#FFFFFF" }}>
        <h4 style={{ fontSize: "14px", fontWeight: 600, padding: "16px", borderBottom: "1px solid #DFE1E6", color: "#172B4D" }}>
          💬 各AIの個別回答
          <span style={{ marginLeft: "8px", fontSize: "12px", fontWeight: 400, color: "#6B778C" }}>
            (Stage 1: {(result.stage1.durationMs / 1000).toFixed(1)}秒)
          </span>
        </h4>
        
        <Tabs id="council-responses" onChange={setSelectedTab} selected={selectedTab}>
          <TabList>
            {validResponses.map((response) => (
              <Tab key={response.model}>
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {MODEL_LABELS[response.model]}
                  <span style={{ fontSize: "11px", color: "#6B778C" }}>
                    ({(response.durationMs / 1000).toFixed(1)}秒)
                  </span>
                </span>
              </Tab>
            ))}
            {/* エラーがあった場合 */}
            {result.stage1.responses.filter((r) => r.error).length > 0 && (
              <Tab>
                <span style={{ color: "#DE350B" }}>
                  エラー ({result.stage1.responses.filter((r) => r.error).length})
                </span>
              </Tab>
            )}
          </TabList>

          {validResponses.map((response) => (
            <TabPanel key={response.model}>
              <div style={{ padding: "16px" }}>
                <div style={{ whiteSpace: "pre-wrap", fontSize: "14px", color: "#172B4D", lineHeight: "1.6" }}>
                  <ReactMarkdown>{response.content}</ReactMarkdown>
                </div>
              </div>
            </TabPanel>
          ))}

          {/* エラータブ */}
          {result.stage1.responses.filter((r) => r.error).length > 0 && (
            <TabPanel>
              <div style={{ padding: "16px" }}>
                {result.stage1.responses
                  .filter((r) => r.error)
                  .map((response) => (
                    <div
                      key={response.model}
                      style={{ marginBottom: "8px", padding: "12px", borderRadius: "4px", background: "#FFEBE6", fontSize: "12px", color: "#DE350B" }}
                    >
                      <strong>{MODEL_LABELS[response.model]}:</strong> {response.error}
                    </div>
                  ))}
              </div>
            </TabPanel>
          )}
        </Tabs>
      </div>

      {/* ダウンロードボタンを追加 */}
      <DownloadButton data={downloadData} />
    </div>
  );
}
