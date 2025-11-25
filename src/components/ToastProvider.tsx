"use client";

import { createContext, useContext, ReactNode } from "react";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "./Toast";

interface ToastContextType {
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const toast = useToast();

  return (
    <ToastContext.Provider
      value={{
        showSuccess: toast.showSuccess,
        showError: toast.showError,
        showInfo: toast.showInfo,
        showWarning: toast.showWarning,
      }}
    >
      {children}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToastContext must be used within a ToastProvider");
  }
  return context;
}

