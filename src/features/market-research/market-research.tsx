"use client";

import { useState } from "react";

import { api } from "@/trpc/react";
import { TRPCClientError } from "@trpc/client";

type ResearchType = "trend_analysis" | "price_research" | "competitor_analysis";

const USER_ID_PLACEHOLDER = 1;

export function MarketResearch() {
  const [researchType, setResearchType] = useState<ResearchType | "">("");
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState(5);
  const [treatments, setTreatments] = useState<string[]>([]);
  const [treatmentInput, setTreatmentInput] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const utils = api.useUtils();

  const trendMutation = api.marketResearch.executeTrendAnalysis.useMutation({
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "トレンド分析が完了しました",
      });
      void utils.marketResearch.list.invalidate({
        userId: USER_ID_PLACEHOLDER,
      });
      setLocation("");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました。もう一度お試しください。";
      setFeedback({ 
        type: "error", 
        message
      });
    },
  });

  const priceMutation = api.marketResearch.executePriceResearch.useMutation({
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "価格調査が完了しました",
      });
      void utils.marketResearch.list.invalidate({
        userId: USER_ID_PLACEHOLDER,
      });
      setTreatments([]);
      setCities([]);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました。もう一度お試しください。";
      setFeedback({ 
        type: "error", 
        message
      });
    },
  });

  const competitorMutation =
    api.marketResearch.executeCompetitorAnalysis.useMutation({
      onSuccess: () => {
        setFeedback({
          type: "success",
          message: "競合調査が完了しました",
        });
        void utils.marketResearch.list.invalidate({
          userId: USER_ID_PLACEHOLDER,
        });
        setLocation("");
        setRadius(5);
      },
      onError: (error: unknown) => {
        const message = error instanceof Error ? error.message : "エラーが発生しました";
        setFeedback({ type: "error", message });
      },
    });

  const resultsQuery = api.marketResearch.list.useQuery({
    userId: USER_ID_PLACEHOLDER,
  }, {
    retry: 3,
    retryDelay: 1000,
    staleTime: 30000,
  });

  const handleAddTreatment = () => {
    if (treatmentInput.trim() && !treatments.includes(treatmentInput.trim())) {
      setTreatments([...treatments, treatmentInput.trim()]);
      setTreatmentInput("");
    }
  };

  const handleRemoveTreatment = (treatment: string) => {
    setTreatments(treatments.filter((t) => t !== treatment));
  };

  const handleAddCity = () => {
    if (cityInput.trim() && !cities.includes(cityInput.trim())) {
      setCities([...cities, cityInput.trim()]);
      setCityInput("");
    }
  };

  const handleRemoveCity = (city: string) => {
    setCities(cities.filter((c) => c !== city));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback({ type: null, message: "" });

    try {
      if (researchType === "trend_analysis") {
        if (!location.trim()) {
          setFeedback({
            type: "error",
            message: "場所を入力してください",
          });
          return;
        }
        await trendMutation.mutateAsync({
          userId: USER_ID_PLACEHOLDER,
          location: location.trim(),
        });
      } else if (researchType === "price_research") {
        if (treatments.length === 0) {
          setFeedback({
            type: "error",
            message: "少なくとも1つの施術を追加してください",
          });
          return;
        }
        if (cities.length === 0) {
          setFeedback({
            type: "error",
            message: "少なくとも1つの都市を追加してください",
          });
          return;
        }
        await priceMutation.mutateAsync({
          userId: USER_ID_PLACEHOLDER,
          treatments,
          cities,
        });
      } else if (researchType === "competitor_analysis") {
        if (!location.trim()) {
          setFeedback({
            type: "error",
            message: "場所を入力してください",
          });
          return;
        }
        await competitorMutation.mutateAsync({
          userId: USER_ID_PLACEHOLDER,
          location: location.trim(),
          radius,
        });
      }
    } catch (error) {
      if (error instanceof TRPCClientError) {
        setFeedback({ type: "error", message: error.message });
      }
    }
  };

  const getResearchTypeLabel = (type: string) => {
    switch (type) {
      case "trend_analysis":
        return "トレンド分析";
      case "price_research":
        return "価格調査";
      case "competitor_analysis":
        return "競合調査";
      default:
        return type;
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">市場調査</h1>
        <p className="text-sm text-zinc-600">
          市場動向、価格情報、競合情報を自動収集します
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              調査タイプ *
            </label>
            <select
              required
              value={researchType}
              onChange={(e) =>
                setResearchType(e.target.value as ResearchType | "")
              }
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">選択してください</option>
              <option value="trend_analysis">トレンド分析</option>
              <option value="price_research">価格調査</option>
              <option value="competitor_analysis">競合調査</option>
            </select>
          </div>

          {researchType === "trend_analysis" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                調査対象地域 *
              </label>
              <input
                required
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例：東京、大阪、名古屋"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          )}

          {researchType === "price_research" && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  調査対象施術 *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={treatmentInput}
                    onChange={(e) => setTreatmentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTreatment();
                      }
                    }}
                    placeholder="例：ダーマペン4"
                    className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <button
                    type="button"
                    onClick={handleAddTreatment}
                    className="rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200"
                  >
                    追加
                  </button>
                </div>
                {treatments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {treatments.map((treatment) => (
                      <span
                        key={treatment}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
                      >
                        {treatment}
                        <button
                          type="button"
                          onClick={() => handleRemoveTreatment(treatment)}
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
                  調査対象都市 *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCity();
                      }
                    }}
                    placeholder="例：東京、大阪、名古屋"
                    className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <button
                    type="button"
                    onClick={handleAddCity}
                    className="rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200"
                  >
                    追加
                  </button>
                </div>
                {cities.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {cities.map((city) => (
                      <span
                        key={city}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
                      >
                        {city}
                        <button
                          type="button"
                          onClick={() => handleRemoveCity(city)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {researchType === "competitor_analysis" && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  調査対象地域 *
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
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  調査半径 (km)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={radius}
                  onChange={(e) => setRadius(Number.parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </>
          )}

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
              trendMutation.isPending ||
              priceMutation.isPending ||
              competitorMutation.isPending
            }
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {trendMutation.isPending ||
            priceMutation.isPending ||
            competitorMutation.isPending
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
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {getResearchTypeLabel(result.researchType)}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {result.location}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {new Date(result.createdAt).toLocaleString("ja-JP")}
                      </span>
                    </div>
                    {result.processedData && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium text-zinc-700 hover:text-zinc-900">
                          結果を表示
                        </summary>
                        <div className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-zinc-50 p-3 text-sm text-zinc-900">
                          {result.processedData}
                        </div>
                      </details>
                    )}
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

export default MarketResearch;

