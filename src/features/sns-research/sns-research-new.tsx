"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Button from "@atlaskit/button";
import TextField from "@atlaskit/textfield";
import Select from "@atlaskit/select";
import Spinner from "@atlaskit/spinner";
import Tag from "@atlaskit/tag";
import { api } from "@/trpc/react";
import { TRPCClientError } from "@trpc/client";
import { useToastContext } from "@/components/ToastProvider";
import { USER_ID_PLACEHOLDER } from "@/lib/constants";
import { SelectionCard } from "@/components/research/SelectionCard";
import { HistoryCard } from "@/components/research/HistoryCard";
import { FilterBar, type FilterState } from "@/components/research/FilterBar";
import { ResearchDetailDrawer } from "@/components/research/ResearchDetailDrawer";

type SNSPlatform = "twitter" | "instagram" | "youtube" | "tiktok";
type TimeRange = "last_week" | "last_month" | "last_3months";

const platformConfigs = [
  {
    platform: "twitter" as const,
    icon: "𝕏",
    title: "Twitter/X",
    description: "Grok APIで最新ポストを分析",
    color: "#000000",
  },
  {
    platform: "instagram" as const,
    icon: "📷",
    title: "Instagram",
    description: "Gemini APIで画像トレンドを分析",
    color: "#E1306C",
  },
  {
    platform: "youtube" as const,
    icon: "📹",
    title: "YouTube",
    description: "Gemini APIで動画トレンドを分析",
    color: "#FF0000",
  },
  {
    platform: "tiktok" as const,
    icon: "🎵",
    title: "TikTok",
    description: "Gemini APIでショート動画を分析",
    color: "#000000",
  },
];

const timeRangeOptions = [
  { label: "過去1週間", value: "last_week" },
  { label: "過去1ヶ月", value: "last_month" },
  { label: "過去3ヶ月", value: "last_3months" },
];

function formatTrendDataForDisplay(trendData: string | null, platform: string): string {
  if (!trendData) return "";

  if (platform === "tiktok" || platform === "youtube" || platform === "instagram") {
    const reportMatch = trendData.match(/<REPORT_MARKDOWN>([\s\S]*?)<\/REPORT_MARKDOWN>/);
    if (reportMatch) return reportMatch[1]!.trim();
    
    const withoutConsensus = trendData.replace(/<CONSENSUS_JSON>[\s\S]*?<\/CONSENSUS_JSON>/g, "").trim();
    if (withoutConsensus) return withoutConsensus;
  }

  try {
    const parsed = JSON.parse(trendData);
    if (typeof parsed === "object" && parsed !== null) {
      const reportMatch = trendData.match(/<REPORT_MARKDOWN>([\s\S]*?)<\/REPORT_MARKDOWN>/);
      if (reportMatch) return reportMatch[1]!.trim();
    }
  } catch {
    const withoutConsensus = trendData.replace(/<CONSENSUS_JSON>[\s\S]*?<\/CONSENSUS_JSON>/g, "").trim();
    if (withoutConsensus) return withoutConsensus;
  }

  return trendData;
}

interface DetailedResult {
  id: number;
  platform: string;
  keywords: string;
  trendData: string | null;
  createdAt: Date;
}

export function SNSResearchNew() {
  const [platform, setPlatform] = useState<SNSPlatform | "">("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("last_month");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    platform: "all",
    timeRange: "all",
    status: "all",
  });
  const [selectedResult, setSelectedResult] = useState<DetailedResult | null>(null);

  const utils = api.useUtils();
  const toast = useToastContext();

  const twitterMutation = api.snsResearch.analyzeTwitter.useMutation({
    onSuccess: () => {
      toast.showSuccess("Twitter調査が完了しました");
      void utils.snsResearch.list.invalidate({ userId: USER_ID_PLACEHOLDER });
      setKeywords([]);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      toast.showError(message);
    },
  });

  const instagramMutation = api.snsResearch.analyzeInstagram.useMutation({
    onSuccess: () => {
      toast.showSuccess("Instagram調査が完了しました");
      void utils.snsResearch.list.invalidate({ userId: USER_ID_PLACEHOLDER });
      setKeywords([]);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      toast.showError(message);
    },
  });

  const tiktokMutation = api.snsResearch.analyzeTikTok.useMutation({
    onSuccess: () => {
      toast.showSuccess("TikTok調査が完了しました");
      void utils.snsResearch.list.invalidate({ userId: USER_ID_PLACEHOLDER });
      setKeywords([]);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      toast.showError(message);
    },
  });

  const youtubeMutation = api.snsResearch.analyzeYouTube.useMutation({
    onSuccess: () => {
      toast.showSuccess("YouTube調査が完了しました");
      void utils.snsResearch.list.invalidate({ userId: USER_ID_PLACEHOLDER });
      setKeywords([]);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      toast.showError(message);
    },
  });

  const resultsQuery = api.snsResearch.list.useQuery({
    userId: USER_ID_PLACEHOLDER,
  }, {
    retry: 3,
    retryDelay: 1000,
    staleTime: 30000,
  });

  const modelInfoQuery = api.snsResearch.getCurrentModel.useQuery(
    { platform: platform || undefined },
    {
      retry: 2,
      staleTime: 60000,
      enabled: !!platform,
    }
  );

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!platform) {
      toast.showError("プラットフォームを選択してください");
      return;
    }

    if (keywords.length === 0) {
      toast.showError("少なくとも1つのキーワードを追加してください");
      return;
    }

    try {
      const input = { userId: USER_ID_PLACEHOLDER, keywords, timeRange };

      if (platform === "twitter") await twitterMutation.mutateAsync(input);
      else if (platform === "instagram") await instagramMutation.mutateAsync(input);
      else if (platform === "youtube") await youtubeMutation.mutateAsync(input);
      else if (platform === "tiktok") await tiktokMutation.mutateAsync(input);
    } catch (error) {
      if (error instanceof TRPCClientError) {
        toast.showError(error.message);
      }
    }
  };

  const isPending = twitterMutation.isPending || instagramMutation.isPending || youtubeMutation.isPending || tiktokMutation.isPending;

  // Filter results
  const filteredResults = useMemo(() => {
    if (!resultsQuery.data) return [];

    let filtered = [...resultsQuery.data];

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.keywords.toLowerCase().includes(query) ||
        r.platform.toLowerCase().includes(query) ||
        (r.trendData && r.trendData.toLowerCase().includes(query))
      );
    }

    // Platform filter
    if (filters.platform && filters.platform !== "all") {
      filtered = filtered.filter(r => r.platform === filters.platform);
    }

    // Time range filter
    if (filters.timeRange && filters.timeRange !== "all") {
      const now = new Date();
      const cutoff = new Date();
      if (filters.timeRange === "7days") cutoff.setDate(now.getDate() - 7);
      else if (filters.timeRange === "30days") cutoff.setDate(now.getDate() - 30);
      else if (filters.timeRange === "90days") cutoff.setDate(now.getDate() - 90);
      
      filtered = filtered.filter(r => new Date(r.createdAt) >= cutoff);
    }

    return filtered;
  }, [resultsQuery.data, searchQuery, filters]);

  const handleRerun = (result: DetailedResult) => {
    setPlatform(result.platform as SNSPlatform);
    setKeywords(result.keywords.split(",").map(k => k.trim()));
    toast.showInfo("調査条件を復元しました。「調査を開始」ボタンをクリックしてください。");
  };

  const generateSummary = (result: DetailedResult): string => {
    const formattedData = formatTrendDataForDisplay(result.trendData, result.platform);
    if (!formattedData) return "調査結果なし";
    const preview = formattedData.substring(0, 100);
    return preview.length < formattedData.length ? `${preview}...` : preview;
  };

  const getPlatformEmoji = (p: string): string => {
    const config = platformConfigs.find(c => c.platform === p);
    return config?.icon || "📱";
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "48px 16px" }}>
      {/* ヘッダー */}
      <header style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 600, margin: 0, color: "#172B4D" }}>
            📱 SNS調査
          </h1>
          {modelInfoQuery.data && (
            <div
              style={{
                padding: "6px 16px",
                borderRadius: "6px",
                backgroundColor: "#0052CC",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              🤖 {modelInfoQuery.data.aiAgent.toUpperCase()} ({modelInfoQuery.data.model})
            </div>
          )}
        </div>
        <p style={{ fontSize: "15px", color: "#6B778C" }}>
          AIを活用してSNSの最新トレンドと市場反応を自動収集・分析します
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
        {/* 左側: 調査実行エリア */}
        <div>
          {/* プラットフォーム選択 */}
          <section style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
              ステップ 1: プラットフォームを選択
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
              {platformConfigs.map((config) => (
                <SelectionCard
                  key={config.platform}
                  icon={<span style={{ fontSize: "64px" }}>{config.icon}</span>}
                  title={config.title}
                  description={config.description}
                  isSelected={platform === config.platform}
                  onClick={() => setPlatform(config.platform)}
                  disabled={isPending}
                />
              ))}
            </div>
          </section>

          {/* 調査フォーム */}
          {platform && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                padding: "32px",
                background: "#FFFFFF",
                borderRadius: "12px",
                border: "2px solid #0052CC20",
              }}
            >
              <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "24px", color: "#172B4D" }}>
                ステップ 2: 調査条件を設定
              </h2>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                    キーワード *
                  </label>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <TextField
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput((e.target as HTMLInputElement).value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddKeyword();
                        }
                      }}
                      placeholder="例：ハイフ、美容医療、アンチエイジング"
                    />
                    <Button type="button" appearance="default" onClick={handleAddKeyword}>
                      追加
                    </Button>
                  </div>
                  {keywords.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {keywords.map((keyword) => (
                        <div key={keyword} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Tag text={keyword} />
                          <Button
                            appearance="subtle-link"
                            onClick={() => handleRemoveKeyword(keyword)}
                            style={{ padding: "0", minWidth: "auto" }}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                    調査期間
                  </label>
                  <Select
                    options={timeRangeOptions}
                    value={timeRangeOptions.find(opt => opt.value === timeRange)}
                    onChange={(option) => {
                      if (option && 'value' in option) {
                        setTimeRange(option.value as TimeRange);
                      }
                    }}
                  />
                </div>

                <Button
                  type="submit"
                  appearance="primary"
                  isDisabled={isPending}
                  style={{ marginTop: "16px", fontSize: "15px", padding: "12px 24px", fontWeight: 600 }}
                >
                  {isPending ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Spinner size="small" />
                      調査中...
                    </div>
                  ) : (
                    "🚀 調査を開始"
                  )}
                </Button>
              </form>
            </motion.section>
          )}
        </div>

        {/* 右側: 調査結果履歴 */}
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
            📋 調査結果履歴
          </h2>

          <FilterBar
            onSearch={setSearchQuery}
            onFilterChange={setFilters}
            showPlatformFilter={true}
            platforms={platformConfigs.map(c => ({ label: c.title, value: c.platform }))}
          />

          {resultsQuery.isLoading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px" }}>
              <Spinner size="large" />
            </div>
          )}

          {resultsQuery.data && filteredResults.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px", color: "#6B778C" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
              <div style={{ fontSize: "16px", fontWeight: 500 }}>
                {searchQuery || filters.platform !== "all" ? "検索結果が見つかりません" : "まだ調査履歴がありません"}
              </div>
              <div style={{ fontSize: "14px", marginTop: "8px" }}>
                {searchQuery || filters.platform !== "all" ? "別の条件で試してください" : "左側のフォームから調査を開始してください"}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {filteredResults.map((result) => (
              <HistoryCard
                key={result.id}
                type="sns"
                platform={result.platform}
                query={`${getPlatformEmoji(result.platform)} ${result.keywords}`}
                summary={generateSummary(result)}
                timestamp={new Date(result.createdAt)}
                status="success"
                onRerun={() => handleRerun(result)}
                onViewDetail={() => setSelectedResult(result)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 詳細表示ドロワー */}
      <ResearchDetailDrawer
        isOpen={selectedResult !== null}
        onClose={() => setSelectedResult(null)}
        title={selectedResult ? `${getPlatformEmoji(selectedResult.platform)} ${selectedResult.platform.toUpperCase()} 調査詳細` : ""}
      >
        {selectedResult && (
          <div>
            <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #EBECF0" }}>
              <div style={{ fontSize: "12px", color: "#6B778C", marginBottom: "4px" }}>調査日時</div>
              <div style={{ fontSize: "14px", fontWeight: 500 }}>
                {new Date(selectedResult.createdAt).toLocaleString("ja-JP")}
              </div>
            </div>
            
            <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #EBECF0" }}>
              <div style={{ fontSize: "12px", color: "#6B778C", marginBottom: "4px" }}>キーワード</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {selectedResult.keywords.split(",").map((kw, idx) => (
                  <Tag key={idx} text={kw.trim()} />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #EBECF0" }}>
              <div style={{ fontSize: "12px", color: "#6B778C", marginBottom: "4px" }}>期間</div>
              <div style={{ fontSize: "14px", fontWeight: 500 }}>
                {timeRange === "last_week" ? "過去1週間" :
                 timeRange === "last_month" ? "過去1ヶ月" : "過去3ヶ月"}
              </div>
            </div>

            {selectedResult.trendData && (
              <div>
                <div style={{ fontSize: "12px", color: "#6B778C", marginBottom: "8px" }}>調査結果</div>
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    borderRadius: "8px",
                    background: "#F4F5F7",
                    padding: "20px",
                    fontSize: "14px",
                    color: "#172B4D",
                    lineHeight: 1.6,
                    maxHeight: "600px",
                    overflow: "auto",
                  }}
                >
                  {formatTrendDataForDisplay(selectedResult.trendData, selectedResult.platform)}
                </div>
              </div>
            )}
          </div>
        )}
      </ResearchDetailDrawer>
    </div>
  );
}

export default SNSResearchNew;

