"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
    title: "メイン",
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

export function Navigation() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 日付フォーマット
  const today = new Date();
  const formattedDate = today.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // パスが一致するかどうか（完全一致または部分一致）
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo Area */}
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <Link href="/" className="flex items-center gap-2 no-underline" onClick={() => setIsMobileMenuOpen(false)}>
          <span className="text-2xl">💎</span>
          <span className="text-lg font-semibold text-teal-600 tracking-tight">クリマケ</span>
        </Link>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navigationCategories.map((category) => (
          <div key={category.title}>
            <div className="px-3 mb-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
              {category.title}
            </div>
            <div className="space-y-1">
              {category.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      active
                        ? "bg-teal-50 text-teal-700 border-l-4 border-teal-600"
                        : "text-slate-600 hover:bg-gray-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / User Profile (Mock) */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-medium text-xs">
            管理者
          </div>
          <div className="text-xs">
            <div className="font-medium text-slate-700">管理者</div>
            <div className="text-slate-500">admin@clinic.com</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">💎</span>
            <span className="font-semibold text-teal-600">クリマケ</span>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-600 hover:bg-gray-100 rounded-lg"
          >
            {isMobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      )}

      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {isMobile && isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar (Desktop: Fixed, Mobile: Drawer) */}
      <motion.nav
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white shadow-xl lg:shadow-none lg:border-r lg:relative transform transition-transform duration-300 ease-in-out ${isMobile
          ? isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full"
          : "translate-x-0"
          }`}
      >
        <SidebarContent />
      </motion.nav>

      {/* Date Header (Desktop only - sits above content in layout) */}
      <div className="hidden lg:flex fixed top-0 right-0 p-6 z-10 pointer-events-none">
        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm font-normal text-slate-500">
          {formattedDate}
        </div>
      </div>
    </>
  );
}
