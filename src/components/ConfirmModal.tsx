"use client";

import { useState } from "react";
import ModalDialog, { ModalTransition } from "@atlaskit/modal-dialog";
import Button from "@atlaskit/button";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  appearance?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "確認",
  cancelLabel = "キャンセル",
  appearance = "info",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const primaryAppearance = appearance === "danger" ? "danger" : "primary";

  return (
    <ModalTransition>
      {isOpen && (
        <ModalDialog
          onClose={onCancel}
        >
          <div>
            <h2 style={{ 
              fontSize: "20px", 
              fontWeight: 600, 
              color: "#172B4D", 
              margin: "0 0 16px 0" 
            }}>
              {title}
            </h2>
            <p style={{ margin: "0 0 24px 0", color: "#42526E", lineHeight: "1.6" }}>{message}</p>
            <div style={{ 
              display: "flex", 
              justifyContent: "flex-end", 
              gap: "8px",
              marginTop: "24px"
            }}>
              <Button
                appearance="subtle"
                onClick={onCancel}
              >
                {cancelLabel}
              </Button>
              <Button
                appearance={primaryAppearance}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}
    </ModalTransition>
  );
}

// 使いやすいフック
export function useConfirmModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    appearance?: "danger" | "warning" | "info";
    onConfirm: () => void;
  } | null>(null);

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      confirmLabel?: string;
      cancelLabel?: string;
      appearance?: "danger" | "warning" | "info";
    }
  ) => {
    setConfig({
      title,
      message,
      onConfirm,
      confirmLabel: options?.confirmLabel,
      cancelLabel: options?.cancelLabel,
      appearance: options?.appearance,
    });
    setIsOpen(true);
  };

  const handleConfirm = () => {
    if (config) {
      config.onConfirm();
      setIsOpen(false);
      setConfig(null);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setConfig(null);
  };

  const Modal = config ? (
    <ConfirmModal
      isOpen={isOpen}
      title={config.title}
      message={config.message}
      confirmLabel={config.confirmLabel}
      cancelLabel={config.cancelLabel}
      appearance={config.appearance}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return {
    showConfirm,
    Modal,
  };
}

