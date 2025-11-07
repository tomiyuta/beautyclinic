"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "@atlaskit/button";

const navigationItems = [
  { href: "/", label: "商品管理" },
  { href: "/market-research", label: "市場調査" },
  { href: "/sns-research", label: "SNS調査" },
  { href: "/strategy-analysis", label: "戦略分析" },
  { href: "/strategy-management", label: "戦略管理" },
  { href: "/content", label: "コンテンツ生成" },
  { href: "/workflow", label: "ワークフロー管理" },
  { href: "/api-key", label: "APIキー設定" },
  { href: "/prompt", label: "プロンプト管理" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav style={{ 
      borderBottom: "1px solid #DFE1E6", 
      background: "#FFFFFF", 
      padding: "16px",
      marginBottom: "0"
    }}>
      <div style={{ 
        maxWidth: "1400px", 
        margin: "0 auto", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <h1 style={{ 
          fontSize: "18px", 
          fontWeight: 600, 
          color: "#172B4D",
          margin: 0
        }}>
          美容クリニックAI協調プラットフォーム
        </h1>
        <div style={{ 
          display: "flex", 
          gap: "8px",
          flexWrap: "wrap"
        }}>
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                <Button
                  appearance={isActive ? "primary" : "subtle"}
                  isSelected={isActive}
                >
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

