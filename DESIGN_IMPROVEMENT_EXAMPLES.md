# デザイン改善の実装例

このドキュメントでは、改善提案書で挙げた項目の具体的な実装例を示します。

---

## 1. ナビゲーションの改善

### 1.1 アニメーション付きナビゲーション

```tsx
// src/components/Navigation.tsx の改善例

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "@atlaskit/button";
import { motion } from "framer-motion";

const navigationItems = [
  { href: "/", label: "商品管理", icon: "📦" },
  { href: "/market-research", label: "市場調査", icon: "📊" },
  { href: "/sns-research", label: "SNS調査", icon: "📱" },
  { href: "/strategy-analysis", label: "戦略分析", icon: "🎯" },
  { href: "/strategy-management", label: "戦略管理", icon: "📋" },
  { href: "/content", label: "コンテンツ生成", icon: "✨" },
  { href: "/workflow", label: "ワークフロー管理", icon: "🔄" },
  { href: "/api-key", label: "APIキー設定", icon: "🔑" },
  { href: "/prompt", label: "プロンプト管理", icon: "💬" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav style={{ 
      borderBottom: "1px solid #DFE1E6", 
      background: "#FFFFFF", 
      padding: "16px",
      marginBottom: "0",
      position: "sticky",
      top: 0,
      zIndex: 100,
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
    }}>
      <div style={{ 
        maxWidth: "1400px", 
        margin: "0 auto", 
        display: "flex", 
        flexDirection: "column",
        alignItems: "center",
        gap: "16px"
      }}>
        <motion.h1 
          style={{ 
            fontSize: "18px", 
            fontWeight: 600, 
            color: "#172B4D",
            margin: 0,
            textAlign: "center"
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          クリマケ(クリニック向けAI統合リサーチ)
        </motion.h1>
        <div style={{ 
          display: "flex", 
          gap: "8px",
          flexWrap: "wrap",
          justifyContent: "center"
        }}>
          {navigationItems.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link href={item.href} style={{ textDecoration: "none" }}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      appearance={isActive ? "primary" : "subtle"}
                      isSelected={isActive}
                      iconBefore={item.icon}
                    >
                      {item.label}
                    </Button>
                  </motion.div>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      style={{
                        height: "3px",
                        background: "#0052CC",
                        borderRadius: "2px",
                        marginTop: "4px"
                      }}
                      initial={false}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
```

---

## 2. トースト通知システム

### 2.1 トーストコンポーネントの実装

```tsx
// src/components/Toast.tsx

"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Banner from "@atlaskit/banner";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

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

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ duration: 0.3 }}
      style={{ width: "100%" }}
    >
      <Banner appearance={appearanceMap[toast.type]}>
        {toast.message}
      </Banner>
    </motion.div>
  );
}
```

### 2.2 トーストフックの実装

```tsx
// src/hooks/useToast.ts

import { useState, useCallback } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
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
    showSuccess: (message: string) => showToast("success", message),
    showError: (message: string) => showToast("error", message),
    showInfo: (message: string) => showToast("info", message),
    showWarning: (message: string) => showToast("warning", message),
  };
}
```

### 2.3 使用例（商品管理ページ）

```tsx
// src/features/products/product-management.tsx の改善例

import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/Toast";

export function ProductManagement() {
  const toast = useToast();
  // ... 既存のコード ...

  const createMutation = api.product.create.useMutation({
    onSuccess: async () => {
      toast.showSuccess("商品を保存しました");
      setForm(defaultFormState);
      await utils.product.list.invalidate({ userId: USER_ID_PLACEHOLDER });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      toast.showError(message);
    },
  });

  return (
    <>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      {/* 既存のコンテンツ */}
    </>
  );
}
```

---

## 3. フォーム入力のアニメーション

### 3.1 アニメーション付きテキストフィールド

```tsx
// src/components/AnimatedTextField.tsx

"use client";

import { useState, useRef } from "react";
import TextField from "@atlaskit/textfield";
import { motion } from "framer-motion";

interface AnimatedTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  type?: string;
}

export function AnimatedTextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  type = "text",
}: AnimatedTextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isActive = isFocused || value.length > 0;

  return (
    <div style={{ position: "relative", marginBottom: "24px" }}>
      <motion.label
        initial={false}
        animate={{
          y: isActive ? -28 : 0,
          fontSize: isActive ? 12 : 14,
          color: error ? "#DE350B" : isActive ? "#0052CC" : "#42526E",
        }}
        transition={{ duration: 0.2 }}
        style={{
          position: "absolute",
          left: "12px",
          top: "12px",
          pointerEvents: "none",
          fontWeight: isActive ? 500 : 400,
          zIndex: 1,
          background: "#FFFFFF",
          padding: "0 4px",
        }}
      >
        {label} {required && <span style={{ color: "#DE350B" }}>*</span>}
      </motion.label>
      
      <TextField
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange((e.target as HTMLInputElement).value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={isActive ? placeholder : ""}
        isInvalid={!!error}
        style={{
          width: "100%",
          paddingTop: isActive ? "20px" : "12px",
        }}
      />
      
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontSize: "12px",
            color: "#DE350B",
            marginTop: "4px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>⚠️</span>
          <span>{error}</span>
        </motion.div>
      )}
    </div>
  );
}
```

---

## 4. カードレイアウトの商品一覧

### 4.1 商品カードコンポーネント

```tsx
// src/components/ProductCard.tsx

"use client";

import { motion } from "framer-motion";
import Button from "@atlaskit/button";
import Badge from "@atlaskit/badge";
import type { ClinicProduct } from "@/generated/prisma/client";

interface ProductCardProps {
  product: ClinicProduct;
  onDelete: (product: ClinicProduct) => void;
  isDeleting?: boolean;
}

export function ProductCard({ product, onDelete, isDeleting }: ProductCardProps) {
  const profit = product.sellingPrice - product.costPrice;
  const profitRate = ((profit / product.costPrice) * 100).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4, boxShadow: "0 8px 16px rgba(0,0,0,0.1)" }}
      transition={{ duration: 0.2 }}
      style={{
        background: "#FFFFFF",
        borderRadius: "8px",
        padding: "20px",
        border: "1px solid #DFE1E6",
        cursor: "pointer",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#172B4D", margin: "0 0 4px 0" }}>
            {product.name}
          </h3>
          {product.category && (
            <p style={{ fontSize: "12px", color: "#6B778C", margin: 0 }}>
              {product.category}
            </p>
          )}
        </div>
        <Badge appearance={product.isActive ? "added" : "removed"}>
          {product.isActive ? "販売中" : "停止中"}
        </Badge>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr", 
        gap: "12px",
        marginBottom: "12px",
        padding: "12px",
        background: "#F4F5F7",
        borderRadius: "6px"
      }}>
        <div>
          <p style={{ fontSize: "11px", color: "#6B778C", margin: "0 0 4px 0" }}>原価</p>
          <p style={{ fontSize: "16px", fontWeight: 600, color: "#42526E", margin: 0 }}>
            {product.costPrice.toLocaleString()}円
          </p>
        </div>
        <div>
          <p style={{ fontSize: "11px", color: "#6B778C", margin: "0 0 4px 0" }}>販売価格</p>
          <p style={{ fontSize: "16px", fontWeight: 600, color: "#172B4D", margin: 0 }}>
            {product.sellingPrice.toLocaleString()}円
          </p>
        </div>
      </div>

      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        paddingTop: "12px",
        borderTop: "1px solid #DFE1E6"
      }}>
        <div>
          <p style={{ fontSize: "11px", color: "#6B778C", margin: "0 0 4px 0" }}>利益率</p>
          <p style={{ 
            fontSize: "18px", 
            fontWeight: 700, 
            color: profit > 0 ? "#36B37E" : "#DE350B",
            margin: 0 
          }}>
            {profitRate}%
          </p>
        </div>
        <Button
          appearance="subtle-link"
          onClick={() => onDelete(product)}
          isDisabled={isDeleting}
        >
          削除
        </Button>
      </div>
    </motion.div>
  );
}
```

### 4.2 グリッドレイアウトでの使用

```tsx
// 商品管理ページでの使用例

{productsQuery.data && productsQuery.data.length > 0 ? (
  <div style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "16px",
  }}>
    {productsQuery.data.map((product: ClinicProduct) => (
      <ProductCard
        key={product.id}
        product={product}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    ))}
  </div>
) : null}
```

---

## 5. スケルトンローディング

### 5.1 スケルトンコンポーネント

```tsx
// src/components/Skeleton.tsx

"use client";

import { motion } from "framer-motion";

export function SkeletonCard() {
  return (
    <div style={{
      background: "#FFFFFF",
      borderRadius: "8px",
      padding: "20px",
      border: "1px solid #DFE1E6",
    }}>
      <motion.div
        animate={{
          background: [
            "linear-gradient(90deg, #F4F5F7 0%, #EBECF0 50%, #F4F5F7 100%)",
            "linear-gradient(90deg, #EBECF0 0%, #F4F5F7 50%, #EBECF0 100%)",
          ],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          height: "20px",
          borderRadius: "4px",
          marginBottom: "12px",
          width: "60%",
        }}
      />
      <motion.div
        animate={{
          background: [
            "linear-gradient(90deg, #F4F5F7 0%, #EBECF0 50%, #F4F5F7 100%)",
            "linear-gradient(90deg, #EBECF0 0%, #F4F5F7 50%, #EBECF0 100%)",
          ],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
          delay: 0.2,
        }}
        style={{
          height: "16px",
          borderRadius: "4px",
          marginBottom: "12px",
          width: "40%",
        }}
      />
      <motion.div
        animate={{
          background: [
            "linear-gradient(90deg, #F4F5F7 0%, #EBECF0 50%, #F4F5F7 100%)",
            "linear-gradient(90deg, #EBECF0 0%, #F4F5F7 50%, #EBECF0 100%)",
          ],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
          delay: 0.4,
        }}
        style={{
          height: "60px",
          borderRadius: "4px",
        }}
      />
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      gap: "16px",
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
```

---

## 6. 確認モーダルダイアログ

### 6.1 モーダルコンポーネント

```tsx
// src/components/ConfirmModal.tsx

"use client";

import { motion, AnimatePresence } from "framer-motion";
import Button from "@atlaskit/button";
import ModalDialog, { ModalTransition } from "@atlaskit/modal-dialog";

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
          heading={title}
          onClose={onCancel}
          appearance={appearance}
          actions={[
            { text: cancelLabel, onClick: onCancel },
            { text: confirmLabel, onClick: onConfirm, appearance: primaryAppearance },
          ]}
        >
          <p style={{ margin: 0, color: "#42526E" }}>{message}</p>
        </ModalDialog>
      )}
    </ModalTransition>
  );
}
```

---

## 7. 必要なパッケージのインストール

```bash
npm install framer-motion
```

---

## 実装の進め方

1. **Phase 1から開始**: トースト通知システムとナビゲーションの改善から実装
2. **段階的に追加**: 各機能を独立して実装し、テストしながら進める
3. **ユーザーフィードバック**: 実装した機能の効果を確認し、調整する

これらの実装例を参考に、プロジェクトのデザインを段階的に改善していきましょう。

