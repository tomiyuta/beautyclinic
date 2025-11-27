"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "@atlaskit/button";
import { motion, AnimatePresence } from "framer-motion";

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
  { href: "/ai-context", label: "Acontextダッシュボード", icon: "🧠" },
  { href: "/ai-context/spaces", label: "スペース管理", icon: "📁" },
  { href: "/ai-context/skills", label: "スキル管理", icon: "🎯" },
  { href: "/ai-context/metrics", label: "メトリクス", icon: "📊" },
  { href: "/ai-context/settings", label: "Acontext設定", icon: "⚙️" },
];

export function Navigation() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 768);
      setIsTablet(width <= 1024);
    };
    
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

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
        alignItems: "flex-start",
        gap: "12px"
      }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          width: "100%"
        }}>
          <h1 
            style={{ 
              fontSize: "16px", 
              fontWeight: 600, 
              color: "#172B4D",
              margin: 0,
              whiteSpace: "nowrap"
            }}
          >
            クリマケ(クリニック向けAI統合リサーチ)
          </h1>
          
          {/* モバイルメニューボタン */}
          {isMobile && (
            <Button
              appearance="subtle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? "✕" : "☰"}
            </Button>
          )}
        </div>

        {/* デスクトップナビゲーション */}
        {!isMobile && (
          <div 
            style={{ 
              display: "flex", 
              gap: "6px",
              flexWrap: "wrap",
              justifyContent: "flex-start",
              width: "100%",
              alignItems: "center",
              marginTop: "8px"
            }}
          >
          {navigationItems.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <div
                key={item.href}
                style={{ 
                  flexShrink: 0,
                  display: "inline-block"
                }}
              >
                <Link 
                  href={item.href} 
                  style={{ 
                    textDecoration: "none", 
                    position: "relative", 
                    display: "inline-block"
                  }}
                >
                  <Button
                    appearance={isActive ? "primary" : "subtle"}
                    isSelected={isActive}
                    style={{ 
                      whiteSpace: "nowrap",
                      background: isActive ? "#0052CC" : "#FFFFFF",
                      border: isActive ? "1px solid #0052CC" : "1px solid #DFE1E6",
                      color: isActive ? "#FFFFFF" : "#172B4D",
                      fontWeight: isActive ? 600 : 400,
                      fontSize: "13px",
                      padding: "6px 12px",
                      minHeight: "32px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <span style={{ marginRight: "6px", display: "inline-block" }}>{item.icon}</span>
                    <span style={{ display: "inline-block" }}>{item.label}</span>
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
        )}

        {/* モバイルメニュー */}
        {isMobile && (
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  width: "100%",
                  overflow: "hidden"
                }}
              >
              <div style={{ 
                display: "flex", 
                flexDirection: "column",
                gap: "8px",
                paddingTop: "16px"
              }}>
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link 
                      key={item.href} 
                      href={item.href} 
                      style={{ textDecoration: "none" }}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Button
                        appearance={isActive ? "primary" : "subtle"}
                        isSelected={isActive}
                        style={{ 
                          width: "100%", 
                          justifyContent: "flex-start",
                          background: isActive ? undefined : "#FFFFFF",
                          border: isActive ? undefined : "1px solid #DFE1E6",
                          color: isActive ? undefined : "#172B4D",
                          fontWeight: isActive ? 600 : 400,
                          fontSize: "14px",
                          padding: "8px 12px"
                        }}
                      >
                        <span style={{ marginRight: "8px" }}>{item.icon}</span>
                        <span style={{ color: isActive ? undefined : "#172B4D" }}>{item.label}</span>
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </nav>
  );
}

