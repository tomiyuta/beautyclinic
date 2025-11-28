"use client";

import { useState } from "react";
import Button from "@atlaskit/button";
import TextField from "@atlaskit/textfield";
import Select from "@atlaskit/select";
import Banner from "@atlaskit/banner";
import Badge from "@atlaskit/badge";
import Tag from "@atlaskit/tag";
import Spinner from "@atlaskit/spinner";
import EmptyState from "@atlaskit/empty-state";
import { api } from "@/trpc/react";
import { TRPCClientError } from "@trpc/client";
import { useToastContext } from "@/components/ToastProvider";
import { USER_ID_PLACEHOLDER } from "@/lib/constants";

type SNSPlatform = "twitter" | "instagram" | "youtube" | "tiktok";
type TimeRange = "last_week" | "last_month" | "last_3months";

const platformOptions = [
  { label: "Twitter/X (Grok API)", value: "twitter" },
  { label: "Instagram (Gemini API)", value: "instagram" },
  { label: "YouTube (Gemini API)", value: "youtube" },
  { label: "TikTok (Gemini API)", value: "tiktok" },
];

const timeRangeOptions = [
  { label: "過去1週間", value: "last_week" },
  { label: "過去1ヶ月", value: "last_month" },
  { label: "過去3ヶ月", value: "last_3months" },
];

/**
 * 調査履歴の表示用に、読みやすい日本語形式に変換する
 * - TikTok: <REPORT_MARKDOWN>セクションのみを抽出
 * - Instagram/YouTube/Twitter: JSON形式の場合は読みやすい形式に変換、またはMarkdown形式のみを抽出
 */
function formatTrendDataForDisplay(trendData: string | null, platform: string): string {
  if (!trendData) {
    return "";
  }

  // TikTok、YouTube、Instagramの場合は<REPORT_MARKDOWN>セクションのみを抽出
  if (platform === "tiktok" || platform === "youtube" || platform === "instagram") {
    const reportMatch = trendData.match(/<REPORT_MARKDOWN>([\s\S]*?)<\/REPORT_MARKDOWN>/);
    if (reportMatch) {
      return reportMatch[1]!.trim();
    }
    // <REPORT_MARKDOWN>タグがない場合は、<CONSENSUS_JSON>セクションを除去
    const withoutConsensus = trendData.replace(/<CONSENSUS_JSON>[\s\S]*?<\/CONSENSUS_JSON>/g, "").trim();
    if (withoutConsensus) {
      return withoutConsensus;
    }
  }

  // JSON形式の場合は、読みやすい形式に変換を試みる
  try {
    const parsed = JSON.parse(trendData);
    // JSON形式の場合は、Markdown形式に変換を試みる
    if (typeof parsed === "object" && parsed !== null) {
      // <REPORT_MARKDOWN>セクションがある場合はそれを抽出
      const reportMatch = trendData.match(/<REPORT_MARKDOWN>([\s\S]*?)<\/REPORT_MARKDOWN>/);
      if (reportMatch) {
        return reportMatch[1]!.trim();
      }
      // オブジェクトの場合は、読みやすい形式に整形
      return formatJSONToReadableText(parsed);
    }
  } catch {
    // JSON形式でない場合は、そのまま返す
    // ただし、<CONSENSUS_JSON>セクションがある場合は除去
    const withoutConsensus = trendData.replace(/<CONSENSUS_JSON>[\s\S]*?<\/CONSENSUS_JSON>/g, "").trim();
    if (withoutConsensus) {
      return withoutConsensus;
    }
  }

  return trendData;
}

/**
 * JSONオブジェクトを読みやすいテキスト形式に変換
 */
function formatJSONToReadableText(obj: unknown, indent: number = 0): string {
  if (obj === null || obj === undefined) {
    return "";
  }

  if (typeof obj === "string") {
    return obj;
  }

  if (typeof obj === "number" || typeof obj === "boolean") {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item, index) => {
      const prefix = `${"  ".repeat(indent)}${index + 1}. `;
      const formatted = formatJSONToReadableText(item, indent + 1);
      return `${prefix}${formatted}`;
    }).join("\n");
  }

  if (typeof obj === "object") {
    return Object.entries(obj)
      .map(([key, value]) => {
        const prefix = `${"  ".repeat(indent)}## ${key}\n`;
        const formatted = formatJSONToReadableText(value, indent + 1);
        return `${prefix}${formatted}`;
      })
      .join("\n\n");
  }

  return String(obj);
}

export function SNSResearch() {
  const [platform, setPlatform] = useState<SNSPlatform | "">("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("last_month");

  const utils = api.useUtils();
  const toast = useToastContext();

  const twitterMutation = api.snsResearch.analyzeTwitter.useMutation({
    onSuccess: () => {
      toast.showSuccess("Twitter調査が完了しました");
      void utils.snsResearch.list.invalidate({
        userId: USER_ID_PLACEHOLDER,
      });
      setKeywords([]);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました。もう一度お試しください。";
      toast.showError(message);
    },
  });

  const instagramMutation = api.snsResearch.analyzeInstagram.useMutation({
    onSuccess: () => {
      toast.showSuccess("Instagram調査が完了しました");
      void utils.snsResearch.list.invalidate({
        userId: USER_ID_PLACEHOLDER,
      });
      setKeywords([]);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました。もう一度お試しください。";
      toast.showError(message);
    },
  });

  const tiktokMutation = api.snsResearch.analyzeTikTok.useMutation({
    onSuccess: () => {
      toast.showSuccess("TikTok調査が完了しました");
      void utils.snsResearch.list.invalidate({
        userId: USER_ID_PLACEHOLDER,
      });
      setKeywords([]);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました。もう一度お試しください。";
      toast.showError(message);
    },
  });

  const youtubeMutation = api.snsResearch.analyzeYouTube.useMutation({
    onSuccess: () => {
      toast.showSuccess("YouTube調査が完了しました");
      void utils.snsResearch.list.invalidate({
        userId: USER_ID_PLACEHOLDER,
      });
      setKeywords([]);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました。もう一度お試しください。";
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
      staleTime: 60000, // 1分間キャッシュ
      enabled: !!platform, // プラットフォームが選択されている場合のみ取得
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
      const input = {
        userId: USER_ID_PLACEHOLDER,
        keywords,
        timeRange,
      };

      if (platform === "twitter") {
        await twitterMutation.mutateAsync(input);
      } else if (platform === "instagram") {
        await instagramMutation.mutateAsync(input);
      } else if (platform === "youtube") {
        await youtubeMutation.mutateAsync(input);
      } else if (platform === "tiktok") {
        await tiktokMutation.mutateAsync(input);
      }
    } catch (error) {
      if (error instanceof TRPCClientError) {
        toast.showError(error.message);
      }
    }
  };

  const getPlatformLabel = (p: string) => {
    switch (p) {
      case "twitter":
        return "Twitter/X";
      case "instagram":
        return "Instagram";
      case "youtube":
        return "YouTube";
      case "tiktok":
        return "TikTok";
      default:
        return p;
    }
  };

  const isPending = twitterMutation.isPending || instagramMutation.isPending || youtubeMutation.isPending || tiktokMutation.isPending;

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "48px 16px" }}>
      <header style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "#172B4D" }}>
            SNS調査
          </h1>
          {modelInfoQuery.data && (
            <div
              style={{
                padding: "4px 12px",
                borderRadius: "3px",
                backgroundColor: "#0052CC",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 500,
                whiteSpace: "nowrap",
                display: "inline-block",
              }}
            >
              使用AI: {modelInfoQuery.data.aiAgent.toUpperCase()} ({modelInfoQuery.data.model})
            </div>
          )}
        </div>
        <p style={{ fontSize: "14px", color: "#6B778C" }}>
          Twitter/X、Instagram、YouTubeの最新トレンドを自動収集します
        </p>
      </header>

      <section style={{ marginBottom: "32px", padding: "32px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
              SNSプラットフォーム *
            </label>
            <Select
              isRequired
              options={platformOptions}
              value={platform ? platformOptions.find(opt => opt.value === platform) : null}
              onChange={(option) => {
                if (option && 'value' in option) {
                  setPlatform(option.value as SNSPlatform);
                } else {
                  setPlatform("");
                }
              }}
              placeholder="選択してください"
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
              調査キーワード *
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
                placeholder="例：ダーマペン、ボツリヌス注射、美容皮膚科"
                style={{ flex: 1 }}
              />
              <Button
                type="button"
                appearance="default"
                onClick={handleAddKeyword}
              >
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
                } else {
                  setTimeRange("last_month");
                }
              }}
            />
          </div>


          <Button
            type="submit"
            appearance="primary"
            isDisabled={isPending}
          >
            {isPending ? "調査中..." : "調査を開始"}
          </Button>
        </form>
      </section>

      {/* 調査結果履歴 */}
      <section style={{ marginTop: "32px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "24px", color: "#172B4D" }}>
          調査結果履歴
        </h2>

        {/* Twitter調査履歴 */}
        <div style={{ marginBottom: "32px", padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
            Twitter/X調査履歴
          </h3>
          {resultsQuery.isLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "16px" }}>
              <Spinner size="small" />
              <span style={{ fontSize: "14px", color: "#6B778C" }}>読み込み中...</span>
            </div>
          )}
          {resultsQuery.error && (
            <Banner appearance="error">
              エラー: {resultsQuery.error.message}
            </Banner>
          )}
          {resultsQuery.data && (
            (() => {
              const twitterHistories = resultsQuery.data.filter((r: any) => r.platform === "twitter");
              if (twitterHistories.length === 0) {
                return (
                  <EmptyState
                    header="まだTwitter/X調査がありません"
                    description="Twitter/X調査を実行すると、ここに履歴が表示されます"
                  />
                );
              }
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {twitterHistories.map((result: any) => (
                    <div
                      key={result.id}
                      style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", color: "#6B778C" }}>
                          {result.keywords} - {new Date(result.createdAt).toLocaleString("ja-JP")}
                        </span>
                        <Badge appearance="added">
                          {result.aiAgent}
                        </Badge>
                      </div>
                      {result.trendData && (
                        <details style={{ marginTop: "8px" }}>
                          <summary style={{ cursor: "pointer", fontSize: "14px", fontWeight: 500, color: "#42526E", listStyle: "none" }}>
                            調査結果を表示
                          </summary>
                          <div style={{ marginTop: "12px", whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "16px", fontSize: "14px", color: "#172B4D", maxHeight: "240px", overflow: "auto" }}>
                            {formatTrendDataForDisplay(result.trendData, result.platform)}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>

        {/* Instagram調査履歴 */}
        <div style={{ marginBottom: "32px", padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
            Instagram調査履歴
          </h3>
          {resultsQuery.isLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "16px" }}>
              <Spinner size="small" />
              <span style={{ fontSize: "14px", color: "#6B778C" }}>読み込み中...</span>
            </div>
          )}
          {resultsQuery.error && (
            <Banner appearance="error">
              エラー: {resultsQuery.error.message}
            </Banner>
          )}
          {resultsQuery.data && (
            (() => {
              const instagramHistories = resultsQuery.data.filter((r: any) => r.platform === "instagram");
              if (instagramHistories.length === 0) {
                return (
                  <EmptyState
                    header="まだInstagram調査がありません"
                    description="Instagram調査を実行すると、ここに履歴が表示されます"
                  />
                );
              }
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {instagramHistories.map((result: any) => (
                    <div
                      key={result.id}
                      style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", color: "#6B778C" }}>
                          {result.keywords} - {new Date(result.createdAt).toLocaleString("ja-JP")}
                        </span>
                        <Badge appearance="added">
                          {result.aiAgent}
                        </Badge>
                      </div>
                      {result.trendData && (
                        <details style={{ marginTop: "8px" }}>
                          <summary style={{ cursor: "pointer", fontSize: "14px", fontWeight: 500, color: "#42526E", listStyle: "none" }}>
                            調査結果を表示
                          </summary>
                          <div style={{ marginTop: "12px", whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "16px", fontSize: "14px", color: "#172B4D", maxHeight: "240px", overflow: "auto" }}>
                            {formatTrendDataForDisplay(result.trendData, result.platform)}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>

        {/* YouTube調査履歴 */}
        <div style={{ marginBottom: "32px", padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
            YouTube調査履歴
          </h3>
          {resultsQuery.isLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "16px" }}>
              <Spinner size="small" />
              <span style={{ fontSize: "14px", color: "#6B778C" }}>読み込み中...</span>
            </div>
          )}
          {resultsQuery.error && (
            <Banner appearance="error">
              エラー: {resultsQuery.error.message}
            </Banner>
          )}
          {resultsQuery.data && (
            (() => {
              const youtubeHistories = resultsQuery.data.filter((r: any) => r.platform === "youtube");
              if (youtubeHistories.length === 0) {
                return (
                  <EmptyState
                    header="まだYouTube調査がありません"
                    description="YouTube調査を実行すると、ここに履歴が表示されます"
                  />
                );
              }
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {youtubeHistories.map((result: any) => (
                    <div
                      key={result.id}
                      style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", color: "#6B778C" }}>
                          {result.keywords} - {new Date(result.createdAt).toLocaleString("ja-JP")}
                        </span>
                        <Badge appearance="added">
                          {result.aiAgent}
                        </Badge>
                      </div>
                      {result.trendData && (
                        <details style={{ marginTop: "8px" }}>
                          <summary style={{ cursor: "pointer", fontSize: "14px", fontWeight: 500, color: "#42526E", listStyle: "none" }}>
                            調査結果を表示
                          </summary>
                          <div style={{ marginTop: "12px", whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "16px", fontSize: "14px", color: "#172B4D", maxHeight: "240px", overflow: "auto" }}>
                            {formatTrendDataForDisplay(result.trendData, result.platform)}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>

        {/* TikTok調査履歴 */}
        <div style={{ marginBottom: "32px", padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
            TikTok調査履歴
          </h3>
          {resultsQuery.isLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "16px" }}>
              <Spinner size="small" />
              <span style={{ fontSize: "14px", color: "#6B778C" }}>読み込み中...</span>
            </div>
          )}
          {resultsQuery.error && (
            <Banner appearance="error">
              エラー: {resultsQuery.error.message}
            </Banner>
          )}
          {resultsQuery.data && (
            (() => {
              const tiktokHistories = resultsQuery.data.filter((r: any) => r.platform === "tiktok");
              if (tiktokHistories.length === 0) {
                return (
                  <EmptyState
                    header="まだTikTok調査がありません"
                    description="TikTok調査を実行すると、ここに履歴が表示されます"
                  />
                );
              }
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {tiktokHistories.map((result: any) => (
                    <div
                      key={result.id}
                      style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", color: "#6B778C" }}>
                          {result.keywords} - {new Date(result.createdAt).toLocaleString("ja-JP")}
                        </span>
                        <Badge appearance="added">
                          {result.aiAgent}
                        </Badge>
                      </div>
                      {result.trendData && (
                        <details style={{ marginTop: "8px" }}>
                          <summary style={{ cursor: "pointer", fontSize: "14px", fontWeight: 500, color: "#42526E", listStyle: "none" }}>
                            調査結果を表示
                          </summary>
                          <div style={{ marginTop: "12px", whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "16px", fontSize: "14px", color: "#172B4D", maxHeight: "240px", overflow: "auto" }}>
                            {formatTrendDataForDisplay(result.trendData, result.platform)}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>
      </section>
    </div>
  );
}

export default SNSResearch;
