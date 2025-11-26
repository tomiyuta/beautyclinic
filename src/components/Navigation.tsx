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
        alignItems: "center",
        gap: "16px"
      }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          width: "100%"
        }}>
          <motion.h1 
            style={{ 
              fontSize: "clamp(14px, 2.5vw, 18px)", 
              fontWeight: 600, 
              color: "#172B4D",
              margin: 0,
              textAlign: "center",
              flex: 1
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            クリマケ(クリニック向けAI統合リサーチ)
          </motion.h1>
          
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
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: "center",
              width: "100%"
            }}
          >
          {navigationItems.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link href={item.href} style={{ textDecoration: "none", position: "relative", display: "block" }}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      appearance={isActive ? "primary" : "subtle"}
                      isSelected={isActive}
                    >
                      <span style={{ marginRight: "6px" }}>{item.icon}</span>
                      {!isTablet && <span>{item.label}</span>}
                    </Button>
                  </motion.div>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      style={{
                        height: "3px",
                        background: "#0052CC",
                        borderRadius: "2px 2px 0 0",
                        marginTop: "4px",
                        position: "absolute",
                        left: 0,
                        right: 0,
                      }}
                      initial={false}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                  )}
                </Link>
              </motion.div>
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
                        style={{ width: "100%", justifyContent: "flex-start" }}
                      >
                        <span style={{ marginRight: "8px" }}>{item.icon}</span>
                        {item.label}
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

