"use client";

import { useMemo } from "react";
import { api } from "@/trpc/react";
import { USER_ID_PLACEHOLDER } from "@/lib/constants";

export type ResearchHistoryType = "market" | "sns" | "strategy";
export type ResearchHistoryStatus = "success" | "error";

export interface StrategySummary {
  priceRecommendationsCount: number;
  campaignProposalsCount: number;
  newTreatmentSuggestionsCount: number;
  totalContents: number;
}

export interface ResearchHistoryItem {
  id: number;
  type: ResearchHistoryType;
  query: string;
  summary: string;
  createdAt: Date;
  status: ResearchHistoryStatus;
  platform?: string;
  aiAgent?: string;
  strategySummary?: StrategySummary;
  raw: unknown;
}

interface UseResearchHistoryResult {
  items: ResearchHistoryItem[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

export function useResearchHistory(type: ResearchHistoryType): UseResearchHistoryResult {
  const marketQuery = api.marketResearch.list.useQuery(
    {
      userId: USER_ID_PLACEHOLDER,
    },
    {
      enabled: type === "market",
      staleTime: 30000,
    },
  );

  const snsQuery = api.snsResearch.list.useQuery(
    {
      userId: USER_ID_PLACEHOLDER,
    },
    {
      enabled: type === "sns",
      staleTime: 30000,
    },
  );

  const strategyQuery = api.strategy.getHistory.useQuery(
    {
      userId: USER_ID_PLACEHOLDER,
    },
    {
      enabled: type === "strategy",
      staleTime: 30000,
    },
  );

  const items = useMemo<ResearchHistoryItem[]>(() => {
    if (type === "market" && marketQuery.data) {
      return marketQuery.data.map((r: any) => {
        const label =
          r.researchType === "trend_analysis"
            ? "トレンド分析"
            : r.researchType === "price_research"
            ? "価格調査"
            : "競合調査";

        const preview =
          typeof r.processedData === "string"
            ? r.processedData.length > 100
              ? `${r.processedData.slice(0, 100)}...`
              : r.processedData
            : "詳細を開いて確認してください";

        return {
          id: r.id,
          type: "market" as const,
          query: `${r.location} - ${label}`,
          summary: preview,
          createdAt: new Date(r.createdAt),
          status: "success" as const,
          aiAgent: r.aiAgent ?? undefined,
          raw: r,
        };
      });
    }

    if (type === "sns" && snsQuery.data) {
      return snsQuery.data.map((r: any) => {
        const keywords =
          Array.isArray(r.keywords) && r.keywords.length > 0
            ? r.keywords.join(", ")
            : r.keywords;

        const platformLabel =
          typeof r.platform === "string"
            ? r.platform.toUpperCase()
            : undefined;

        const preview =
          typeof r.trendData === "string"
            ? r.trendData.length > 100
              ? `${r.trendData.slice(0, 100)}...`
              : r.trendData
            : "詳細を開いて確認してください";

        return {
          id: r.id,
          type: "sns" as const,
          platform: r.platform,
          query: `${platformLabel ?? ""} ${keywords ?? ""}`.trim(),
          summary: preview,
          createdAt: new Date(r.createdAt),
          status: "success" as const,
          aiAgent: r.aiAgent ?? undefined,
          raw: r,
        };
      });
    }

    if (type === "strategy" && strategyQuery.data) {
      return strategyQuery.data.map((s: any) => {
        const createdAt = s.createdAt ? new Date(s.createdAt) : new Date();
        const summary: StrategySummary | undefined = s.summary
          ? {
              priceRecommendationsCount: s.summary.priceRecommendationsCount ?? 0,
              campaignProposalsCount: s.summary.campaignProposalsCount ?? 0,
              newTreatmentSuggestionsCount:
                s.summary.newTreatmentSuggestionsCount ?? 0,
              totalContents: s.summary.totalContents ?? 0,
            }
          : undefined;

        const parts: string[] = [];
        if (summary) {
          if (summary.priceRecommendationsCount > 0) {
            parts.push(`価格提案 ${summary.priceRecommendationsCount}件`);
          }
          if (summary.campaignProposalsCount > 0) {
            parts.push(`キャンペーン案 ${summary.campaignProposalsCount}件`);
          }
          if (summary.newTreatmentSuggestionsCount > 0) {
            parts.push(`新施術提案 ${summary.newTreatmentSuggestionsCount}件`);
          }
          if (parts.length === 0) {
            parts.push("提案内容あり");
          }
        }

        return {
          id: s.id,
          type: "strategy" as const,
          query: s.analysisType
            ? `戦略分析 (${s.analysisType})`
            : "戦略分析",
          summary: parts.join(" / ") || "詳細を開いて確認してください",
          createdAt,
          status: "success" as const,
          aiAgent: s.aiAgent ?? undefined,
          strategySummary: summary,
          raw: s,
        };
      });
    }

    return [];
  }, [type, marketQuery.data, snsQuery.data, strategyQuery.data]);

  const isLoading =
    (type === "market" && marketQuery.isLoading) ||
    (type === "sns" && snsQuery.isLoading) ||
    (type === "strategy" && strategyQuery.isLoading);

  const error =
    (type === "market" && marketQuery.error) ||
    (type === "sns" && snsQuery.error) ||
    (type === "strategy" && strategyQuery.error) ||
    null;

  const refetch = () => {
    if (type === "market") {
      void marketQuery.refetch();
    } else if (type === "sns") {
      void snsQuery.refetch();
    } else if (type === "strategy") {
      void strategyQuery.refetch();
    }
  };

  return {
    items,
    isLoading,
    error,
    refetch,
  };
}





