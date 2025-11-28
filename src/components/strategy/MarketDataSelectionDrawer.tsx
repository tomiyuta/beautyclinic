"use client";

import { useState, useEffect } from "react";
import Button from "@atlaskit/button";
import { Checkbox } from "@atlaskit/checkbox";
import Badge from "@atlaskit/badge";
import Tabs, { Tab, TabList, TabPanel } from "@atlaskit/tabs";
import Modal, { ModalTransition } from "@atlaskit/modal-dialog";
import { api } from "@/trpc/react";
import { USER_ID_PLACEHOLDER } from "@/lib/constants";

interface MarketDataItem {
  id: number;
  researchType: "trend_analysis" | "price_research" | "competitor_analysis";
  aiAgent: string;
  location: string;
  createdAt: Date;
  preview: string;
  tokenCount: number;
}

interface MarketDataSelection {
  trendIds: number[];
  priceIds: number[];
  competitorIds: number[];
}

interface MarketDataSelectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selection: MarketDataSelection;
  onSelectionChange: (selection: MarketDataSelection) => void;
}

const AI_COLORS: Record<string, string> = {
  gemini: "#4285F4",
  chatgpt: "#10A37F", 
  claude: "#FF6B35",
  grok: "#1DA1F2",
};

const AI_LABELS: Record<string, string> = {
  gemini: "Gemini",
  chatgpt: "ChatGPT",
  claude: "Claude", 
  grok: "Grok",
};

const RESEARCH_TYPE_LABELS = {
  trend_analysis: "トレンド分析",
  price_research: "価格調査", 
  competitor_analysis: "競合分析",
};

export default function MarketDataSelectionDrawer({
  isOpen,
  onClose,
  selection,
  onSelectionChange,
}: MarketDataSelectionDrawerProps) {
  const [activeTab, setActiveTab] = useState("trend_analysis");

  const { data: historyData, isLoading } = api.strategy.getMarketResearchHistory.useQuery(
    { userId: USER_ID_PLACEHOLDER },
    { enabled: isOpen }
  );

  const groupedData = historyData?.reduce((acc, item) => {
    if (!acc[item.researchType]) {
      acc[item.researchType] = [];
    }
    acc[item.researchType].push(item);
    return acc;
  }, {} as Record<string, MarketDataItem[]>) || {};

  const handleItemToggle = (itemId: number, researchType: string) => {
    const newSelection = { ...selection };
    
    if (researchType === "trend_analysis") {
      if (newSelection.trendIds.includes(itemId)) {
        newSelection.trendIds = newSelection.trendIds.filter(id => id !== itemId);
      } else if (newSelection.trendIds.length < 3) {
        newSelection.trendIds = [...newSelection.trendIds, itemId];
      }
    } else if (researchType === "price_research") {
      if (newSelection.priceIds.includes(itemId)) {
        newSelection.priceIds = newSelection.priceIds.filter(id => id !== itemId);
      } else if (newSelection.priceIds.length < 3) {
        newSelection.priceIds = [...newSelection.priceIds, itemId];
      }
    } else if (researchType === "competitor_analysis") {
      if (newSelection.competitorIds.includes(itemId)) {
        newSelection.competitorIds = newSelection.competitorIds.filter(id => id !== itemId);
      } else if (newSelection.competitorIds.length < 3) {
        newSelection.competitorIds = [...newSelection.competitorIds, itemId];
      }
    }
    
    onSelectionChange(newSelection);
  };

  const getSelectedIds = (researchType: string) => {
    switch (researchType) {
      case "trend_analysis": return selection.trendIds;
      case "price_research": return selection.priceIds;
      case "competitor_analysis": return selection.competitorIds;
      default: return [];
    }
  };

  const selectLatest = (researchType: string) => {
    const items = groupedData[researchType] || [];
    const latestIds = items.slice(0, 3).map(item => item.id);
    
    const newSelection = { ...selection };
    if (researchType === "trend_analysis") {
      newSelection.trendIds = latestIds;
    } else if (researchType === "price_research") {
      newSelection.priceIds = latestIds;
    } else if (researchType === "competitor_analysis") {
      newSelection.competitorIds = latestIds;
    }
    
    onSelectionChange(newSelection);
  };

  const clearSelection = (researchType: string) => {
    const newSelection = { ...selection };
    if (researchType === "trend_analysis") {
      newSelection.trendIds = [];
    } else if (researchType === "price_research") {
      newSelection.priceIds = [];
    } else if (researchType === "competitor_analysis") {
      newSelection.competitorIds = [];
    }
    
    onSelectionChange(newSelection);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("ja-JP", {
      year: "numeric",
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderDataList = (researchType: string) => {
    const items = groupedData[researchType] || [];
    const selectedIds = getSelectedIds(researchType);
    
    if (items.length === 0) {
      return (
        <div style={{ 
          padding: "24px", 
          textAlign: "center", 
          color: "#6B778C",
          fontSize: "14px" 
        }}>
          {RESEARCH_TYPE_LABELS[researchType as keyof typeof RESEARCH_TYPE_LABELS]}のデータがありません
        </div>
      );
    }

    return (
      <div style={{ padding: "16px" }}>
        {/* 一括操作ボタン */}
        <div style={{ 
          display: "flex", 
          gap: "8px", 
          marginBottom: "16px",
          paddingBottom: "16px",
          borderBottom: "1px solid #DFE1E6"
        }}>
          <Button
            appearance="subtle"
            onClick={() => selectLatest(researchType)}
            isDisabled={items.length === 0}
          >
            最新3件を選択
          </Button>
          <Button
            appearance="subtle"
            onClick={() => clearSelection(researchType)}
            isDisabled={selectedIds.length === 0}
          >
            選択解除
          </Button>
        </div>

        {/* データリスト */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {items.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const isDisabled = !isSelected && selectedIds.length >= 3;
            
            return (
              <div
                key={item.id}
                style={{
                  border: `2px solid ${isSelected ? "#0052CC" : "#DFE1E6"}`,
                  borderRadius: "8px",
                  padding: "16px",
                  background: isSelected ? "#F4F8FF" : "#FFFFFF",
                  opacity: isDisabled ? 0.6 : 1,
                  cursor: isDisabled ? "not-allowed" : "pointer",
                }}
                onClick={() => !isDisabled && handleItemToggle(item.id, researchType)}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <Checkbox
                    isChecked={isSelected}
                    isDisabled={isDisabled}
                    onChange={() => !isDisabled && handleItemToggle(item.id, researchType)}
                  />
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "8px", 
                      marginBottom: "8px" 
                    }}>
                      <Badge
                        appearance="primary"
                        style={{ 
                          backgroundColor: AI_COLORS[item.aiAgent] || "#6B778C",
                          color: "white"
                        }}
                      >
                        {AI_LABELS[item.aiAgent] || item.aiAgent}
                      </Badge>
                      <span style={{ fontSize: "12px", color: "#6B778C" }}>
                        {formatDate(item.createdAt)}
                      </span>
                      <span style={{ fontSize: "12px", color: "#6B778C" }}>
                        約{item.tokenCount}トークン
                      </span>
                    </div>
                    
                    <div style={{ fontSize: "14px", color: "#172B4D", marginBottom: "4px" }}>
                      📍 {item.location}
                    </div>
                    
                    <div style={{ 
                      fontSize: "12px", 
                      color: "#6B778C", 
                      lineHeight: "1.4",
                      maxHeight: "40px",
                      overflow: "hidden"
                    }}>
                      {item.preview}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal
          onClose={onClose}
          width="large"
          shouldScrollInViewport
        >
          <div style={{ padding: "24px", maxHeight: "80vh", overflow: "auto" }}>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ 
                fontSize: "20px", 
                fontWeight: 600, 
                color: "#172B4D", 
                marginBottom: "8px" 
              }}>
                市場調査データを選択
              </h2>
              <p style={{ fontSize: "14px", color: "#6B778C" }}>
                各カテゴリ最大3件まで選択できます。複数のAIの視点を組み合わせて分析します。
              </p>
            </div>

            {isLoading ? (
              <div style={{ 
                padding: "48px", 
                textAlign: "center", 
                color: "#6B778C" 
              }}>
                データを読み込み中...
              </div>
            ) : (
              <Tabs
                id="market-data-selection-tabs"
                onChange={(index) => {
                  const types = ["trend_analysis", "price_research", "competitor_analysis"];
                  setActiveTab(types[index]);
                }}
              >
                <TabList>
                  <Tab>
                    トレンド分析 
                    {selection.trendIds.length > 0 && (
                      <span style={{ marginLeft: "8px" }}>
                        <Badge appearance="primary">
                          {selection.trendIds.length}
                        </Badge>
                      </span>
                    )}
                  </Tab>
                  <Tab>
                    価格調査
                    {selection.priceIds.length > 0 && (
                      <span style={{ marginLeft: "8px" }}>
                        <Badge appearance="primary">
                          {selection.priceIds.length}
                        </Badge>
                      </span>
                    )}
                  </Tab>
                  <Tab>
                    競合分析
                    {selection.competitorIds.length > 0 && (
                      <span style={{ marginLeft: "8px" }}>
                        <Badge appearance="primary">
                          {selection.competitorIds.length}
                        </Badge>
                      </span>
                    )}
                  </Tab>
                </TabList>
                
                <TabPanel>
                  {renderDataList("trend_analysis")}
                </TabPanel>
                <TabPanel>
                  {renderDataList("price_research")}
                </TabPanel>
                <TabPanel>
                  {renderDataList("competitor_analysis")}
                </TabPanel>
              </Tabs>
            )}

            <div style={{ 
              marginTop: "24px", 
              paddingTop: "24px", 
              borderTop: "1px solid #DFE1E6",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px"
            }}>
              <Button appearance="subtle" onClick={onClose}>
                キャンセル
              </Button>
              <Button appearance="primary" onClick={onClose}>
                決定
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </ModalTransition>
  );
}
