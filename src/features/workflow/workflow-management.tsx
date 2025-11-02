"use client";

import { useState } from "react";

import { api } from "@/trpc/react";
import { TRPCClientError } from "@trpc/client";

const USER_ID_PLACEHOLDER = 1;

export function WorkflowManagement() {
  const [location, setLocation] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const utils = api.useUtils();

  const healthCheckQuery = api.workflow.checkAIHealth.useQuery(undefined, {
    refetchInterval: 30000, // 30秒ごとに更新
  });

  const workflowMutation = api.workflow.executeFullAnalysis.useMutation({
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "ワークフローが開始されました",
      });
      void utils.workflow.list.invalidate({ userId: USER_ID_PLACEHOLDER });
      setLocation("");
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error.message });
    },
  });

  const workflowsQuery = api.workflow.list.useQuery({
    userId: USER_ID_PLACEHOLDER,
  });

  const handleExecuteWorkflow = async (
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
      await workflowMutation.mutateAsync({
        userId: USER_ID_PLACEHOLDER,
        location: location.trim(),
      });
    } catch (error) {
      if (error instanceof TRPCClientError) {
        setFeedback({ type: "error", message: error.message });
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "running":
        return "bg-yellow-100 text-yellow-700";
      case "failed":
        return "bg-red-100 text-red-700";
      default:
        return "bg-zinc-100 text-zinc-500";
    }
  };

  const getAIStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-700";
      case "unhealthy":
        return "bg-red-100 text-red-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">ワークフロー管理</h1>
        <p className="text-sm text-zinc-600">
          AIエージェント間の協調動作を管理し、統合ワークフローを実行します
        </p>
      </header>

      {/* AIヘルスチェック */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          AIエージェント状態
        </h2>
        {healthCheckQuery.isLoading && (
          <p className="text-sm text-zinc-500">確認中...</p>
        )}
        {healthCheckQuery.error && (
          <p className="text-sm text-red-600">
            エラー: {healthCheckQuery.error.message}
          </p>
        )}
        {healthCheckQuery.data && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {healthCheckQuery.data.map((status) => (
              <div
                key={status.agent}
                className="rounded-lg border border-zinc-200 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-700">
                    {status.agent.toUpperCase()}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${getAIStatusColor(status.status)}`}
                  >
                    {status.status === "healthy"
                      ? "正常"
                      : status.status === "unhealthy"
                        ? "異常"
                        : "不明"}
                  </span>
                </div>
                {status.error && (
                  <p className="text-xs text-red-600">{status.error}</p>
                )}
                <p className="text-xs text-zinc-500">
                  最終確認:{" "}
                  {new Date(status.lastChecked).toLocaleTimeString("ja-JP")}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ワークフロー実行 */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          統合分析ワークフローの実行
        </h2>
        <form className="space-y-4" onSubmit={handleExecuteWorkflow}>
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
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-xs text-blue-700">
              <strong>ワークフロー内容:</strong>
              <br />
              1. 市場調査（トレンド分析・価格調査）
              <br />
              2. SNS調査（Twitter・Instagram）
              <br />
              3. 総合分析
            </p>
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
            disabled={workflowMutation.isPending}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {workflowMutation.isPending
              ? "実行中..."
              : "ワークフローを実行"}
          </button>
        </form>
      </section>

      {/* ワークフロー履歴 */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          ワークフロー実行履歴
        </h2>
        {workflowsQuery.isLoading && (
          <p className="text-sm text-zinc-500">読み込み中...</p>
        )}
        {workflowsQuery.error && (
          <p className="text-sm text-red-600">
            エラー: {workflowsQuery.error.message}
          </p>
        )}
        {workflowsQuery.data && workflowsQuery.data.length === 0 && (
          <p className="text-sm text-zinc-500">
            まだワークフロー実行がありません
          </p>
        )}
        {workflowsQuery.data && workflowsQuery.data.length > 0 && (
          <div className="space-y-4">
            {workflowsQuery.data.map((workflow) => (
              <div
                key={workflow.id}
                className="rounded-lg border border-zinc-200 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-zinc-900">
                      {workflow.workflowType}
                    </span>
                    <span className="ml-2 text-xs text-zinc-500">
                      {new Date(workflow.startedAt).toLocaleString("ja-JP")}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(workflow.status)}`}
                  >
                    {workflow.status === "completed"
                      ? "完了"
                      : workflow.status === "running"
                        ? "実行中"
                        : "失敗"}
                  </span>
                </div>
                {Array.isArray(workflow.steps) && (
                  <div className="mt-3 space-y-2">
                    {workflow.steps.map((step: unknown) => {
                      if (
                        typeof step === "object" &&
                        step !== null &&
                        "name" in step &&
                        "status" in step
                      ) {
                        const stepObj = step as {
                          name: string;
                          status: string;
                          aiAgent?: string;
                        };
                        return (
                          <div
                            key={stepObj.name}
                            className="flex items-center justify-between rounded bg-zinc-50 px-3 py-2 text-xs"
                          >
                            <span className="text-zinc-700">
                              {stepObj.name}
                              {stepObj.aiAgent && (
                                <span className="ml-2 text-zinc-500">
                                  ({stepObj.aiAgent})
                                </span>
                              )}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor(stepObj.status)}`}
                            >
                              {stepObj.status}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
                {workflow.errorMessage && (
                  <p className="mt-2 text-xs text-red-600">
                    エラー: {workflow.errorMessage}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default WorkflowManagement;

