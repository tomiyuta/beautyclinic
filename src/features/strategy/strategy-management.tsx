"use client";

import { useState } from "react";
import Button from "@atlaskit/button";
import Textarea from "@atlaskit/textarea";
import Select from "@atlaskit/select";
import Banner from "@atlaskit/banner";
import Badge from "@atlaskit/badge";
import Spinner from "@atlaskit/spinner";
import EmptyState from "@atlaskit/empty-state";
import { api } from "@/trpc/react";
import { TRPCClientError } from "@trpc/client";
import { USER_ID_PLACEHOLDER } from "@/lib/constants";

const exportFormatOptions = [
  { label: "JSON", value: "json" },
  { label: "テキスト", value: "text" },
  { label: "PDF", value: "pdf" },
  { label: "Excel", value: "excel" },
];

const implementationStatusOptions = [
  { label: "未着手", value: "pending" },
  { label: "進行中", value: "in_progress" },
  { label: "完了", value: "completed" },
];

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
        setTimeout(() => setFeedbackMessage({ type: null, message: "" }), 5000);
        void strategiesQuery.refetch();
        setFeedback("");
        setSelectedStrategyId(null);
      },
      onError: (error: unknown) => {
        const message = error instanceof Error ? error.message : "エラーが発生しました";
        setFeedbackMessage({ type: "error", message });
        setTimeout(() => setFeedbackMessage({ type: null, message: "" }), 5000);
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
      setTimeout(() => setFeedbackMessage({ type: null, message: "" }), 5000);
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
        setTimeout(() => setFeedbackMessage({ type: null, message: "" }), 5000);
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
      setTimeout(() => setFeedbackMessage({ type: null, message: "" }), 5000);
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
      setTimeout(() => setFeedbackMessage({ type: null, message: "" }), 5000);
      return;
    }

    if (!feedback.trim()) {
      setFeedbackMessage({
        type: "error",
        message: "フィードバックを入力してください",
      });
      setTimeout(() => setFeedbackMessage({ type: null, message: "" }), 5000);
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
        setTimeout(() => setFeedbackMessage({ type: null, message: "" }), 5000);
      }
    }
  };

  const strategyOptions = strategiesQuery.data?.map((strategy) => ({
    label: `${new Date(strategy.createdAt).toLocaleString("ja-JP")} - ${strategy.implementationStatus}`,
    value: strategy.id.toString(),
  })) || [];

  const feedbackStrategyOptions = strategiesQuery.data?.map((strategy) => ({
    label: new Date(strategy.createdAt).toLocaleString("ja-JP"),
    value: strategy.id.toString(),
  })) || [];

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "48px 16px" }}>
      <header style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px", color: "#172B4D" }}>
          戦略管理
        </h1>
        <p style={{ fontSize: "14px", color: "#6B778C" }}>
          戦略提案の履歴を管理し、フィードバックを記録できます
        </p>
      </header>

      {feedbackMessage.type && (
        <div style={{ marginBottom: "16px" }}>
          <Banner appearance={feedbackMessage.type === "success" ? "announcement" : "error"}>
            {feedbackMessage.message}
          </Banner>
        </div>
      )}

      {/* エクスポート */}
      <section style={{ marginBottom: "32px", padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
          戦略書のエクスポート
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
              戦略を選択
            </label>
            <Select
              options={strategyOptions}
              value={selectedStrategyId ? strategyOptions.find(opt => opt.value === selectedStrategyId.toString()) : null}
              onChange={(option) =>
                setSelectedStrategyId(
                  option?.value ? Number.parseInt(option.value, 10) : null,
                )
              }
              placeholder="選択してください"
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
              出力形式
            </label>
            <Select
              options={exportFormatOptions}
              value={exportFormatOptions.find(opt => opt.value === exportFormat)}
              onChange={(option) =>
                setExportFormat(
                  (option?.value as typeof exportFormat) || "json",
                )
              }
            />
          </div>
          <Button
            onClick={handleExport}
            isDisabled={!selectedStrategyId}
            appearance="primary"
          >
            エクスポート
          </Button>
        </div>
      </section>

      {/* フィードバック */}
      <section style={{ marginBottom: "32px", padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
          フィードバックの登録
        </h2>
        <form onSubmit={handleSubmitFeedback} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
              戦略を選択 *
            </label>
            <Select
              isRequired
              options={feedbackStrategyOptions}
              value={selectedStrategyId ? feedbackStrategyOptions.find(opt => opt.value === selectedStrategyId.toString()) : null}
              onChange={(option) =>
                setSelectedStrategyId(
                  option?.value ? Number.parseInt(option.value, 10) : null,
                )
              }
              placeholder="選択してください"
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
              フィードバック *
            </label>
            <Textarea
              isRequired
              value={feedback}
              onChange={(e) => setFeedback((e.target as HTMLTextAreaElement).value)}
              placeholder="戦略提案に対するフィードバックを入力してください"
              minimumRows={4}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
              実装ステータス
            </label>
            <Select
              options={implementationStatusOptions}
              value={implementationStatusOptions.find(opt => opt.value === implementationStatus)}
              onChange={(option) =>
                setImplementationStatus(
                  (option?.value as typeof implementationStatus) || "pending",
                )
              }
            />
          </div>
          <Button
            type="submit"
            appearance="primary"
            isDisabled={updateFeedbackMutation.isPending}
          >
            {updateFeedbackMutation.isPending
              ? "保存中..."
              : "フィードバックを保存"}
          </Button>
        </form>
      </section>

      {/* 戦略履歴 */}
      <section style={{ padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
          戦略提案履歴
        </h2>
        {strategiesQuery.isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "16px" }}>
            <Spinner size="small" />
            <span style={{ fontSize: "14px", color: "#6B778C" }}>読み込み中...</span>
          </div>
        )}
        {strategiesQuery.error && (
          <Banner appearance="error">
            エラー: {strategiesQuery.error.message}
          </Banner>
        )}
        {strategiesQuery.data && strategiesQuery.data.length === 0 && (
          <EmptyState
            header="まだ戦略提案がありません"
            description="戦略分析を実行すると、ここに履歴が表示されます"
          />
        )}
        {strategiesQuery.data && strategiesQuery.data.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {strategiesQuery.data.map((strategy) => (
              <div
                key={strategy.id}
                style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#172B4D" }}>
                      戦略提案 #{strategy.id}
                    </span>
                    <span style={{ marginLeft: "8px", fontSize: "12px", color: "#6B778C" }}>
                      {new Date(strategy.createdAt).toLocaleString("ja-JP")}
                    </span>
                  </div>
                  <Badge appearance={strategy.implementationStatus === "completed" ? "added" : strategy.implementationStatus === "in_progress" ? "default" : "removed"}>
                    {strategy.implementationStatus === "completed"
                      ? "完了"
                      : strategy.implementationStatus === "in_progress"
                        ? "進行中"
                        : "未着手"}
                  </Badge>
                </div>
                {"summary" in strategy && strategy.summary && (
                  <div style={{ marginBottom: "8px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    <Badge appearance="added">価格提案: {strategy.summary.priceRecommendationsCount}件</Badge>
                    <Badge appearance="default">キャンペーン案: {strategy.summary.campaignProposalsCount}件</Badge>
                    <Badge appearance="added">新施術提案: {strategy.summary.newTreatmentSuggestionsCount}件</Badge>
                    <Badge appearance="default">生成コンテンツ: {strategy.summary.totalContents}件</Badge>
                  </div>
                )}
                {strategy.userFeedback && (
                  <div style={{ marginTop: "8px", padding: "8px", borderRadius: "4px", background: "#F4F5F7" }}>
                    <p style={{ fontSize: "12px", fontWeight: 500, color: "#42526E", marginBottom: "4px" }}>
                      フィードバック:
                    </p>
                    <p style={{ fontSize: "12px", color: "#6B778C" }}>
                      {strategy.userFeedback}
                    </p>
                  </div>
                )}
                {"relatedContents" in strategy &&
                  Array.isArray(strategy.relatedContents) &&
                  strategy.relatedContents.length > 0 && (
                    <div style={{ marginTop: "8px", padding: "8px", borderRadius: "4px", background: "#E3FCEF" }}>
                      <p style={{ fontSize: "12px", fontWeight: 500, color: "#006644", marginBottom: "4px" }}>
                        関連生成コンテンツ ({strategy.relatedContents.length}件):
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {strategy.relatedContents.map((content: {
                          id: number;
                          contentType: string;
                          title: string;
                          status: string;
                        }) => (
                          <Badge key={content.id} appearance="added">
                            {content.contentType === "instagram_lp"
                              ? "LP"
                              : content.contentType === "website_article"
                                ? "記事"
                                : "コピー"}
                            : {content.title.substring(0, 20)}
                            {content.title.length > 20 ? "..." : ""}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                <details style={{ marginTop: "8px" }}>
                  <summary style={{ cursor: "pointer", fontSize: "14px", fontWeight: 500, color: "#42526E", listStyle: "none" }}>
                    詳細を表示
                  </summary>
                  <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {strategy.priceRecommendations && (
                      <div>
                        <strong style={{ fontSize: "12px", color: "#172B4D" }}>価格設定提案:</strong>
                        <div style={{ marginTop: "4px", whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "8px", fontSize: "12px", color: "#172B4D" }}>
                          {strategy.priceRecommendations}
                        </div>
                      </div>
                    )}
                    {strategy.campaignProposals && (
                      <div>
                        <strong style={{ fontSize: "12px", color: "#172B4D" }}>キャンペーン案:</strong>
                        <div style={{ marginTop: "4px", whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "8px", fontSize: "12px", color: "#172B4D" }}>
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
