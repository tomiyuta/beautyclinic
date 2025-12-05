"use client";

import Link from "next/link";
import { motion } from "framer-motion";

// クイックアクションカードのデータ
const quickActions = [
  {
    href: "/market-research",
    icon: "📊",
    title: "市場調査",
    description: "トレンドと競合を分析",
  },
  {
    href: "/sns-research",
    icon: "📱",
    title: "SNS調査",
    description: "ソーシャルトレンド把握",
  },
  {
    href: "/content",
    icon: "✨",
    title: "コンテンツ生成",
    description: "AIによる素材作成",
  },
  {
    href: "/strategy-analysis",
    icon: "🎯",
    title: "戦略分析",
    description: "データに基づく意思決定",
  },
];

// 機能カテゴリのデータ
const featureCategories = [
  {
    title: "リサーチ & 分析",
    items: [
      { href: "/market-research", icon: "📊", label: "市場調査" },
      { href: "/sns-research", icon: "📱", label: "SNS調査" },
      { href: "/strategy-analysis", icon: "🎯", label: "戦略分析" },
    ],
  },
  {
    title: "戦略 & 実行",
    items: [
      { href: "/content", icon: "✨", label: "コンテンツ生成" },
      { href: "/workflow", icon: "🔄", label: "ワークフロー管理" },
    ],
  },
  {
    title: "資産管理",
    items: [
      { href: "/products", icon: "📦", label: "商品管理" },
      { href: "/prompt", icon: "💬", label: "プロンプト管理" },
    ],
  },
  {
    title: "AIコンテキスト",
    items: [
      { href: "/ai-context", icon: "🧠", label: "ダッシュボード" },
      { href: "/ai-context/spaces", icon: "📁", label: "スペース管理" },
      { href: "/ai-context/skills", icon: "🎯", label: "スキル管理" },
      { href: "/ai-context/metrics", icon: "📊", label: "メトリクス" },
    ],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 text-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-8 lg:py-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-12"
        >
        {/* Welcome Section (Ultra-Minimalist) */}
        <motion.div variants={itemVariants} className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
            ダッシュボード
          </h1>
        </motion.div>

        {/* Quick Actions Grid */}
        <motion.section variants={itemVariants}>
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            クイックアクション
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action) => (
              <Link href={action.href} key={action.href} className="block group no-underline">
                <div className="h-full bg-white border border-gray-200 rounded-xl p-6 hover:border-teal-300 transition-colors duration-200">
                  <div className="flex flex-col h-full">
                    <div className="mb-4">
                      <span className="text-4xl text-teal-600 block">
                        {action.icon}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-slate-800 mb-1">
                        {action.title}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* All Features Grid */}
        <motion.section variants={itemVariants}>
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            機能一覧
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {featureCategories.map((category) => (
              <div
                key={category.title}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-teal-300 transition-colors duration-200"
              >
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">
                  {category.title}
                </div>
                <div className="space-y-2">
                  {category.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group no-underline"
                    >
                      <span className="text-lg text-slate-600">
                        {item.icon}
                      </span>
                      <span className="text-sm font-medium text-slate-700 group-hover:text-teal-700 transition-colors">
                        {item.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.section>
        </motion.div>
      </div>
    </div>
  );
}
