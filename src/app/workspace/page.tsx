"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { UnifiedWorkspaceLayout } from "@/components/layouts/UnifiedWorkspaceLayout";
import { useUnifiedWorkspaceStore, type ActiveTab } from "@/stores/unified-workspace-store";

export default function WorkspacePage() {
  const searchParams = useSearchParams();
  const { setActiveTab, setSelectedResearchId } = useUnifiedWorkspaceStore();

  useEffect(() => {
    // URLパラメータからタブとIDを取得
    const tab = searchParams.get("tab");
    const id = searchParams.get("id");

    if (tab && ["MARKET", "SNS", "STRATEGY"].includes(tab.toUpperCase())) {
      setActiveTab(tab.toUpperCase() as ActiveTab);
    }

    if (id) {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        setSelectedResearchId(numId);
      }
    }
  }, [searchParams, setActiveTab, setSelectedResearchId]);

  return <UnifiedWorkspaceLayout />;
}

