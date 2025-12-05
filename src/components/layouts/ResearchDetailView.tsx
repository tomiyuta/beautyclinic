"use client";

import { useMemo } from "react";
import { useUnifiedWorkspaceStore } from "@/stores/unified-workspace-store";
import { useResearchHistory } from "@/components/research/history/useResearchHistory";
import Button from "@atlaskit/button";
import Badge from "@atlaskit/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExportActions } from "./ExportActions";

export function ResearchDetailView() {
  const { selectedResearchId, activeTab, setIsNewAnalysisModalOpen } = useUnifiedWorkspaceStore();
  
  const historyType = activeTab === "MARKET" ? "market" : activeTab === "SNS" ? "sns" : "strategy";
  const { items, isLoading } = useResearchHistory(historyType);

  const selectedItem = useMemo(() => {
    if (!selectedResearchId) return null;
    return items.find((item) => item.id === selectedResearchId) || null;
  }, [items, selectedResearchId]);

  const getStatusBadge = () => {
    if (!selectedItem) return null;
    if (selectedItem.status === "error") {
      return <Badge appearance="removed">ERROR</Badge>;
    }
    return <Badge appearance="added">COMPLETED</Badge>;
  };

  const getModelInfo = () => {
    if (!selectedItem?.aiAgent) return null;
    const modelMap: Record<string, string> = {
      gemini: "Gemini 1.5 Pro",
      claude: "Claude 3.5 Sonnet",
      chatgpt: "GPT-4",
      grok: "Grok",
    };
    return modelMap[selectedItem.aiAgent] || selectedItem.aiAgent;
  };

  if (!selectedItem) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-800 mb-2">
            研究結果を選択してください
          </div>
          <div className="text-sm text-slate-500 mb-6">
            左側のサイドバーから履歴を選択すると、詳細が表示されます
          </div>
          <Button
            appearance="primary"
            onClick={() => setIsNewAnalysisModalOpen(true)}
          >
            + New Analysis
          </Button>
        </div>
      </div>
    );
  }

  const rawData = selectedItem.raw as any;
  const content = rawData?.processedData || rawData?.trendData || rawData?.content || selectedItem.summary;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* スティッキーヘッダー */}
      <div className="h-16 bg-white/80 backdrop-blur-sm border-b border-gray-100 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">
              {selectedItem.query}
            </h1>
          </div>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-4">
          {getModelInfo() && (
            <div className="text-xs text-slate-500">
              Model: {getModelInfo()}
            </div>
          )}
          {selectedItem && <ExportActions item={selectedItem} />}
          <Button
            appearance="subtle"
            onClick={() => setIsNewAnalysisModalOpen(true)}
          >
            + New Analysis
          </Button>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* ダッシュボードカード（戦略分析の場合） */}
          {selectedItem.type === "strategy" && selectedItem.strategySummary && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="text-xs text-slate-500 mb-1">価格提案</div>
                <div className="text-2xl font-bold text-slate-800">
                  {selectedItem.strategySummary.priceRecommendationsCount}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="text-xs text-slate-500 mb-1">キャンペーン案</div>
                <div className="text-2xl font-bold text-slate-800">
                  {selectedItem.strategySummary.campaignProposalsCount}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="text-xs text-slate-500 mb-1">新施術提案</div>
                <div className="text-2xl font-bold text-slate-800">
                  {selectedItem.strategySummary.newTreatmentSuggestionsCount}
                </div>
              </div>
            </div>
          )}

          {/* レポート本文 */}
          <div className="prose prose-sm max-w-none">
            {typeof content === "string" ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            ) : (
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(content, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

