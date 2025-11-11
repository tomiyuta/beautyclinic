"use client";

import { useEffect } from "react";
import Button from "@atlaskit/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // エラーメッセージを分析して、より分かりやすいメッセージを生成
  const getErrorMessage = () => {
    const errorMessage = error.message || "";
    const lowerMessage = errorMessage.toLowerCase();

    // ネットワークエラー（Error Code: -102など）
    if (
      lowerMessage.includes("network") ||
      lowerMessage.includes("fetch") ||
      lowerMessage.includes("connection") ||
      lowerMessage.includes("failed to fetch") ||
      lowerMessage.includes("-102") ||
      lowerMessage.includes("econnrefused")
    ) {
      return "サーバーに接続できません。開発サーバーが起動しているか確認してください。";
    }

    // 404エラー
    if (lowerMessage.includes("404") || lowerMessage.includes("not found")) {
      return "リソースが見つかりませんでした。";
    }

    // 認証エラー
    if (
      lowerMessage.includes("401") ||
      lowerMessage.includes("unauthorized") ||
      lowerMessage.includes("認証")
    ) {
      return "認証に失敗しました。ログインし直してください。";
    }

    // デフォルトのエラーメッセージ
    return errorMessage || "予期しないエラーが発生しました";
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "24px",
        background: "#F4F5F7",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          padding: "32px",
          background: "#FFFFFF",
          borderRadius: "8px",
          border: "1px solid #DFE1E6",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "20px",
            fontWeight: 600,
            marginBottom: "16px",
            color: "#172B4D",
          }}
        >
          エラーが発生しました
        </h2>
        <p
          style={{
            fontSize: "14px",
            color: "#6B778C",
            marginBottom: "24px",
            whiteSpace: "pre-wrap",
          }}
        >
          {getErrorMessage()}
        </p>
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
          }}
        >
          <Button appearance="primary" onClick={reset}>
            再試行
          </Button>
          <Button
            appearance="default"
            onClick={() => (window.location.href = "/")}
          >
            ホームに戻る
          </Button>
        </div>
      </div>
    </div>
  );
}

