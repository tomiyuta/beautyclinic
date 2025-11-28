"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

interface PriceSimulationProps {
  costPrice: number;
  sellingPrice: number;
}

export function PriceSimulation({ costPrice, sellingPrice }: PriceSimulationProps) {
  const { profit, profitRate, status } = useMemo(() => {
    if (!costPrice || !sellingPrice) {
      return { profit: 0, profitRate: 0, status: "neutral" as const };
    }

    const calculatedProfit = sellingPrice - costPrice;
    const calculatedProfitRate = sellingPrice > 0 ? (calculatedProfit / sellingPrice) * 100 : 0;

    let calculatedStatus: "loss" | "low" | "good" = "good";
    if (calculatedProfitRate < 0) {
      calculatedStatus = "loss";
    } else if (calculatedProfitRate < 20) {
      calculatedStatus = "low";
    }

    return {
      profit: calculatedProfit,
      profitRate: calculatedProfitRate,
      status: calculatedStatus,
    };
  }, [costPrice, sellingPrice]);

  // ステータスに応じた色とアイコン
  const getStatusConfig = () => {
    switch (status) {
      case "loss":
        return {
          color: "#DE350B",
          bgColor: "#FFEBE6",
          icon: "⚠️",
          label: "赤字",
          message: "販売価格が原価を下回っています",
        };
      case "low":
        return {
          color: "#FF991F",
          bgColor: "#FFF4E5",
          icon: "⚡",
          label: "低利益",
          message: "利益率が20%未満です",
        };
      case "good":
        return {
          color: "#36B37E",
          bgColor: "#E3FCEF",
          icon: "✓",
          label: "適正",
          message: "良好な利益率です",
        };
      default:
        return {
          color: "#6B778C",
          bgColor: "#F4F5F7",
          icon: "ℹ️",
          label: "未入力",
          message: "原価と販売価格を入力してください",
        };
    }
  };

  const config = getStatusConfig();

  // 数値をカンマ区切りでフォーマット
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("ja-JP").format(Math.round(num));
  };

  if (status === "neutral") {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        padding: "16px",
        borderRadius: "8px",
        background: config.bgColor,
        border: `1px solid ${config.color}`,
        marginTop: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <span style={{ fontSize: "20px" }}>{config.icon}</span>
        <span style={{ fontSize: "14px", fontWeight: 600, color: config.color }}>
          {config.label}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "14px", color: "#172B4D" }}>利益額:</span>
          <span style={{ fontSize: "18px", fontWeight: 600, color: config.color }}>
            ¥{formatNumber(profit)}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "14px", color: "#172B4D" }}>利益率:</span>
          <span style={{ fontSize: "18px", fontWeight: 600, color: config.color }}>
            {profitRate.toFixed(1)}%
          </span>
        </div>

        {/* プログレスバー */}
        <div style={{ marginTop: "8px" }}>
          <div
            style={{
              width: "100%",
              height: "8px",
              background: "#DFE1E6",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(Math.max(profitRate, 0), 100)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{
                height: "100%",
                background: config.color,
              }}
            />
          </div>
        </div>

        <p style={{ fontSize: "12px", color: "#6B778C", margin: "8px 0 0 0" }}>
          {config.message}
        </p>
      </div>
    </motion.div>
  );
}

