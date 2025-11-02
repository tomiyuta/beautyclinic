"use client";

import { useState } from "react";

import { api } from "@/trpc/react";
import { TRPCClientError } from "@trpc/client";

type SNSPlatform = "twitter" | "instagram" | "youtube";
type TimeRange = "last_week" | "last_month" | "last_3months";

const USER_ID_PLACEHOLDER = 1;

export function SNSResearch() {
  const [platform, setPlatform] = useState<SNSPlatform | "">("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("last_month");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const utils = api.useUtils();

  const twitterMutation = api.snsResearch.analyzeTwitter.useMutation({
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "Twitter調査が完了しました",
      });
      void utils.snsResearch.list.invalidate({
        userId: USER_ID_PLACEHOLDER,
      });
      setKeywords([]);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error.message });
    },
  });

  const instagramMutation = api.snsResearch.analyzeInstagram.useMutation({
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "Instagram調査が完了しました",
      });
      void utils.snsResearch.list.invalidate({
        userId: USER_ID_PLACEHOLDER,
      });
      setKeywords([]);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error.message });
    },
  });

  const youtubeMutation = api.snsResearch.analyzeYouTube.useMutation({
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "YouTube調査が完了しました",
      });
      void utils.snsResearch.list.invalidate({
        userId: USER_ID_PLACEHOLDER,
      });
      setKeywords([]);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error.message });
    },
  });

  const resultsQuery = api.snsResearch.list.useQuery({
    userId: USER_ID_PLACEHOLDER,
  });

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
    setFeedback({ type: null, message: "" });

    if (!platform) {
      setFeedback({
        type: "error",
        message: "プラットフォームを選択してください",
      });
      return;
    }

    if (keywords.length === 0) {
      setFeedback({
        type: "error",
        message: "少なくとも1つのキーワードを追加してください",
      });
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
      }
    } catch (error) {
      if (error instanceof TRPCClientError) {
        setFeedback({ type: "error", message: error.message });
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
      default:
        return p;
    }
  };


  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">SNS調査</h1>
        <p className="text-sm text-zinc-600">
          Twitter/X、Instagram、YouTubeの最新トレンドを自動収集します
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              SNSプラットフォーム *
            </label>
            <select
              required
              value={platform}
              onChange={(e) => setPlatform(e.target.value as SNSPlatform | "")}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">選択してください</option>
              <option value="twitter">Twitter/X (Grok API)</option>
              <option value="instagram">Instagram (Gemini API)</option>
              <option value="youtube">YouTube (Gemini API)</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              調査キーワード *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddKeyword();
                  }
                }}
                placeholder="例：ダーマペン、ボツリヌス注射、美容皮膚科"
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                type="button"
                onClick={handleAddKeyword}
                className="rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200"
              >
                追加
              </button>
            </div>
            {keywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              調査期間
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="last_week">過去1週間</option>
              <option value="last_month">過去1ヶ月</option>
              <option value="last_3months">過去3ヶ月</option>
            </select>
          </div>

          {feedback.type && (
            <div
              className={`rounded-lg px-4 py-2 text-sm ${
                feedback.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {feedback.message}
            </div>
          )}

          <button
            type="submit"
            disabled={
              twitterMutation.isPending ||
              instagramMutation.isPending ||
              youtubeMutation.isPending
            }
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {twitterMutation.isPending ||
            instagramMutation.isPending ||
            youtubeMutation.isPending
              ? "調査中..."
              : "調査を開始"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          調査結果履歴
        </h2>
        {resultsQuery.isLoading && (
          <p className="text-sm text-zinc-500">読み込み中...</p>
        )}
        {resultsQuery.error && (
          <p className="text-sm text-red-600">
            エラー: {resultsQuery.error.message}
          </p>
        )}
        {resultsQuery.data && resultsQuery.data.length === 0 && (
          <p className="text-sm text-zinc-500">
            まだ調査結果がありません
          </p>
        )}
        {resultsQuery.data && resultsQuery.data.length > 0 && (
          <div className="space-y-4">
            {resultsQuery.data.map((result) => (
              <div
                key={result.id}
                className="rounded-lg border border-zinc-200 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
                        {getPlatformLabel(result.platform)}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {result.keywords}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {new Date(result.createdAt).toLocaleString("ja-JP")}
                      </span>
                      <span className="text-xs text-zinc-500">
                        ({result.aiAgent})
                      </span>
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium text-zinc-700 hover:text-zinc-900">
                        結果を表示
                      </summary>
                      <pre className="mt-2 max-h-60 overflow-auto rounded bg-zinc-50 p-3 text-xs text-zinc-900">
                        {JSON.stringify(JSON.parse(result.trendData), null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default SNSResearch;

