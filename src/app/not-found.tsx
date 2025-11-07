"use client";

import Link from "next/link";
import Button from "@atlaskit/button";

export default function NotFound() {
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      minHeight: "100vh",
      padding: "24px",
      background: "#F4F5F7"
    }}>
      <div style={{
        maxWidth: "600px",
        padding: "32px",
        background: "#FFFFFF",
        borderRadius: "8px",
        border: "1px solid #DFE1E6",
        textAlign: "center"
      }}>
        <h2 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px", color: "#172B4D" }}>
          404 - ページが見つかりません
        </h2>
        <p style={{ fontSize: "14px", color: "#6B778C", marginBottom: "24px" }}>
          お探しのページは存在しないか、移動された可能性があります。
        </p>
        <Link href="/" style={{ textDecoration: "none" }}>
          <Button appearance="primary">
            ホームに戻る
          </Button>
        </Link>
      </div>
    </div>
  );
}

