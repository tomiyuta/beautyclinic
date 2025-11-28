"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "@atlaskit/button";
import { motion, AnimatePresence } from "framer-motion";

// カテゴリ化されたナビゲーション構造
interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavCategory {
  title: string;
  items: NavItem[];
}

const navigationCategories: NavCategory[] = [
  {
    title: "ホーム",
    items: [
      { href: "/", label: "ダッシュボード", icon: "🏠" },
    ],
  },
  {
    title: "リサーチ & 分析",
    items: [
  { href: "/market-research", label: "市場調査", icon: "📊" },
  { href: "/sns-research", label: "SNS調査", icon: "📱" },
  { href: "/strategy-analysis", label: "戦略分析", icon: "🎯" },
    ],
  },
  {
    title: "戦略 & 実行",
    items: [
  { href: "/strategy-management", label: "戦略管理", icon: "📋" },
  { href: "/content", label: "コンテンツ生成", icon: "✨" },
  { href: "/workflow", label: "ワークフロー管理", icon: "🔄" },
    ],
  },
  {
    title: "資産管理",
    items: [
      { href: "/products", label: "商品管理", icon: "📦" },
  { href: "/prompt", label: "プロンプト管理", icon: "💬" },
    ],
  },
  {
    title: "AIコンテキスト",
    items: [
      { href: "/ai-context", label: "ダッシュボード", icon: "🧠" },
  { href: "/ai-context/spaces", label: "スペース管理", icon: "📁" },
  { href: "/ai-context/skills", label: "スキル管理", icon: "🎯" },
  { href: "/ai-context/metrics", label: "メトリクス", icon: "📊" },
      { href: "/ai-context/settings", label: "設定", icon: "⚙️" },
    ],
  },
  {
    title: "システム設定",
    items: [
      { href: "/api-key", label: "APIキー設定", icon: "🔑" },
    ],
  },
];

// フラットなナビゲーション配列（検索用）
const flatNavigationItems = navigationCategories.flatMap(cat => cat.items);

export function Navigation() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 1024);
    };
    
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // アクティブなカテゴリを自動展開
  useEffect(() => {
    if (isMobile) {
      const activeCategory = navigationCategories.find(cat => 
        cat.items.some(item => {
          if (item.href === "/") return pathname === "/";
          return pathname.startsWith(item.href);
        })
      );
      if (activeCategory) {
        setExpandedCategory(activeCategory.title);
      }
    }
  }, [pathname, isMobile]);

  // アイテムがアクティブかどうかを判定
  const isItemActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  // デスクトップ用のナビゲーションボタン（Magic Line対応）
  const NavButton = ({ item }: { item: NavItem }) => {
    const isActive = isItemActive(item.href);
    const isHovered = hoveredItem === item.href;
    
    return (
      <Link href={item.href} style={{ textDecoration: "none", position: "relative" }}>
        <motion.div
          onHoverStart={() => setHoveredItem(item.href)}
          onHoverEnd={() => setHoveredItem(null)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2 }}
          style={{ position: "relative" }}
        >
          <Button
            appearance={isActive ? "primary" : "subtle"}
            isSelected={isActive}
            style={{ 
              whiteSpace: "nowrap",
              background: isActive ? "#0052CC" : isHovered ? "#F4F5F7" : "#FFFFFF",
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
              justifyContent: "center",
              transition: "background 0.2s ease, box-shadow 0.2s ease",
              boxShadow: isHovered ? "0 2px 4px rgba(0,0,0,0.1)" : "none"
            }}
          >
            <span style={{ marginRight: "6px", display: "inline-block" }}>{item.icon}</span>
            <span style={{ display: "inline-block" }}>{item.label}</span>
          </Button>
          
          {/* Magic Line - アクティブ時のアンダーライン */}
          {isActive && (
            <motion.div
              layoutId="activeNavIndicator"
              style={{
                position: "absolute",
                bottom: "-2px",
                left: "0",
                right: "0",
                height: "3px",
                background: "#0052CC",
                borderRadius: "3px 3px 0 0",
              }}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 30,
              }}
            />
          )}
        </motion.div>
      </Link>
    );
  };

  return (
    <nav style={{ 
      borderBottom: "1px solid #DFE1E6", 
      background: "#FFFFFF", 
      padding: "12px 16px",
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
        gap: "10px"
      }}>
        {/* ヘッダー行 */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          width: "100%"
        }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <h1 style={{ 
              fontSize: "16px", 
              fontWeight: 700, 
              color: "#0052CC",
              margin: 0,
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer"
            }}>
              <span style={{ fontSize: "20px" }}>💎</span>
              クリマケ
          </h1>
          </Link>
          
          {/* モバイルメニューボタン */}
          {isMobile && (
            <Button
              appearance="subtle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{
                fontSize: "20px",
                padding: "8px 12px",
              }}
            >
              {isMobileMenuOpen ? "✕" : "☰"}
            </Button>
          )}
        </div>

        {/* デスクトップナビゲーション */}
        {!isMobile && (
          <div style={{ 
              display: "flex", 
            flexDirection: "column",
            gap: "8px",
            marginTop: "4px"
          }}>
            {navigationCategories.map((category, categoryIndex) => (
              <div
                key={category.title}
                style={{ 
                  display: "flex", 
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap"
                  }}
                >
                {/* カテゴリラベル */}
                <span style={{ 
                  fontSize: "11px", 
                  fontWeight: 600, 
                  color: "#6B778C",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  minWidth: "100px",
                  paddingRight: "8px",
                  borderRight: "2px solid #EBECF0",
                  marginRight: "4px"
                }}>
                  {category.title}
                </span>
                
                {/* ナビゲーションアイテム */}
                <div style={{ 
                  display: "flex", 
                  gap: "6px",
                  flexWrap: "wrap"
                }}>
                  {category.items.map((item) => (
                    <NavButton key={item.href} item={item} />
                  ))}
                </div>
              </div>
            ))}
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
                  overflow: "hidden",
                  background: "#FAFBFC",
                  borderRadius: "8px",
                  marginTop: "8px"
                }}
              >
              <div style={{ 
                display: "flex", 
                flexDirection: "column",
                  padding: "8px"
                }}>
                  {navigationCategories.map((category) => {
                    const isExpanded = expandedCategory === category.title;
                    const hasActiveItem = category.items.some(item => isItemActive(item.href));
                    
                    return (
                      <div key={category.title} style={{ marginBottom: "4px" }}>
                        {/* カテゴリヘッダー */}
                        <button
                          onClick={() => setExpandedCategory(isExpanded ? null : category.title)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px",
                            background: hasActiveItem ? "#E3F2FD" : "transparent",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: hasActiveItem ? "#0052CC" : "#172B4D",
                          }}
                        >
                          <span>{category.title}</span>
                          <motion.span
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ fontSize: "12px" }}
                          >
                            ▼
                          </motion.span>
                        </button>
                        
                        {/* カテゴリアイテム */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              style={{ overflow: "hidden", paddingLeft: "12px" }}
                            >
                              {category.items.map((item) => {
                                const isActive = isItemActive(item.href);
                  return (
                    <Link 
                      key={item.href} 
                      href={item.href} 
                      style={{ textDecoration: "none" }}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                                    <div
                        style={{ 
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        padding: "10px 12px",
                                        background: isActive ? "#0052CC" : "transparent",
                                        color: isActive ? "#FFFFFF" : "#172B4D",
                                        borderRadius: "6px",
                                        marginTop: "4px",
                          fontWeight: isActive ? 600 : 400,
                          fontSize: "14px",
                        }}
                      >
                                      <span style={{ fontSize: "16px" }}>{item.icon}</span>
                                      <span>{item.label}</span>
                                    </div>
                    </Link>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
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
