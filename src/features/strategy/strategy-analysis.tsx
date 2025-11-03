"use client";

import { useState } from "react";

import { api } from "@/trpc/react";
import { TRPCClientError } from "@trpc/client";

const USER_ID_PLACEHOLDER = 1;

export function StrategyAnalysis() {
  const [location, setLocation] = useState("");
  const [includeMarketData, setIncludeMarketData] = useState(true);
  const [includeSNSData, setIncludeSNSData] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const utils = api.useUtils();

  const marketPositionMutation =
    api.strategy.analyzeMarketPosition.useMutation({
      onSuccess: () => {
        setFeedback({
          type: "success",
          message: "総合分析が完了しました",
        });
        void utils.strategy.list.invalidate({ userId: USER_ID_PLACEHOLDER });
        setLocation("");
      },
      onError: (error) => {
        setFeedback({ 
          type: "error", 
          message: error.message || "エラーが発生しました。もう一度お試しください。" 
        });
      },
    });

  const priceRecommendationMutation =
    api.strategy.generatePriceRecommendations.useMutation({
      onSuccess: () => {
        setFeedback({
          type: "success",
          message: "価格設定提案が完了しました",
        });
      },
      onError: (error) => {
        setFeedback({ 
          type: "error", 
          message: error.message || "エラーが発生しました。もう一度お試しください。" 
        });
      },
    });

  const campaignMutation = api.strategy.generateCampaignProposals.useMutation({
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "キャンペーン案が生成されました",
      });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error.message });
    },
  });

  const newTreatmentMutation =
    api.strategy.suggestNewTreatments.useMutation({
      onSuccess: () => {
        setFeedback({
          type: "success",
          message: "新施術提案が完了しました",
        });
      },
      onError: (error) => {
        setFeedback({ 
          type: "error", 
          message: error.message || "エラーが発生しました。もう一度お試しください。" 
        });
      },
    });

  const strategiesQuery = api.strategy.list.useQuery({
    userId: USER_ID_PLACEHOLDER,
  }, {
    retry: 3,
    retryDelay: 1000,
    staleTime: 30000,
  });

  const handleAnalyzeMarketPosition = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    setFeedback({ type: null, message: "" });

    if (!location.trim()) {
      setFeedback({
        type: "error",
        message: "場所を入力してください",
      });
      return;
    }

    try {
      await marketPositionMutation.mutateAsync({
        userId: USER_ID_PLACEHOLDER,
        location: location.trim(),
        includeMarketData,
        includeSNSData,
      });
    } catch (error) {
      if (error instanceof TRPCClientError) {
        setFeedback({ type: "error", message: error.message });
      }
    }
  };

  const handleGeneratePriceRecommendations = async () => {
    setFeedback({ type: null, message: "" });
    try {
      await priceRecommendationMutation.mutateAsync({
        userId: USER_ID_PLACEHOLDER,
      });
    } catch (error) {
      if (error instanceof TRPCClientError) {
        setFeedback({ type: "error", message: error.message });
      }
    }
  };

  const handleGenerateCampaigns = async () => {
    setFeedback({ type: null, message: "" });
    try {
      await campaignMutation.mutateAsync({
        userId: USER_ID_PLACEHOLDER,
      });
    } catch (error) {
      if (error instanceof TRPCClientError) {
        setFeedback({ type: "error", message: error.message });
      }
    }
  };

  const handleSuggestNewTreatments = async () => {
    setFeedback({ type: null, message: "" });
    try {
      await newTreatmentMutation.mutateAsync({
        userId: USER_ID_PLACEHOLDER,
      });
    } catch (error) {
      if (error instanceof TRPCClientError) {
        setFeedback({ type: "error", message: error.message });
      }
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">戦略分析</h1>
        <p className="text-sm text-zinc-600">
          収集したデータを分析し、戦略的な提案を受けることができます
        </p>
      </header>

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

      <section className="space-y-6">
        {/* 総合分析 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">
            総合分析
          </h2>
          <form onSubmit={handleAnalyzeMarketPosition} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                所在地 *
              </label>
              <input
                required
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例：東京 新宿区"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeMarketData}
                  onChange={(e) => setIncludeMarketData(e.target.checked)}
                  className="size-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-700">
                  市場調査データを含める
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeSNSData}
                  onChange={(e) => setIncludeSNSData(e.target.checked)}
                  className="size-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-700">
                  SNS調査データを含める
                </span>
              </label>
            </div>
            <button
              type="submit"
              disabled={marketPositionMutation.isPending}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {marketPositionMutation.isPending
                ? "分析中..."
                : "総合分析を実行"}
            </button>
          </form>
        </div>

        {/* 個別分析機能 */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* 価格設定提案 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-base font-semibold text-zinc-900">
              価格設定提案
            </h3>
            <p className="mb-4 text-xs text-zinc-600">
              市場価格データと比較して、最適な価格設定を提案します
            </p>
            <button
              onClick={handleGeneratePriceRecommendations}
              disabled={priceRecommendationMutation.isPending}
              className="w-full rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {priceRecommendationMutation.isPending
                ? "生成中..."
                : "価格提案を生成"}
            </button>
            {priceRecommendationMutation.data && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-zinc-700">
                  結果を表示
                </summary>
                <div className="mt-2 whitespace-pre-wrap rounded bg-zinc-50 p-3 text-sm text-zinc-900">
                  {typeof priceRecommendationMutation.data.result === "string"
                    ? priceRecommendationMutation.data.result
                    : String(priceRecommendationMutation.data.result)}
                </div>
              </details>
            )}
          </div>

          {/* キャンペーン案生成 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-base font-semibold text-zinc-900">
              キャンペーン案生成
            </h3>
            <p className="mb-4 text-xs text-zinc-600">
              トレンドデータから効果的な月次キャンペーン案を2つ以上提案します
            </p>
            <button
              onClick={handleGenerateCampaigns}
              disabled={campaignMutation.isPending}
              className="w-full rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {campaignMutation.isPending ? "生成中..." : "キャンペーン案を生成"}
            </button>
            {campaignMutation.data && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-zinc-700">
                  結果を表示
                </summary>
                <div className="mt-2 whitespace-pre-wrap rounded bg-zinc-50 p-3 text-sm text-zinc-900">
                  {typeof campaignMutation.data.result === "string"
                    ? campaignMutation.data.result
                    : String(campaignMutation.data.result)}
                </div>
              </details>
            )}
          </div>

          {/* 新施術提案 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:col-span-2">
            <h3 className="mb-3 text-base font-semibold text-zinc-900">
              新施術導入提案
            </h3>
            <p className="mb-4 text-xs text-zinc-600">
              市場トレンドとSNSトレンドから、未導入の有望な施術を提案します
            </p>
            <button
              onClick={handleSuggestNewTreatments}
              disabled={newTreatmentMutation.isPending}
              className="w-full rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {newTreatmentMutation.isPending
                ? "生成中..."
                : "新施術提案を生成"}
            </button>
            {newTreatmentMutation.data && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-zinc-700">
                  結果を表示
                </summary>
                <div className="mt-2 whitespace-pre-wrap rounded bg-zinc-50 p-3 text-sm text-zinc-900">
                  {typeof newTreatmentMutation.data.result === "string"
                    ? newTreatmentMutation.data.result
                    : String(newTreatmentMutation.data.result)}
                </div>
              </details>
            )}
          </div>
        </div>
      </section>

      {/* 戦略提案履歴 */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          戦略提案履歴
        </h2>
        {strategiesQuery.isLoading && (
          <p className="text-sm text-zinc-500">読み込み中...</p>
        )}
        {strategiesQuery.error && (
          <p className="text-sm text-red-600">
            エラー: {strategiesQuery.error.message}
          </p>
        )}
        {strategiesQuery.data && strategiesQuery.data.length === 0 && (
          <p className="text-sm text-zinc-500">
            まだ戦略提案がありません
          </p>
        )}
        {strategiesQuery.data && strategiesQuery.data.length > 0 && (
          <div className="space-y-4">
            {strategiesQuery.data.map((strategy) => (
              <div
                key={strategy.id}
                className="rounded-lg border border-zinc-200 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-zinc-500">
                    {new Date(strategy.createdAt).toLocaleString("ja-JP")}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      strategy.implementationStatus === "completed"
                        ? "bg-green-100 text-green-700"
                        : strategy.implementationStatus === "in_progress"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {strategy.implementationStatus === "completed"
                      ? "完了"
                      : strategy.implementationStatus === "in_progress"
                        ? "進行中"
                        : "未着手"}
                  </span>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-zinc-700 hover:text-zinc-900">
                    提案内容を表示
                  </summary>
                  <div className="mt-3 space-y-3">
                    {strategy.priceRecommendations && (
                      <div>
                        <h4 className="text-sm font-medium text-zinc-700">
                          価格設定提案
                        </h4>
                        <div className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-zinc-50 p-3 text-sm text-zinc-900">
                          {strategy.priceRecommendations}
                        </div>
                      </div>
                    )}
                    {strategy.campaignProposals && (
                      <div>
                        <h4 className="text-sm font-medium text-zinc-700">
                          キャンペーン案
                        </h4>
                        <div className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-zinc-50 p-3 text-sm text-zinc-900">
                          {strategy.campaignProposals}
                        </div>
                      </div>
                    )}
                    {strategy.newTreatmentSuggestions && (
                      <div>
                        <h4 className="text-sm font-medium text-zinc-700">
                          新施術提案
                        </h4>
                        <div className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-zinc-50 p-3 text-sm text-zinc-900">
                          {strategy.newTreatmentSuggestions}
                        </div>
                      </div>
                    )}
                    {strategy.marketingStrategy && (
                      <div>
                        <h4 className="text-sm font-medium text-zinc-700">
                          マーケティング戦略
                        </h4>
                        <div className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-zinc-50 p-3 text-sm text-zinc-900">
                          {strategy.marketingStrategy}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default StrategyAnalysis;

