"use client";

import { motion } from "framer-motion";
import Button from "@atlaskit/button";

interface HistoryTriggerProps {
  onClick: () => void;
}

/**
 * 履歴ドロワーを開くためのトリガーボタン
 * 画面右端にすりガラス調の丸いボタンとして表示
 */
export function HistoryTrigger({ onClick }: HistoryTriggerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: "fixed",
        right: "16px",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 900,
      }}
    >
      <Button
        appearance="subtle"
        onClick={onClick}
        title="調査履歴を表示"
        style={{
          padding: 0,
          borderRadius: "999px",
          background: "rgba(255, 255, 255, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.6)",
          boxShadow:
            "0 10px 30px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(148, 163, 184, 0.4)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "48px",
          height: "48px",
          cursor: "pointer",
        }}
      >
        <motion.span
          aria-hidden="true"
          whileHover={{ rotate: 10, scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          style={{ fontSize: "22px" }}
        >
          🕒
        </motion.span>
      </Button>
    </motion.div>
  );
}

export default HistoryTrigger;





