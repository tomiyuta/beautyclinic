"use client";

import Spinner from "@atlaskit/spinner";
import ReactMarkdown from "react-markdown";
import type { AIProvider } from "@/types/strategy";

interface SingleResultViewProps {
  result: {
    content: string;
    aiProvider: AIProvider;
    durationMs: number;
  } | null;
  isLoading?: boolean;
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
}: SingleResultViewProps) {
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

  return (
    <div style={{ borderRadius: "8px", border: "1px solid #DFE1E6", background: "#FFFFFF", padding: "24px" }}>
      <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#172B4D" }}>分析結果</h3>
        <div style={{ fontSize: "14px", color: "#6B778C" }}>
          {PROVIDER_LABELS[result.aiProvider]} / {(result.durationMs / 1000).toFixed(1)}秒
        </div>
      </div>
      <div style={{ fontSize: "14px", lineHeight: "1.6", color: "#172B4D" }}>
        <ReactMarkdown>{result.content}</ReactMarkdown>
      </div>
    </div>
  );
}

