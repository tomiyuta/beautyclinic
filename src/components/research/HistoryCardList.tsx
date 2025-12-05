"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { ResearchHistoryItem } from "@/components/research/history/useResearchHistory";
import { ResearchDetailDrawer } from "./ResearchDetailDrawer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Button from "@atlaskit/button";
import { useToastContext } from "@/components/ToastProvider";
import CopyIcon from "@atlaskit/icon/glyph/copy";

interface HistoryCardListProps {
  items: ResearchHistoryItem[];
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  showDetails?: boolean; // 詳細表示を有効にするか
}

export function HistoryCardList({ items, selectedId, onSelect, showDetails = false }: HistoryCardListProps) {
  const toast = useToastContext();
  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return items.find((item) => item.id === selectedId) || null;
  }, [items, selectedId]);

  const handleClose = () => {
    if (onSelect) {
      onSelect(0); // 0を渡すことで選択解除（-1は無効なID）
    }
  };

  const handleCopy = async (item: ResearchHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation(); // 親要素のクリックイベントを防ぐ
    
    try {
      const rawData = item.raw as any;
      const content = rawData?.processedData || rawData?.trendData || rawData?.content || item.summary;
      const contentText = typeof content === "string" ? content : JSON.stringify(content, null, 2);
      
      await navigator.clipboard.writeText(contentText);
      toast.showSuccess("調査結果をクリップボードにコピーしました");
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.showError("コピーに失敗しました");
    }
  };
  // 日付でグループ化
  const groupedItems = useMemo(() => {
    const groups: Record<string, ResearchHistoryItem[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    items.forEach((item) => {
      const itemDate = new Date(item.createdAt);
      if (itemDate >= today) {
        groups.today.push(item);
      } else if (itemDate >= yesterday) {
        groups.yesterday.push(item);
      } else if (itemDate >= thisWeek) {
        groups.thisWeek.push(item);
      } else {
        groups.older.push(item);
      }
    });

    return groups;
  }, [items]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  };

  const getTypeLabel = (item: ResearchHistoryItem) => {
    if (item.type === "market") {
      const raw = item.raw as any;
      if (raw?.researchType === "trend_analysis") return "Trend Analysis";
      if (raw?.researchType === "price_research") return "Price Research";
      if (raw?.researchType === "competitor_analysis") return "Competitor Analysis";
      return "Market Research";
    }
    if (item.type === "sns") {
      return `${item.platform?.toUpperCase() || "SNS"} Research`;
    }
    return "Strategy Analysis";
  };

  const getStatusColor = (item: ResearchHistoryItem) => {
    if (item.status === "error") return "bg-red-500";
    if (item.type === "market") return "bg-blue-500";
    if (item.type === "sns") return "bg-purple-500";
    return "bg-teal-500";
  };

  const handleClick = (id: number) => {
    if (onSelect) {
      onSelect(id);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {groupedItems.today.length > 0 && (
          <HistoryGroup
            title="今日"
            items={groupedItems.today}
            selectedId={selectedId}
            onSelect={handleClick}
            onCopy={handleCopy}
            getTypeLabel={getTypeLabel}
            getStatusColor={getStatusColor}
            formatTime={formatTime}
          />
        )}
        {groupedItems.yesterday.length > 0 && (
          <HistoryGroup
            title="昨日"
            items={groupedItems.yesterday}
            selectedId={selectedId}
            onSelect={handleClick}
            onCopy={handleCopy}
            getTypeLabel={getTypeLabel}
            getStatusColor={getStatusColor}
            formatTime={formatTime}
          />
        )}
        {groupedItems.thisWeek.length > 0 && (
          <HistoryGroup
            title="今週"
            items={groupedItems.thisWeek}
            selectedId={selectedId}
            onSelect={handleClick}
            onCopy={handleCopy}
            getTypeLabel={getTypeLabel}
            getStatusColor={getStatusColor}
            formatTime={formatTime}
          />
        )}
        {groupedItems.older.length > 0 && (
          <HistoryGroup
            title="それ以前"
            items={groupedItems.older}
            selectedId={selectedId}
            onSelect={handleClick}
            onCopy={handleCopy}
            getTypeLabel={getTypeLabel}
            getStatusColor={getStatusColor}
            formatTime={formatTime}
          />
        )}
      </div>

      {/* 詳細表示ドロワー */}
      {showDetails && selectedItem && selectedId && selectedId > 0 && (
        <ResearchDetailDrawer
          isOpen={!!selectedItem}
          onClose={handleClose}
          title={selectedItem.query}
          onCopy={async () => {
            try {
              const rawData = selectedItem.raw as any;
              const content = rawData?.processedData || rawData?.trendData || rawData?.content || selectedItem.summary;
              const contentText = typeof content === "string" ? content : JSON.stringify(content, null, 2);
              
              await navigator.clipboard.writeText(contentText);
              toast.showSuccess("調査結果をクリップボードにコピーしました");
            } catch (error) {
              console.error("Failed to copy:", error);
              toast.showError("コピーに失敗しました");
            }
          }}
          copyText={(() => {
            const rawData = selectedItem.raw as any;
            const content = rawData?.processedData || rawData?.trendData || rawData?.content || selectedItem.summary;
            return typeof content === "string" ? content : JSON.stringify(content, null, 2);
          })()}
        >
          <div>
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="text-xs text-slate-500 mb-1">調査日時</div>
              <div className="text-sm font-medium">
                {selectedItem.createdAt.toLocaleString("ja-JP")}
              </div>
            </div>

            {selectedItem.aiAgent && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <div className="text-xs text-slate-500 mb-1">AIモデル</div>
                <div className="text-sm font-medium">{selectedItem.aiAgent}</div>
              </div>
            )}

            {selectedItem.platform && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <div className="text-xs text-slate-500 mb-1">プラットフォーム</div>
                <div className="text-sm font-medium">{selectedItem.platform.toUpperCase()}</div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-slate-500">調査結果</div>
                <Button
                  appearance="subtle"
                  iconBefore={<CopyIcon label="コピー" />}
                  onClick={async () => {
                    try {
                      const rawData = selectedItem.raw as any;
                      const content = rawData?.processedData || rawData?.trendData || rawData?.content || selectedItem.summary;
                      const contentText = typeof content === "string" ? content : JSON.stringify(content, null, 2);
                      
                      await navigator.clipboard.writeText(contentText);
                      toast.showSuccess("調査結果をクリップボードにコピーしました");
                    } catch (error) {
                      console.error("Failed to copy:", error);
                      toast.showError("コピーに失敗しました");
                    }
                  }}
                >
                  コピー
                </Button>
              </div>
              <div className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-lg">
                {(() => {
                  const rawData = selectedItem.raw as any;
                  const content = rawData?.processedData || rawData?.trendData || rawData?.content || selectedItem.summary;
                  
                  if (typeof content === "string") {
                    return (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content}
                      </ReactMarkdown>
                    );
                  }
                  return (
                    <pre className="text-sm overflow-x-auto">
                      {JSON.stringify(content, null, 2)}
                    </pre>
                  );
                })()}
              </div>
            </div>
          </div>
        </ResearchDetailDrawer>
      )}
    </>
  );
}

interface HistoryGroupProps {
  title: string;
  items: ResearchHistoryItem[];
  selectedId?: number | null;
  onSelect: (id: number) => void;
  onCopy: (item: ResearchHistoryItem, e: React.MouseEvent) => void;
  getTypeLabel: (item: ResearchHistoryItem) => string;
  getStatusColor: (item: ResearchHistoryItem) => string;
  formatTime: (date: Date) => string;
}

function HistoryGroup({
  title,
  items,
  selectedId,
  onSelect,
  onCopy,
  getTypeLabel,
  getStatusColor,
  formatTime,
}: HistoryGroupProps) {
  return (
    <div className="mb-4">
      <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
        {title}
      </div>
      <div className="space-y-1">
        {items.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <div
              key={item.id}
              className={`relative w-full px-4 py-3 rounded-lg transition-colors ${
                isSelected
                  ? "bg-teal-50/50 border border-teal-100"
                  : "hover:bg-gray-50"
              }`}
            >
              <motion.button
                onClick={() => onSelect(item.id)}
                className="w-full text-left"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-start gap-3 pr-8">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${getStatusColor(item)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-600">
                        {getTypeLabel(item)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatTime(new Date(item.createdAt))}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-slate-800 mb-1 truncate">
                      {item.query}
                    </div>
                    <div className="text-xs text-slate-500 line-clamp-2">
                      {item.summary}
                    </div>
                  </div>
                </div>
              </motion.button>
              {/* コピーボタン */}
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={(e) => onCopy(item, e)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded transition-colors flex items-center justify-center w-7 h-7"
                  title="クリップボードにコピー"
                  type="button"
                  aria-label="クリップボードにコピー"
                >
                  <CopyIcon label="コピー" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

