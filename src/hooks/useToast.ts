import { useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((
    type: ToastType,
    message: string,
    duration?: number
  ) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = { id, type, message, duration };
    
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return {
    toasts,
    showToast,
    removeToast,
    showSuccess: (message: string, duration?: number) => showToast("success", message, duration),
    showError: (message: string, duration?: number) => showToast("error", message, duration),
    showInfo: (message: string, duration?: number) => showToast("info", message, duration),
    showWarning: (message: string, duration?: number) => showToast("warning", message, duration),
  };
}

