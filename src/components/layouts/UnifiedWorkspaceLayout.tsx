"use client";

import { ReactNode } from "react";
import { HistorySidebar } from "./HistorySidebar";
import { ResearchDetailView } from "./ResearchDetailView";
import { NewAnalysisModal } from "./NewAnalysisModal";

interface UnifiedWorkspaceLayoutProps {
  children?: ReactNode;
}

export function UnifiedWorkspaceLayout({ children }: UnifiedWorkspaceLayoutProps) {
  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      {/* 左ペイン: 履歴サイドバー */}
      <HistorySidebar />

      {/* 右ペイン: メインワークスペース */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ResearchDetailView />
        {children}
      </div>

      {/* 新規分析モーダル */}
      <NewAnalysisModal />
    </div>
  );
}

