import { create } from "zustand";

export type ActiveTab = "MARKET" | "SNS" | "STRATEGY";

interface UnifiedWorkspaceState {
  selectedResearchId: number | null;
  isSidebarOpen: boolean;
  isNewAnalysisModalOpen: boolean;
  activeTab: ActiveTab;
  
  // Actions
  setSelectedResearchId: (id: number | null) => void;
  setIsSidebarOpen: (open: boolean) => void;
  setIsNewAnalysisModalOpen: (open: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export const useUnifiedWorkspaceStore = create<UnifiedWorkspaceState>((set) => ({
  selectedResearchId: null,
  isSidebarOpen: true,
  isNewAnalysisModalOpen: false,
  activeTab: "MARKET",
  
  setSelectedResearchId: (id) => set({ selectedResearchId: id }),
  setIsSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setIsNewAnalysisModalOpen: (open) => set({ isNewAnalysisModalOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));

