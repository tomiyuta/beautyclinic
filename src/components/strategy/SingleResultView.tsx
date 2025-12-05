"use client";

import Spinner from "@atlaskit/spinner";
import Button from "@atlaskit/button";
import { useToastContext } from "@/components/ToastProvider";
import ReactMarkdown from "react-markdown";
import type { AIProvider } from "@/types/strategy";
import DownloadButton from "./DownloadButton";
import type { AnalysisResultData } from "./DownloadUtils";

interface SingleResultViewProps {
  result: {
    content: string;
    aiProvider: AIProvider;
    durationMs: number;
  } | null;
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

const PROVIDER_LABELS: Record<AIProvider, string> = {
  claude: "Claude",
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  grok: "Grok",
};

export default function SingleResultView({
  result,
  isLoading = false,
  metadata,
  inputData,
}: SingleResultViewProps) {
  const toast = useToastContext();

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.content);
      toast.showSuccess("テキストをクリップボードにコピーしました");
    } catch (error) {
      toast.showError("コピーに失敗しました");
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
        <Spinner size="large" />
        <p style={{ marginTop: "16px", color: "#6B778C" }}>分析を実行中...</p>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  // ダウンロード用データを準備
  const downloadData: AnalysisResultData = {
    singleResult: {
      content: result.content,
      aiProvider: result.aiProvider,
      durationMs: result.durationMs,
    },
    metadata: {
      analysisId: metadata?.analysisId || `single_${Date.now()}`,
      analysisType: metadata?.analysisType || 'comprehensive',
      analysisMode: 'single',
      userId: metadata?.userId || 1,
      createdAt: metadata?.createdAt || new Date(),
      location: metadata?.location,
    },
    inputData,
  };

  return (
    <div style={{ borderRadius: "8px", border: "1px solid #DFE1E6", background: "#FFFFFF", padding: "24px" }}>
      <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#172B4D" }}>分析結果</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ fontSize: "14px", color: "#6B778C" }}>
            {PROVIDER_LABELS[result.aiProvider]} / {(result.durationMs / 1000).toFixed(1)}秒
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
      <div style={{ fontSize: "14px", lineHeight: "1.6", color: "#172B4D" }}>
        <ReactMarkdown>{result.content}</ReactMarkdown>
      </div>
      
      {/* ダウンロードボタンを追加 */}
      <DownloadButton data={downloadData} />
    </div>
  );
}

