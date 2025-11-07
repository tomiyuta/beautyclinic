"use client";

import { useState } from "react";
import Button from "@atlaskit/button";
import TextField from "@atlaskit/textfield";
import Checkbox from "@atlaskit/checkbox";
import Banner from "@atlaskit/banner";
import Badge from "@atlaskit/badge";
import Spinner from "@atlaskit/spinner";
import EmptyState from "@atlaskit/empty-state";
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
        setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
        void utils.strategy.list.invalidate({ userId: USER_ID_PLACEHOLDER });
        setLocation("");
      },
      onError: (error: unknown) => {
        const message = error instanceof Error ? error.message : "エラーが発生しました。もう一度お試しください。";
        setFeedback({ 
          type: "error", 
          message
        });
        setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      },
    });

  const priceRecommendationMutation =
    api.strategy.generatePriceRecommendations.useMutation({
      onSuccess: () => {
        setFeedback({
          type: "success",
          message: "価格設定提案が完了しました",
        });
        setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      },
      onError: (error: unknown) => {
        const message = error instanceof Error ? error.message : "エラーが発生しました。もう一度お試しください。";
        setFeedback({ 
          type: "error", 
          message
        });
        setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      },
    });

  const campaignMutation = api.strategy.generateCampaignProposals.useMutation({
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "キャンペーン案が生成されました",
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error.message });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    },
  });

  const newTreatmentMutation =
    api.strategy.suggestNewTreatments.useMutation({
      onSuccess: () => {
        setFeedback({
          type: "success",
          message: "新施術提案が完了しました",
        });
        setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      },
      onError: (error: unknown) => {
        const message = error instanceof Error ? error.message : "エラーが発生しました。もう一度お試しください。";
        setFeedback({ 
          type: "error", 
          message
        });
        setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
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
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
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
        setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
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
        setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
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
        setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
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
        setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      }
    }
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "48px 16px" }}>
      <header style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px", color: "#172B4D" }}>
          戦略分析
        </h1>
        <p style={{ fontSize: "14px", color: "#6B778C" }}>
          収集したデータを分析し、戦略的な提案を受けることができます
        </p>
      </header>

      {feedback.type && (
        <div style={{ marginBottom: "16px" }}>
          <Banner appearance={feedback.type === "success" ? "announcement" : "error"}>
            {feedback.message}
          </Banner>
        </div>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* 総合分析 */}
        <div style={{ padding: "32px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
            総合分析
          </h2>
          <form onSubmit={handleAnalyzeMarketPosition} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Checkbox
                  isChecked={includeMarketData}
                  onChange={(e) => setIncludeMarketData(e.target.checked)}
                />
                <label style={{ fontSize: "14px", color: "#42526E" }}>
                  市場調査データを含める
                </label>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Checkbox
                  isChecked={includeSNSData}
                  onChange={(e) => setIncludeSNSData(e.target.checked)}
                />
                <label style={{ fontSize: "14px", color: "#42526E" }}>
                  SNS調査データを含める
                </label>
              </div>
            </div>
            <Button
              type="submit"
              appearance="primary"
              isDisabled={marketPositionMutation.isPending}
            >
              {marketPositionMutation.isPending
                ? "分析中..."
                : "総合分析を実行"}
            </Button>
          </form>
        </div>

        {/* 個別分析機能 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
          {/* 価格設定提案 */}
          <div style={{ padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", color: "#172B4D" }}>
              価格設定提案
            </h3>
            <p style={{ marginBottom: "16px", fontSize: "12px", color: "#6B778C" }}>
              市場価格データと比較して、最適な価格設定を提案します
            </p>
            <Button
              onClick={handleGeneratePriceRecommendations}
              appearance="default"
              isDisabled={priceRecommendationMutation.isPending}
              style={{ width: "100%" }}
            >
              {priceRecommendationMutation.isPending
                ? "生成中..."
                : "価格提案を生成"}
            </Button>
            {priceRecommendationMutation.data && (
              <details style={{ marginTop: "16px" }}>
                <summary style={{ cursor: "pointer", fontSize: "14px", fontWeight: 500, color: "#42526E", listStyle: "none" }}>
                  結果を表示
                </summary>
                <div style={{ marginTop: "8px", whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "12px", fontSize: "14px", color: "#172B4D" }}>
                  {typeof priceRecommendationMutation.data.result === "string"
                    ? priceRecommendationMutation.data.result
                    : String(priceRecommendationMutation.data.result)}
                </div>
              </details>
            )}
          </div>

          {/* キャンペーン案生成 */}
          <div style={{ padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", color: "#172B4D" }}>
              キャンペーン案生成
            </h3>
            <p style={{ marginBottom: "16px", fontSize: "12px", color: "#6B778C" }}>
              トレンドデータから効果的な月次キャンペーン案を2つ以上提案します
            </p>
            <Button
              onClick={handleGenerateCampaigns}
              appearance="default"
              isDisabled={campaignMutation.isPending}
              style={{ width: "100%" }}
            >
              {campaignMutation.isPending ? "生成中..." : "キャンペーン案を生成"}
            </Button>
            {campaignMutation.data && (
              <details style={{ marginTop: "16px" }}>
                <summary style={{ cursor: "pointer", fontSize: "14px", fontWeight: 500, color: "#42526E", listStyle: "none" }}>
                  結果を表示
                </summary>
                <div style={{ marginTop: "8px", whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "12px", fontSize: "14px", color: "#172B4D" }}>
                  {typeof campaignMutation.data.result === "string"
                    ? campaignMutation.data.result
                    : String(campaignMutation.data.result)}
                </div>
              </details>
            )}
          </div>

          {/* 新施術提案 */}
          <div style={{ padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6", gridColumn: "1 / -1" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", color: "#172B4D" }}>
              新施術導入提案
            </h3>
            <p style={{ marginBottom: "16px", fontSize: "12px", color: "#6B778C" }}>
              市場トレンドとSNSトレンドから、未導入の有望な施術を提案します
            </p>
            <Button
              onClick={handleSuggestNewTreatments}
              appearance="default"
              isDisabled={newTreatmentMutation.isPending}
              style={{ width: "100%" }}
            >
              {newTreatmentMutation.isPending
                ? "生成中..."
                : "新施術提案を生成"}
            </Button>
            {newTreatmentMutation.data && (
              <details style={{ marginTop: "16px" }}>
                <summary style={{ cursor: "pointer", fontSize: "14px", fontWeight: 500, color: "#42526E", listStyle: "none" }}>
                  結果を表示
                </summary>
                <div style={{ marginTop: "8px", whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "12px", fontSize: "14px", color: "#172B4D" }}>
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
      <section style={{ marginTop: "32px", padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
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
            description="上記の分析機能を使用すると、ここに履歴が表示されます"
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
                  <span style={{ fontSize: "12px", color: "#6B778C" }}>
                    {new Date(strategy.createdAt).toLocaleString("ja-JP")}
                  </span>
                  <Badge appearance={strategy.implementationStatus === "completed" ? "added" : strategy.implementationStatus === "in_progress" ? "default" : "removed"}>
                    {strategy.implementationStatus === "completed"
                      ? "完了"
                      : strategy.implementationStatus === "in_progress"
                        ? "進行中"
                        : "未着手"}
                  </Badge>
                </div>
                <details style={{ marginTop: "8px" }}>
                  <summary style={{ cursor: "pointer", fontSize: "14px", fontWeight: 500, color: "#42526E", listStyle: "none" }}>
                    提案内容を表示
                  </summary>
                  <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {strategy.priceRecommendations && (
                      <div>
                        <h4 style={{ fontSize: "14px", fontWeight: 500, color: "#42526E", marginBottom: "4px" }}>
                          価格設定提案
                        </h4>
                        <div style={{ maxHeight: "160px", overflow: "auto", whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "12px", fontSize: "14px", color: "#172B4D" }}>
                          {strategy.priceRecommendations}
                        </div>
                      </div>
                    )}
                    {strategy.campaignProposals && (
                      <div>
                        <h4 style={{ fontSize: "14px", fontWeight: 500, color: "#42526E", marginBottom: "4px" }}>
                          キャンペーン案
                        </h4>
                        <div style={{ maxHeight: "160px", overflow: "auto", whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "12px", fontSize: "14px", color: "#172B4D" }}>
                          {strategy.campaignProposals}
                        </div>
                      </div>
                    )}
                    {strategy.newTreatmentSuggestions && (
                      <div>
                        <h4 style={{ fontSize: "14px", fontWeight: 500, color: "#42526E", marginBottom: "4px" }}>
                          新施術提案
                        </h4>
                        <div style={{ maxHeight: "160px", overflow: "auto", whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "12px", fontSize: "14px", color: "#172B4D" }}>
                          {strategy.newTreatmentSuggestions}
                        </div>
                      </div>
                    )}
                    {strategy.marketingStrategy && (
                      <div>
                        <h4 style={{ fontSize: "14px", fontWeight: 500, color: "#42526E", marginBottom: "4px" }}>
                          マーケティング戦略
                        </h4>
                        <div style={{ maxHeight: "160px", overflow: "auto", whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "12px", fontSize: "14px", color: "#172B4D" }}>
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
