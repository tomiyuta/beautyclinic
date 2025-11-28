"use client";

import { useState } from "react";
import Button from "@atlaskit/button";
import TextField from "@atlaskit/textfield";
import Banner from "@atlaskit/banner";
import Badge from "@atlaskit/badge";
import Spinner from "@atlaskit/spinner";
import EmptyState from "@atlaskit/empty-state";
import { api } from "@/trpc/react";
import { TRPCClientError } from "@trpc/client";
import { USER_ID_PLACEHOLDER } from "@/lib/constants";

interface WorkflowStep {
  id: string;
  name: string;
  status: string;
  aiAgent?: string;
  result?: unknown;
  error?: string;
}

export function WorkflowManagement() {
  const [location, setLocation] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const utils = api.useUtils();

  const healthCheckQuery = api.workflow.checkAIHealth.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const workflowMutation = api.workflow.executeFullAnalysis.useMutation({
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "ワークフローが開始されました",
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      void utils.workflow.list.invalidate({ userId: USER_ID_PLACEHOLDER });
      setLocation("");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      setFeedback({ type: "error", message });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
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
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
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
        setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      }
    }
  };

  const getStatusBadgeAppearance = (status: string) => {
    switch (status) {
      case "completed":
        return "added";
      case "running":
        return "default";
      case "failed":
        return "removed";
      default:
        return "removed";
    }
  };

  const getAIStatusBadgeAppearance = (status: string) => {
    switch (status) {
      case "healthy":
        return "added";
      case "unhealthy":
        return "removed";
      default:
        return "default";
    }
  };

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const formatResult = (result: unknown): string => {
    if (result === null || result === undefined) {
      return "結果なし";
    }
    if (typeof result === "string") {
      return result;
    }
    if (typeof result === "object") {
      try {
        return JSON.stringify(result, null, 2);
      } catch {
        return String(result);
      }
    }
    return String(result);
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "48px 16px" }}>
      <header style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px", color: "#172B4D" }}>
          ワークフロー管理
        </h1>
        <p style={{ fontSize: "14px", color: "#6B778C" }}>
          AIエージェント間の協調動作を管理し、統合ワークフローを実行します
        </p>
      </header>

      {/* AIヘルスチェック */}
      <section style={{ marginBottom: "32px", padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
          AIエージェント状態
        </h2>
        {healthCheckQuery.isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "16px" }}>
            <Spinner size="small" />
            <span style={{ fontSize: "14px", color: "#6B778C" }}>確認中...</span>
          </div>
        )}
        {healthCheckQuery.error && (
          <Banner appearance="error">
            エラー: {healthCheckQuery.error.message}
          </Banner>
        )}
        {healthCheckQuery.data && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            {healthCheckQuery.data.map((status: any) => (
              <div
                key={status.agent}
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #DFE1E6" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                    {status.agent.toUpperCase()}
                  </span>
                  <Badge appearance={getAIStatusBadgeAppearance(status.status)}>
                    {status.status === "healthy"
                      ? "正常"
                      : status.status === "unhealthy"
                        ? "異常"
                        : "不明"}
                  </Badge>
                </div>
                {status.error && (
                  <p style={{ fontSize: "12px", color: "#DE350B", marginBottom: "4px" }}>{status.error}</p>
                )}
                <p style={{ fontSize: "12px", color: "#6B778C" }}>
                  最終確認:{" "}
                  {new Date(status.lastChecked).toLocaleTimeString("ja-JP")}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ワークフロー実行 */}
      <section style={{ marginBottom: "32px", padding: "32px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
          統合分析ワークフローの実行
        </h2>
        <form onSubmit={handleExecuteWorkflow} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
              所在地 *
            </label>
            <TextField
              isRequired
              type="text"
              value={location}
              onChange={(e) => setLocation((e.target as HTMLInputElement).value)}
              placeholder="例：東京 新宿区"
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ padding: "16px", borderRadius: "8px", background: "#E3FCEF" }}>
            <p style={{ fontSize: "12px", color: "#006644", margin: 0 }}>
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
            <div>
              <Banner appearance={feedback.type === "success" ? "announcement" : "error"}>
                {feedback.message}
              </Banner>
            </div>
          )}
          <Button
            type="submit"
            appearance="primary"
            isDisabled={workflowMutation.isPending}
          >
            {workflowMutation.isPending
              ? "実行中..."
              : "ワークフローを実行"}
          </Button>
        </form>
      </section>

      {/* ワークフロー履歴 */}
      <section style={{ padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
          ワークフロー実行履歴
        </h2>
        {workflowsQuery.isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "16px" }}>
            <Spinner size="small" />
            <span style={{ fontSize: "14px", color: "#6B778C" }}>読み込み中...</span>
          </div>
        )}
        {workflowsQuery.error && (
          <Banner appearance="error">
            エラー: {workflowsQuery.error.message}
          </Banner>
        )}
        {workflowsQuery.data && workflowsQuery.data.length === 0 && (
          <EmptyState
            header="まだワークフロー実行がありません"
            description="上記のフォームからワークフローを実行してください"
          />
        )}
        {workflowsQuery.data && workflowsQuery.data.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {workflowsQuery.data.map((workflow: any) => (
              <div
                key={workflow.id}
                style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#172B4D" }}>
                      {workflow.workflowType}
                    </span>
                    <span style={{ marginLeft: "8px", fontSize: "12px", color: "#6B778C" }}>
                      {new Date(workflow.startedAt).toLocaleString("ja-JP")}
                    </span>
                  </div>
                  <Badge appearance={getStatusBadgeAppearance(workflow.status)}>
                    {workflow.status === "completed"
                      ? "完了"
                      : workflow.status === "running"
                        ? "実行中"
                        : "失敗"}
                  </Badge>
                </div>
                {Array.isArray(workflow.steps) && (
                  <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {workflow.steps.map((step: unknown) => {
                      if (
                        typeof step === "object" &&
                        step !== null &&
                        "name" in step &&
                        "status" in step
                      ) {
                        const stepObj = step as WorkflowStep;
                        const stepId = `${workflow.id}-${stepObj.id || stepObj.name}`;
                        const isExpanded = expandedSteps.has(stepId);
                        const hasResult = stepObj.result !== undefined && stepObj.result !== null;
                        const hasError = stepObj.error !== undefined && stepObj.error !== null;

                        return (
                          <div
                            key={stepId}
                            style={{ borderRadius: "4px", border: "1px solid #DFE1E6", overflow: "hidden" }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "8px 12px",
                                background: "#F4F5F7",
                                cursor: hasResult || hasError ? "pointer" : "default",
                              }}
                              onClick={() => {
                                if (hasResult || hasError) {
                                  toggleStepExpansion(stepId);
                                }
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                                <span style={{ fontSize: "12px", color: "#42526E", fontWeight: 500 }}>
                                  {stepObj.name}
                                </span>
                                {stepObj.aiAgent && (
                                  <Badge appearance="default">
                                    {stepObj.aiAgent}
                                  </Badge>
                                )}
                                {(hasResult || hasError) && (
                                  <span style={{ fontSize: "10px", color: "#6B778C" }}>
                                    {isExpanded ? "▼" : "▶"}
                                  </span>
                                )}
                              </div>
                              <Badge appearance={getStatusBadgeAppearance(stepObj.status)}>
                                {stepObj.status === "completed"
                                  ? "完了"
                                  : stepObj.status === "running"
                                    ? "実行中"
                                    : stepObj.status === "failed"
                                      ? "失敗"
                                      : stepObj.status}
                              </Badge>
                            </div>
                            {isExpanded && (
                              <div style={{ padding: "12px", background: "#FFFFFF", borderTop: "1px solid #DFE1E6" }}>
                                {hasError && (
                                  <div style={{ marginBottom: "8px" }}>
                                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#DE350B", marginBottom: "4px" }}>
                                      エラー:
                                    </p>
                                    <pre style={{
                                      fontSize: "11px",
                                      color: "#DE350B",
                                      background: "#FFF4F4",
                                      padding: "8px",
                                      borderRadius: "4px",
                                      margin: 0,
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                    }}>
                                      {stepObj.error}
                                    </pre>
                                  </div>
                                )}
                                {hasResult && (
                                  <div>
                                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#172B4D", marginBottom: "4px" }}>
                                      実行結果:
                                    </p>
                                    <pre style={{
                                      fontSize: "11px",
                                      color: "#42526E",
                                      background: "#F4F5F7",
                                      padding: "8px",
                                      borderRadius: "4px",
                                      margin: 0,
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                      maxHeight: "300px",
                                      overflow: "auto",
                                    }}>
                                      {formatResult(stepObj.result)}
                                    </pre>
                                  </div>
                                )}
                                {!hasResult && !hasError && (
                                  <p style={{ fontSize: "12px", color: "#6B778C", fontStyle: "italic" }}>
                                    結果データがありません
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
                {workflow.results && Object.keys(workflow.results).length > 0 && (
                  <div style={{ marginTop: "16px", padding: "12px", borderRadius: "4px", background: "#E3FCEF", border: "1px solid #B3D9C7" }}>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#006644", marginBottom: "8px" }}>
                      ワークフロー全体の結果:
                    </p>
                    <pre style={{
                      fontSize: "11px",
                      color: "#006644",
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      maxHeight: "200px",
                      overflow: "auto",
                    }}>
                      {JSON.stringify(workflow.results, null, 2)}
                    </pre>
                  </div>
                )}
                {workflow.errorMessage && (
                  <p style={{ marginTop: "8px", fontSize: "12px", color: "#DE350B" }}>
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
