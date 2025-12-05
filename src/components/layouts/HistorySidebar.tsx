"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useUnifiedWorkspaceStore, type ActiveTab } from "@/stores/unified-workspace-store";
import { useResearchHistory, type ResearchHistoryItem } from "@/components/research/history/useResearchHistory";
import TextField from "@atlaskit/textfield";
import Button from "@atlaskit/button";
import { useToastContext } from "@/components/ToastProvider";
import CopyIcon from "@atlaskit/icon/glyph/copy";

export function HistorySidebar() {
  const { activeTab, setActiveTab, selectedResearchId, setSelectedResearchId, isSidebarOpen } = useUnifiedWorkspaceStore();
  const [searchQuery, setSearchQuery] = useState("");
  const toast = useToastContext();

  // 履歴データを取得
  const historyType = activeTab === "MARKET" ? "market" : activeTab === "SNS" ? "sns" : "strategy";
  const { items, isLoading } = useResearchHistory(historyType);

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

  // 検索フィルタリング
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.query.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

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

    filteredItems.forEach((item) => {
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
  }, [filteredItems]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "今日";
    if (days === 1) return "昨日";
    if (days < 7) return `${days}日前`;
    
    return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
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

  if (!isSidebarOpen) {
    return (
      <button
        onClick={() => useUnifiedWorkspaceStore.getState().setIsSidebarOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-white border-r border-gray-200 px-2 py-4 rounded-r-lg shadow-sm hover:bg-gray-50"
      >
        <span className="text-xl">→</span>
      </button>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-bold text-slate-800">💎 クリマケ</h2>
        <button
          onClick={() => useUnifiedWorkspaceStore.getState().setIsSidebarOpen(false)}
          className="p-1 text-slate-500 hover:text-slate-700 hover:bg-gray-100 rounded"
        >
          ←
        </button>
      </div>

      {/* ナビゲーションタブ */}
      <div className="flex bg-gray-50 p-1 gap-1">
        {(["MARKET", "SNS", "STRATEGY"] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
              activeTab === tab
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "MARKET" ? "市場" : tab === "SNS" ? "SNS" : "戦略"}
          </button>
        ))}
      </div>

      {/* 検索バー */}
      <div className="px-4 py-3 border-b border-gray-200">
        <TextField
          value={searchQuery}
          onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
          placeholder="履歴を検索..."
          className="w-full"
        />
      </div>

      {/* 履歴リスト */}
      <div 
        className="flex-1 overflow-y-auto"
        onScroll={(e) => {
          // 無限スクロール: スクロールが下部に近づいたら追加データをロード
          const target = e.target as HTMLElement;
          const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
          if (scrollBottom < 100 && !isLoading && filteredItems.length > 0) {
            // 将来的に無限スクロールを実装する場合はここで追加データをロード
            // 現在は全データを一度に取得しているため、実装は保留
          }
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-slate-500">読み込み中...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-slate-500">履歴がありません</div>
          </div>
        ) : (
          <div className="py-2">
            {groupedItems.today.length > 0 && (
              <HistoryGroup
                title="今日"
                items={groupedItems.today}
                selectedId={selectedResearchId}
                onSelect={setSelectedResearchId}
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
                selectedId={selectedResearchId}
                onSelect={setSelectedResearchId}
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
                selectedId={selectedResearchId}
                onSelect={setSelectedResearchId}
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
                selectedId={selectedResearchId}
                onSelect={setSelectedResearchId}
                onCopy={handleCopy}
                getTypeLabel={getTypeLabel}
                getStatusColor={getStatusColor}
                formatTime={formatTime}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface HistoryGroupProps {
  title: string;
  items: ResearchHistoryItem[];
  selectedId: number | null;
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

