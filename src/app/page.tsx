"use client";

import Link from "next/link";
import { motion } from "framer-motion";

// クイックアクションカードのデータ
const quickActions = [
  {
    href: "/market-research",
    icon: "📊",
    title: "市場調査を開始",
    description: "競合分析やトレンド調査を実行",
    color: "#0065FF",
    bgGradient: "linear-gradient(135deg, #0065FF 0%, #0052CC 100%)",
  },
  {
    href: "/sns-research",
    icon: "📱",
    title: "SNS調査を開始",
    description: "SNSトレンドやインフルエンサー分析",
    color: "#6554C0",
    bgGradient: "linear-gradient(135deg, #6554C0 0%, #5243AA 100%)",
  },
  {
    href: "/content",
    icon: "✨",
    title: "新規コンテンツ作成",
    description: "AIでマーケティング素材を生成",
    color: "#00875A",
    bgGradient: "linear-gradient(135deg, #00875A 0%, #006644 100%)",
  },
  {
    href: "/strategy-analysis",
    icon: "🎯",
    title: "戦略を確認",
    description: "戦略分析・最適化を実行",
    color: "#FF5630",
    bgGradient: "linear-gradient(135deg, #FF5630 0%, #DE350B 100%)",
  },
];

// 機能カテゴリのデータ
const featureCategories = [
  {
    title: "リサーチ & 分析",
    icon: "🔍",
    items: [
      { href: "/market-research", icon: "📊", label: "市場調査" },
      { href: "/sns-research", icon: "📱", label: "SNS調査" },
      { href: "/strategy-analysis", icon: "🎯", label: "戦略分析" },
    ],
  },
  {
    title: "戦略 & 実行",
    icon: "📋",
    items: [
      { href: "/strategy-management", icon: "📋", label: "戦略管理" },
      { href: "/content", icon: "✨", label: "コンテンツ生成" },
      { href: "/workflow", icon: "🔄", label: "ワークフロー管理" },
    ],
  },
  {
    title: "資産管理",
    icon: "📦",
    items: [
      { href: "/products", icon: "📦", label: "商品管理" },
      { href: "/prompt", icon: "💬", label: "プロンプト管理" },
    ],
  },
  {
    title: "AIコンテキスト",
    icon: "🧠",
    items: [
      { href: "/ai-context", icon: "🧠", label: "ダッシュボード" },
      { href: "/ai-context/spaces", icon: "📁", label: "スペース管理" },
      { href: "/ai-context/skills", icon: "🎯", label: "スキル管理" },
      { href: "/ai-context/metrics", icon: "📊", label: "メトリクス" },
    ],
  },
];

// システムステータスカードのデータ
const systemStatusItems = [
  {
    icon: "🔑",
    title: "APIキー設定",
    href: "/api-key",
    description: "外部API連携の設定を確認",
  },
  {
    icon: "⚙️",
    title: "AIコンテキスト設定",
    href: "/ai-context/settings",
    description: "AI動作設定をカスタマイズ",
  },
];

// アニメーション設定
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const,
    },
  },
};

const cardHoverVariants = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: { duration: 0.2, ease: "easeOut" as const }
  },
};

export default function Dashboard() {
  // 現在の日付を取得
  const today = new Date();
  const formattedDate = today.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  // 時間帯による挨拶
  const hour = today.getHours();
  const greeting = hour < 12 ? "おはようございます" : hour < 18 ? "こんにちは" : "お疲れ様です";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FAFBFC 0%, #F4F5F7 100%)",
        padding: "0",
      }}
    >
      {/* ヒーローセクション */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          background: "linear-gradient(135deg, #0052CC 0%, #0065FF 50%, #2684FF 100%)",
          padding: "48px 24px",
          marginBottom: "32px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 背景装飾 */}
        <div
          style={{
            position: "absolute",
            top: "-50%",
            right: "-10%",
            width: "500px",
            height: "500px",
            background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-30%",
            left: "-5%",
            width: "300px",
            height: "300px",
            background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
        
        <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: "14px",
              marginBottom: "8px",
              fontWeight: 500,
            }}
          >
            {formattedDate}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{
              color: "#FFFFFF",
              fontSize: "clamp(24px, 4vw, 32px)",
              fontWeight: 700,
              marginBottom: "8px",
              lineHeight: 1.3,
            }}
          >
            {greeting}！
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: "16px",
              maxWidth: "600px",
            }}
          >
            クリマケで美容クリニックのマーケティング戦略を加速しましょう
          </motion.p>
        </div>
      </motion.div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px 48px" }}>
        {/* クイックアクションセクション */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ marginBottom: "48px" }}
        >
          <motion.h2
            variants={itemVariants}
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#172B4D",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>⚡</span> クイックアクション
          </motion.h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "16px",
            }}
          >
            {quickActions.map((action) => (
              <motion.div key={action.href} variants={itemVariants}>
                <Link href={action.href} style={{ textDecoration: "none" }}>
                  <motion.div
                    variants={cardHoverVariants}
                    initial="rest"
                    whileHover="hover"
                    style={{
                      background: action.bgGradient,
                      borderRadius: "12px",
                      padding: "24px",
                      color: "#FFFFFF",
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <span style={{ fontSize: "32px", marginBottom: "12px" }}>
                      {action.icon}
                    </span>
                    <h3
                      style={{
                        fontSize: "16px",
                        fontWeight: 600,
                        marginBottom: "6px",
                      }}
                    >
                      {action.title}
                    </h3>
                    <p
                      style={{
                        fontSize: "13px",
                        opacity: 0.9,
                        lineHeight: 1.5,
                      }}
                    >
                      {action.description}
                    </p>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* 機能カテゴリセクション */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ marginBottom: "48px" }}
        >
          <motion.h2
            variants={itemVariants}
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#172B4D",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>📂</span> すべての機能
          </motion.h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {featureCategories.map((category) => (
              <motion.div
                key={category.title}
                variants={itemVariants}
                style={{
                  background: "#FFFFFF",
                  borderRadius: "12px",
                  padding: "24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  border: "1px solid #EBECF0",
                }}
              >
                <h3
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#172B4D",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    paddingBottom: "12px",
                    borderBottom: "1px solid #EBECF0",
                  }}
                >
                  <span>{category.icon}</span>
                  {category.title}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {category.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{ textDecoration: "none" }}
                    >
                      <motion.div
                        whileHover={{ 
                          backgroundColor: "#F4F5F7",
                          x: 4,
                        }}
                        transition={{ duration: 0.15 }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          color: "#172B4D",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ fontSize: "18px" }}>{item.icon}</span>
                        <span style={{ fontSize: "14px", fontWeight: 500 }}>
                          {item.label}
                        </span>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* システムステータスセクション */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h2
            variants={itemVariants}
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#172B4D",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>⚙️</span> システム設定
          </motion.h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {systemStatusItems.map((item) => (
              <motion.div key={item.href} variants={itemVariants}>
                <Link href={item.href} style={{ textDecoration: "none" }}>
                  <motion.div
                    whileHover={{ 
                      borderColor: "#0052CC",
                      boxShadow: "0 4px 12px rgba(0,82,204,0.15)",
                    }}
                    transition={{ duration: 0.2 }}
                    style={{
                      background: "#FFFFFF",
                      borderRadius: "12px",
                      padding: "20px",
                      border: "1px solid #EBECF0",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "10px",
                        background: "#F4F5F7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "24px",
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "#172B4D",
                          marginBottom: "4px",
                        }}
                      >
                        {item.title}
                      </h3>
                      <p
                        style={{
                          fontSize: "13px",
                          color: "#6B778C",
                          lineHeight: 1.4,
                        }}
                      >
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>
    </main>
  );
}
