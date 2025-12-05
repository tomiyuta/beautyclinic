"use client";

import { motion } from "framer-motion";
import Button from "@atlaskit/button";
import Badge from "@atlaskit/badge";
import type { StrategySummary } from "./history/useResearchHistory";

interface HistoryCardProps {
  type: "market" | "sns" | "strategy";
  platform?: string;
  query: string;
  summary: string;
  timestamp: Date;
  status: "success" | "error";
  aiAgent?: string;
  strategySummary?: StrategySummary;
  onRerun: () => void;
  onViewDetail: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function HistoryCard({
  type,
  platform,
  query,
  summary,
  timestamp,
  status,
  aiAgent,
  strategySummary,
  onRerun,
  onViewDetail,
  isFavorite = false,
  onToggleFavorite,
}: HistoryCardProps) {
  const statusColor = status === "success" ? "#36B37E" : "#DE350B";
  const statusLabel = status === "success" ? "成功" : "エラー";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: "0 8px 16px rgba(0,0,0,0.1)" }}
      transition={{ duration: 0.2 }}
      style={{
        padding: "20px",
        borderRadius: "12px",
        border: `1px solid ${statusColor}40`,
        borderLeft: `4px solid ${statusColor}`,
        background: "#FFFFFF",
        cursor: "pointer",
        position: "relative",
      }}
      onClick={onViewDetail}
    >
      {/* ヘッダー */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Badge appearance={status === "success" ? "added" : "removed"}>
            {statusLabel}
          </Badge>
          {platform && (
            <Badge appearance="default">{platform.toUpperCase()}</Badge>
          )}
          {aiAgent && <Badge appearance="primary">{aiAgent}</Badge>}
        </div>
        {onToggleFavorite && (
          <Button
            appearance="subtle"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            style={{ padding: "4px", minWidth: "auto" }}
          >
            {isFavorite ? "⭐" : "☆"}
          </Button>
        )}
      </div>

      {/* クエリ */}
      <div
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "#172B4D",
          marginBottom: "8px",
          lineHeight: 1.4,
        }}
      >
        {query}
      </div>

      {/* サマリー */}
      <div
        style={{
          fontSize: "13px",
          color: "#6B778C",
          marginBottom: "12px",
          lineHeight: 1.5,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {summary}
      </div>

      {/* フッター */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "12px",
          borderTop: "1px solid #EBECF0",
        }}
      >
        <div style={{ fontSize: "12px", color: "#6B778C" }}>
          {timestamp.toLocaleString("ja-JP")}
        </div>
        <Button
          appearance="default"
          onClick={(e) => {
            e.stopPropagation();
            onRerun();
          }}
          style={{ fontSize: "12px", padding: "4px 12px" }}
        >
          🔄 再調査
        </Button>
      </div>
    </motion.div>
  );
}

