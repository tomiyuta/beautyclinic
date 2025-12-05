"use client";

import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Button from "@atlaskit/button";
import TextField from "@atlaskit/textfield";
import Spinner from "@atlaskit/spinner";

import { HistoryCard } from "@/components/research/HistoryCard";
import {
  useResearchHistory,
  type ResearchHistoryType,
  type ResearchHistoryItem,
} from "./useResearchHistory";

interface ResearchHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  type: ResearchHistoryType;
  onSelectItem?: (item: ResearchHistoryItem) => void;
  onRerunItem?: (item: ResearchHistoryItem) => void;
}

export function ResearchHistoryDrawer({
  isOpen,
  onClose,
  type,
  onSelectItem,
  onRerunItem,
}: ResearchHistoryDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">(
    "all",
  );
  const [visibleCount, setVisibleCount] = useState(20);

  const { items, isLoading, error, refetch } = useResearchHistory(type);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setStatusFilter("all");
      setVisibleCount(20);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filteredItems = useMemo(() => {
    let result: ResearchHistoryItem[] = items;

    if (statusFilter !== "all") {
      result = result.filter((item) => item.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.query.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q),
      );
    }

    return result.slice(0, visibleCount);
  }, [items, statusFilter, searchQuery, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 20);
  };

  const title =
    type === "market"
      ? "市場調査履歴"
      : type === "sns"
      ? "SNS調査履歴"
      : "戦略分析履歴";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* オーバーレイ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.6)",
              zIndex: 1000,
            }}
          />

          {/* ドロワー本体 */}
          <motion.aside
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              height: "100vh",
              width: "100%",
              maxWidth: "400px",
              zIndex: 1100,
              display: "flex",
              flexDirection: "column",
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderLeft: "1px solid rgba(255, 255, 255, 0.3)",
              boxShadow: "-10px 0 30px rgba(15, 23, 42, 0.25)",
            }}
          >
            {/* ヘッダー */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid rgba(226, 232, 240, 0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#0F172A",
                    marginBottom: "4px",
                  }}
                >
                  {title}
                </div>
                <div
                  style={{ fontSize: "12px", color: "#64748B", lineHeight: 1.4 }}
                >
                  過去の調査結果からインサイトを素早く振り返れます。
                </div>
              </div>
              <Button
                appearance="subtle"
                onClick={onClose}
                style={{
                  borderRadius: "999px",
                  padding: "4px 10px",
                  minWidth: "auto",
                }}
              >
                ✕
              </Button>
            </div>

            {/* フィルター */}
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid rgba(226, 232, 240, 0.7)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <TextField
                value={searchQuery}
                onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                placeholder="キーワードで履歴を検索"
                elemBeforeInput={<span style={{ marginRight: 4 }}>🔍</span>}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <label
                  style={{
                    fontSize: "11px",
                    color: "#64748B",
                    whiteSpace: "nowrap",
                  }}
                >
                  ステータス:
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as "all" | "success" | "error")
                  }
                  style={{
                    flex: 1,
                    fontSize: "12px",
                    padding: "6px 8px",
                    borderRadius: "999px",
                    border: "1px solid rgba(148, 163, 184, 0.6)",
                    background: "rgba(255, 255, 255, 0.9)",
                    color: "#0F172A",
                  }}
                >
                  <option value="all">すべて</option>
                  <option value="success">成功</option>
                  <option value="error">エラー</option>
                </select>
                <Button
                  appearance="subtle"
                  onClick={refetch}
                  style={{
                    padding: "4px 8px",
                    minWidth: "auto",
                    fontSize: "11px",
                  }}
                >
                  再読み込み
                </Button>
              </div>
            </div>

            {/* コンテンツ */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {isLoading && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    gap: "8px",
                    color: "#64748B",
                  }}
                >
                  <Spinner size="large" />
                  <span style={{ fontSize: "13px" }}>履歴を読み込み中です...</span>
                </div>
              )}

              {!isLoading && error && (
                <div
                  style={{
                    fontSize: "13px",
                    color: "#B91C1C",
                    background: "rgba(248, 113, 113, 0.12)",
                    borderRadius: "8px",
                    padding: "12px",
                  }}
                >
                  履歴の取得中にエラーが発生しました。
                </div>
              )}

              {!isLoading && !error && filteredItems.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px 8px",
                    color: "#64748B",
                    fontSize: "13px",
                  }}
                >
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>📭</div>
                  <div style={{ fontWeight: 500, marginBottom: "4px" }}>
                    {searchQuery
                      ? "検索条件に一致する履歴がありません"
                      : "まだ履歴がありません"}
                  </div>
                  <div>
                    {searchQuery
                      ? "キーワードや条件を変えて再度お試しください。"
                      : "調査実行後、ここに履歴が表示されます。"}
                  </div>
                </div>
              )}

              {!isLoading &&
                !error &&
                filteredItems.map((item) => (
                  <HistoryCard
                    key={`${item.type}-${item.id}`}
                    type={item.type === "strategy" ? "strategy" : item.type}
                    platform={item.platform}
                    query={item.query}
                    summary={item.summary}
                    timestamp={item.createdAt}
                    status={item.status}
                    aiAgent={item.aiAgent}
                    strategySummary={item.strategySummary}
                    onRerun={() => {
                      if (onRerunItem) {
                        onRerunItem(item);
                      }
                    }}
                    onViewDetail={() => {
                      if (onSelectItem) {
                        onSelectItem(item);
                      }
                    }}
                  />
                ))}
            </div>

            {/* フッター: もっと見る */}
            {!isLoading && !error && items.length > filteredItems.length && (
              <div
                style={{
                  padding: "8px 16px 16px",
                  borderTop: "1px solid rgba(226, 232, 240, 0.7)",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Button
                  appearance="subtle"
                  onClick={handleLoadMore}
                  shouldFitContainer
                >
                  もっと見る
                </Button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default ResearchHistoryDrawer;


