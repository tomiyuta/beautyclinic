"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUnifiedWorkspaceStore, type ActiveTab } from "@/stores/unified-workspace-store";
import Button from "@atlaskit/button";
import Select from "@atlaskit/select";
import TextField from "@atlaskit/textfield";
import { useRouter } from "next/navigation";

type AIModel = "gemini" | "claude" | "chatgpt" | "grok";
type ResearchType = "trend_analysis" | "price_research" | "competitor_analysis";

const AI_MODEL_OPTIONS = [
  { label: "Gemini", value: "gemini" },
  { label: "Claude", value: "claude" },
  { label: "GPT-4", value: "chatgpt" },
  { label: "Grok", value: "grok" },
];

const MARKET_RESEARCH_TYPE_OPTIONS = [
  { label: "トレンド分析", value: "trend_analysis" },
  { label: "価格調査", value: "price_research" },
  { label: "競合分析", value: "competitor_analysis" },
];

const SNS_PLATFORM_OPTIONS = [
  { label: "Instagram", value: "instagram" },
  { label: "Twitter", value: "twitter" },
  { label: "TikTok", value: "tiktok" },
  { label: "YouTube", value: "youtube" },
];

export function NewAnalysisModal() {
  const { isNewAnalysisModalOpen, setIsNewAnalysisModalOpen, activeTab, setActiveTab } = useUnifiedWorkspaceStore();
  const router = useRouter();
  
  const [aiModel, setAiModel] = useState<AIModel>("gemini");
  const [researchType, setResearchType] = useState<ResearchType>("trend_analysis");
  const [platform, setPlatform] = useState<string>("instagram");
  const [query, setQuery] = useState("");

  const handleSubmit = () => {
    if (!query.trim()) return;

    if (activeTab === "MARKET") {
      router.push(`/market-research?aiAgent=${aiModel}&researchType=${researchType}&location=${encodeURIComponent(query)}`);
    } else if (activeTab === "SNS") {
      router.push(`/sns-research?aiAgent=${aiModel}&platform=${platform}&keywords=${encodeURIComponent(query)}`);
    } else {
      router.push(`/strategy-analysis?analysisType=comprehensive`);
    }

    setIsNewAnalysisModalOpen(false);
    setQuery("");
  };

  return (
    <AnimatePresence>
      {isNewAnalysisModalOpen && (
        <>
          {/* バックドロップ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsNewAnalysisModalOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />

          {/* モーダル */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-16 right-8 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 p-6"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800">新規分析</h3>
                <button
                  onClick={() => setIsNewAnalysisModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              {/* AIモデル選択 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  AIモデル
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AI_MODEL_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setAiModel(option.value as AIModel)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        aiModel === option.value
                          ? "bg-teal-600 text-white"
                          : "bg-gray-100 text-slate-700 hover:bg-gray-200"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 調査タイプ/プラットフォーム選択 */}
              {activeTab === "MARKET" && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    調査タイプ
                  </label>
                  <Select
                    options={MARKET_RESEARCH_TYPE_OPTIONS}
                    value={MARKET_RESEARCH_TYPE_OPTIONS.find((opt) => opt.value === researchType)}
                    onChange={(option) => option && setResearchType(option.value as ResearchType)}
                    placeholder="調査タイプを選択"
                  />
                </div>
              )}

              {activeTab === "SNS" && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    プラットフォーム
                  </label>
                  <Select
                    options={SNS_PLATFORM_OPTIONS}
                    value={SNS_PLATFORM_OPTIONS.find((opt) => opt.value === platform)}
                    onChange={(option) => option && setPlatform(option.value)}
                    placeholder="プラットフォームを選択"
                  />
                </div>
              )}

              {/* 入力フィールド */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  {activeTab === "MARKET" ? "場所" : activeTab === "SNS" ? "キーワード" : "分析タイプ"}
                </label>
                <TextField
                  value={query}
                  onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
                  placeholder={
                    activeTab === "MARKET"
                      ? "例: 東京 渋谷"
                      : activeTab === "SNS"
                      ? "例: 美容クリニック ボトックス"
                      : "分析を開始"
                  }
                />
              </div>

              {/* 実行ボタン */}
              <Button
                appearance="primary"
                onClick={handleSubmit}
                isDisabled={!query.trim()}
                className="w-full bg-teal-600"
              >
                分析を開始
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

