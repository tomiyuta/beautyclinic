"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SelectionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function SelectionCard({
  icon,
  title,
  description,
  isSelected,
  onClick,
  disabled = false,
}: SelectionCardProps) {
  return (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={disabled ? undefined : onClick}
      style={{
        padding: "24px",
        borderRadius: "12px",
        border: `2px solid ${isSelected ? "#0052CC" : "#DFE1E6"}`,
        background: isSelected ? "#DEEBFF" : "#FFFFFF",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.2s ease",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
        minHeight: "160px",
        justifyContent: "center",
      }}
    >
      <div style={{ fontSize: "48px", lineHeight: 1 }}>{icon}</div>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: isSelected ? "#0052CC" : "#172B4D",
            marginBottom: "4px",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: "12px", color: "#6B778C" }}>{description}</div>
      </div>
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "#0052CC",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          ✓
        </motion.div>
      )}
    </motion.div>
  );
}

