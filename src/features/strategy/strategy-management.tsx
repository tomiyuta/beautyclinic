"use client";

import { useState } from "react";

import { api } from "@/trpc/react";
import { TRPCClientError } from "@trpc/client";

const USER_ID_PLACEHOLDER = 1;

export function StrategyManagement() {
  const [selectedStrategyId, setSelectedStrategyId] = useState<number | null>(
    null,
  );
  const [feedback, setFeedback] = useState("");
  const [implementationStatus, setImplementationStatus] = useState<
    "pending" | "in_progress" | "completed"
  >("pending");
  const [exportFormat, setExportFormat] = useState<
    "json" | "text" | "pdf" | "excel"
  >("json");
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const strategiesQuery = api.strategyManagement.getHistory.useQuery({
    userId: USER_ID_PLACEHOLDER,
  });

  const updateFeedbackMutation =
    api.strategyManagement.updateFeedback.useMutation({
      onSuccess: () => {
        setFeedbackMessage({
          type: "success",
          message: "フィードバックが保存されました",
        });
        void strategiesQuery.refetch();
        setFeedback("");
        setSelectedStrategyId(null);
      },
      onError: (error) => {
        setFeedbackMessage({ type: "error", message: error.message });
      },
    });

  const exportQuery = api.strategyManagement.exportStrategy.useQuery(
    {
      id: selectedStrategyId!,
      userId: USER_ID_PLACEHOLDER,
      format: exportFormat,
    },
    {
      enabled: false,
      refetchOnMount: false,
    },
  );

  const handleExport = async () => {
    if (!selectedStrategyId) {
      setFeedbackMessage({
        type: "error",
        message: "エクスポートする戦略を選択してください",
      });
      return;
    }

    try {
      const result = await exportQuery.refetch();
      if (result.data) {
        let blob: Blob;
        let filename: string;

        if (result.data.format === "json") {
          blob = new Blob([typeof result.data.content === "string" ? result.data.content : String(result.data.content)], {
            type: "application/json",
          });
          filename = `strategy-${selectedStrategyId}.json`;
        } else if (result.data.format === "text") {
          blob = new Blob([result.data.content as string], {
            type: "text/plain",
          });
          filename = `strategy-${selectedStrategyId}.txt`;
        } else if (result.data.format === "pdf") {
          const base64Content = result.data.content as string;
          const binaryString = atob(base64Content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          blob = new Blob([bytes], {
            type: result.data.mimeType || "application/pdf",
          });
          filename = `strategy-${selectedStrategyId}.pdf`;
        } else if (result.data.format === "excel") {
          const base64Content = result.data.content as string;
          const binaryString = atob(base64Content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          blob = new Blob([bytes], {
            type:
              result.data.mimeType ||
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
          filename = `strategy-${selectedStrategyId}.xlsx`;
        } else {
          throw new Error("不明な形式です");
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setFeedbackMessage({
          type: "success",
          message: "エクスポートが完了しました",
        });
      }
    } catch (error) {
      if (error instanceof TRPCClientError) {
        setFeedbackMessage({ type: "error", message: error.message });
      } else {
        setFeedbackMessage({
          type: "error",
          message: "エクスポートに失敗しました",
        });
      }
    }
  };

  const handleSubmitFeedback = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (!selectedStrategyId) {
      setFeedbackMessage({
        type: "error",
        message: "戦略を選択してください",
      });
      return;
    }

    if (!feedback.trim()) {
      setFeedbackMessage({
        type: "error",
        message: "フィードバックを入力してください",
      });
      return;
    }

    try {
      await updateFeedbackMutation.mutateAsync({
        id: selectedStrategyId,
        userId: USER_ID_PLACEHOLDER,
        feedback: feedback.trim(),
        implementationStatus,
      });
    } catch (error) {
      if (error instanceof TRPCClientError) {
        setFeedbackMessage({ type: "error", message: error.message });
      }
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">戦略管理</h1>
        <p className="text-sm text-zinc-600">
          戦略提案の履歴を管理し、フィードバックを記録できます
        </p>
      </header>

      {feedbackMessage.type && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            feedbackMessage.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {feedbackMessage.message}
        </div>
      )}

      {/* エクスポート */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          戦略書のエクスポート
        </h2>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              戦略を選択
            </label>
            <select
              value={selectedStrategyId || ""}
              onChange={(e) =>
                setSelectedStrategyId(
                  e.target.value ? Number.parseInt(e.target.value, 10) : null,
                )
              }
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">選択してください</option>
              {strategiesQuery.data?.map((strategy) => (
                <option key={strategy.id} value={strategy.id}>
                  {new Date(strategy.createdAt).toLocaleString("ja-JP")} -{" "}
                  {strategy.implementationStatus}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              出力形式
            </label>
            <select
              value={exportFormat}
              onChange={(e) =>
                setExportFormat(
                  e.target.value as "json" | "text" | "pdf" | "excel",
                )
              }
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="json">JSON</option>
              <option value="text">テキスト</option>
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
            </select>
          </div>
          <button
            onClick={handleExport}
            disabled={!selectedStrategyId}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            エクスポート
          </button>
        </div>
      </section>

      {/* フィードバック */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          フィードバックの登録
        </h2>
        <form className="space-y-4" onSubmit={handleSubmitFeedback}>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              戦略を選択 *
            </label>
            <select
              required
              value={selectedStrategyId || ""}
              onChange={(e) =>
                setSelectedStrategyId(
                  e.target.value ? Number.parseInt(e.target.value, 10) : null,
                )
              }
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">選択してください</option>
              {strategiesQuery.data?.map((strategy) => (
                <option key={strategy.id} value={strategy.id}>
                  {new Date(strategy.createdAt).toLocaleString("ja-JP")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              フィードバック *
            </label>
            <textarea
              required
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="戦略提案に対するフィードバックを入力してください"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              実装ステータス
            </label>
            <select
              value={implementationStatus}
              onChange={(e) =>
                setImplementationStatus(
                  e.target.value as "pending" | "in_progress" | "completed",
                )
              }
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="pending">未着手</option>
              <option value="in_progress">進行中</option>
              <option value="completed">完了</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={updateFeedbackMutation.isPending}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updateFeedbackMutation.isPending
              ? "保存中..."
              : "フィードバックを保存"}
          </button>
        </form>
      </section>

      {/* 戦略履歴 */}
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
                  <div>
                    <span className="text-sm font-semibold text-zinc-900">
                      戦略提案 #{strategy.id}
                    </span>
                    <span className="ml-2 text-xs text-zinc-500">
                      {new Date(strategy.createdAt).toLocaleString("ja-JP")}
                    </span>
                  </div>
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
                {"summary" in strategy && strategy.summary && (
                  <div className="mb-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                      価格提案: {strategy.summary.priceRecommendationsCount}件
                    </span>
                    <span className="rounded-full bg-purple-50 px-2 py-1 text-purple-700">
                      キャンペーン案: {strategy.summary.campaignProposalsCount}件
                    </span>
                    <span className="rounded-full bg-green-50 px-2 py-1 text-green-700">
                      新施術提案: {strategy.summary.newTreatmentSuggestionsCount}件
                    </span>
                    <span className="rounded-full bg-orange-50 px-2 py-1 text-orange-700">
                      生成コンテンツ: {strategy.summary.totalContents}件
                    </span>
                  </div>
                )}
                {strategy.userFeedback && (
                  <div className="mt-2 rounded bg-zinc-50 p-2">
                    <p className="text-xs font-medium text-zinc-700">
                      フィードバック:
                    </p>
                    <p className="text-xs text-zinc-600">
                      {strategy.userFeedback}
                    </p>
                  </div>
                )}
                {"relatedContents" in strategy &&
                  Array.isArray(strategy.relatedContents) &&
                  strategy.relatedContents.length > 0 && (
                    <div className="mt-2 rounded bg-blue-50 p-2">
                      <p className="text-xs font-medium text-blue-700 mb-1">
                        関連生成コンテンツ ({strategy.relatedContents.length}件):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {strategy.relatedContents.map((content: {
                          id: number;
                          contentType: string;
                          title: string;
                          status: string;
                        }) => (
                          <span
                            key={content.id}
                            className="rounded bg-white px-2 py-0.5 text-xs text-blue-600"
                          >
                            {content.contentType === "instagram_lp"
                              ? "LP"
                              : content.contentType === "website_article"
                                ? "記事"
                                : "コピー"}
                            : {content.title.substring(0, 20)}
                            {content.title.length > 20 ? "..." : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-zinc-700 hover:text-zinc-900">
                    詳細を表示
                  </summary>
                  <div className="mt-2 space-y-2 text-xs">
                    {strategy.priceRecommendations && (
                      <div>
                        <strong>価格設定提案:</strong>
                        <div className="mt-1 whitespace-pre-wrap rounded bg-zinc-50 p-2 text-xs text-zinc-900">
                          {strategy.priceRecommendations}
                        </div>
                      </div>
                    )}
                    {strategy.campaignProposals && (
                      <div>
                        <strong>キャンペーン案:</strong>
                        <div className="mt-1 whitespace-pre-wrap rounded bg-zinc-50 p-2 text-xs text-zinc-900">
                          {strategy.campaignProposals}
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

export default StrategyManagement;

