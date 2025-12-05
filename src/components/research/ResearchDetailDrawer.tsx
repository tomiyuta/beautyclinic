"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";
import Button from "@atlaskit/button";
import CopyIcon from "@atlaskit/icon/glyph/copy";

interface ResearchDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onCopy?: () => void;
  copyText?: string;
}

export function ResearchDetailDrawer({
  isOpen,
  onClose,
  title,
  children,
  onCopy,
  copyText,
}: ResearchDetailDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.5)",
              zIndex: 999,
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(600px, 90vw)",
              background: "#FFFFFF",
              boxShadow: "-4px 0 16px rgba(0, 0, 0, 0.15)",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* ヘッダー */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #EBECF0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "#172B4D",
                }}
              >
                {title}
              </h2>
              <Button appearance="subtle" onClick={onClose}>
                ✕
              </Button>
            </div>

            {/* コンテンツ */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "24px",
                position: "relative",
              }}
            >
              {/* コピーボタン（右上） */}
              {onCopy && (
                <div
                  style={{
                    position: "absolute",
                    top: "0px",
                    right: "0px",
                    zIndex: 1000,
                    backgroundColor: "white",
                    padding: "4px",
                    borderRadius: "0 0 0 8px",
                    boxShadow: "-2px 2px 4px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <button
                    onClick={onCopy}
                    style={{
                      padding: "8px",
                      color: "#475569",
                      backgroundColor: "transparent",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "32px",
                      height: "32px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#0f172a";
                      e.currentTarget.style.backgroundColor = "#f1f5f9";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#475569";
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                    title="クリップボードにコピー"
                    type="button"
                    aria-label="クリップボードにコピー"
                  >
                    <CopyIcon label="コピー" />
                  </button>
                </div>
              )}
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

