"use client";

import Badge from "@atlaskit/badge";
import type { DataStatus } from "@/types/strategy";

interface DataStatusPanelProps {
  status: DataStatus | undefined;
  isLoading?: boolean;
}

export default function DataStatusPanel({
  status,
  isLoading = false,
}: DataStatusPanelProps) {
  if (isLoading || !status) {
    return (
      <div style={{ borderRadius: "8px", border: "1px solid #DFE1E6", background: "#F4F5F7", padding: "16px" }}>
        <p style={{ fontSize: "14px", color: "#6B778C" }}>データ状態を確認中...</p>
      </div>
    );
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "未取得";
    return new Date(date).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div style={{ borderRadius: "8px", border: "1px solid #DFE1E6", background: "#F4F5F7", padding: "16px" }}>
      <h4 style={{ marginBottom: "12px", fontSize: "14px", fontWeight: 600, color: "#172B4D" }}>データ状態</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#172B4D" }}>商品データ</span>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {status.products.available ? (
              <>
                <Badge appearance="added">{status.products.count}件</Badge>
                <span style={{ color: "#36B37E" }}>✓</span>
              </>
            ) : (
              <>
                <span style={{ color: "#6B778C" }}>0件</span>
                <span style={{ color: "#DE350B" }}>✗</span>
              </>
            )}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#172B4D" }}>市場調査</span>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {status.marketData.available ? (
              <>
                <span style={{ color: "#172B4D" }}>
                  {formatDate(status.marketData.updatedAt)}
                </span>
                <span style={{ color: "#36B37E" }}>✓</span>
              </>
            ) : (
              <>
                <span style={{ color: "#6B778C" }}>未取得</span>
                <span style={{ color: "#DE350B" }}>✗</span>
              </>
            )}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#172B4D" }}>SNS調査</span>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {status.snsData.available ? (
              <>
                <span style={{ color: "#172B4D" }}>
                  {formatDate(status.snsData.updatedAt)}
                </span>
                <span style={{ color: "#36B37E" }}>✓</span>
              </>
            ) : (
              <>
                <span style={{ color: "#6B778C" }}>未取得</span>
                <span style={{ color: "#DE350B" }}>✗</span>
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

