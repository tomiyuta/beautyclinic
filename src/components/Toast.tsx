"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Banner from "@atlaskit/banner";
import type { Toast, ToastType } from "@/hooks/useToast";

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div
      style={{
        position: "fixed",
        top: "80px",
        right: "16px",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        maxWidth: "400px",
        pointerEvents: "none",
      }}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={onRemove}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const appearanceMap: Record<ToastType, "announcement" | "error" | "warning"> = {
    success: "announcement",
    error: "error",
    info: "announcement",
    warning: "warning",
  };

  const iconMap: Record<ToastType, string> = {
    success: "✅",
    error: "❌",
    info: "ℹ️",
    warning: "⚠️",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.9 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ 
        width: "100%",
        pointerEvents: "auto",
        cursor: "pointer",
      }}
      onClick={() => onRemove(toast.id)}
      whileHover={{ scale: 1.02 }}
    >
      <Banner appearance={appearanceMap[toast.type]}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>{iconMap[toast.type]}</span>
          <span>{toast.message}</span>
        </div>
      </Banner>
    </motion.div>
  );
}

