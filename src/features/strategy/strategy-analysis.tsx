"use client";

import { useState } from "react";
import Button from "@atlaskit/button";
import TextField from "@atlaskit/textfield";
import Checkbox from "@atlaskit/checkbox";
import Banner from "@atlaskit/banner";
import Badge from "@atlaskit/badge";
import Tag from "@atlaskit/tag";
import Spinner from "@atlaskit/spinner";
import EmptyState from "@atlaskit/empty-state";
import Select from "@atlaskit/select";
import Link from "next/link";
import { api } from "@/trpc/react";
import { TRPCClientError } from "@trpc/client";
import { useToastContext } from "@/components/ToastProvider";

const USER_ID_PLACEHOLDER = 1;

export function StrategyAnalysis() {
  const [location, setLocation] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [includeMarketData, setIncludeMarketData] = useState(true);
  const [includeSNSData, setIncludeSNSData] = useState(true);

  const utils = api.useUtils();
  const toast = useToastContext();

  const marketPositionMutation =
    api.strategy.analyzeMarketPosition.useMutation({
      onSuccess: () => {
        toast.showSuccess("総合分析が完了しました");
        void utils.strategy.list.invalidate({ userId: USER_ID_PLACEHOLDER });
        setLocation("");
      },
      onError: (error: unknown) => {
        const message = error instanceof Error ? error.message : "エラーが発生しました。もう一度お試しください。";
        toast.showError(message);
      },
    });

  const priceRecommendationMutation =
    api.strategy.generatePriceRecommendations.useMutation({
      onSuccess: () => {
        toast.showSuccess("価格設定提案が完了しました");
        void utils.strategy.list.invalidate({ userId: USER_ID_PLACEHOLDER });
      },
      onError: (error: unknown) => {
        const message = error instanceof Error ? error.message : "エラーが発生しました。もう一度お試しください。";
        toast.showError(message);
      },
    });

  const campaignMutation = api.strategy.generateCampaignProposals.useMutation({
    onSuccess: () => {
      toast.showSuccess("キャンペーン案が生成されました");
      void utils.strategy.list.invalidate({ userId: USER_ID_PLACEHOLDER });
    },
    onError: (error) => {
      toast.showError(error.message);
    },
  });

  const newTreatmentMutation =
    api.strategy.suggestNewTreatments.useMutation({
      onSuccess: () => {
        toast.showSuccess("新施術提案が完了しました");
        void utils.strategy.list.invalidate({ userId: USER_ID_PLACEHOLDER });
      },
      onError: (error: unknown) => {
        const message = error instanceof Error ? error.message : "エラーが発生しました。もう一度お試しください。";
        toast.showError(message);
      },
    });

  const strategiesQuery = api.strategy.list.useQuery(
    {
      userId: USER_ID_PLACEHOLDER,
    },
    {
      retry: (failureCount, error) => {
        // JSONパースエラーや404エラーはリトライしない
        if (error && typeof error === "object") {
          const errorMessage = String(error.message || "").toLowerCase();
          if (
            errorMessage.includes("unexpected token") ||
            errorMessage.includes("not valid json") ||
            errorMessage.includes("<!doctype")
          ) {
            return false;
          }
        }
        return failureCount < 2;
      },
      retryDelay: 1000,
      staleTime: 30000,
      enabled: true,
    },
  );

  // 商品一覧を取得
  const productsQuery = api.product.list.useQuery({ userId: USER_ID_PLACEHOLDER });

  // ユーザー設定を取得
  const userSettingsQuery = api.strategy.getUserSettings.useQuery(
    { userId: USER_ID_PLACEHOLDER },
    {
      retry: 2,
      staleTime: 60000,
    }
  );

  // ユーザー設定を更新
  const updateUserSettingsMutation = api.strategy.updateUserSettings.useMutation({
    onSuccess: () => {
      void userSettingsQuery.refetch();
      void modelInfoQuery.refetch();
      toast.showSuccess("AI設定を更新しました");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      toast.showError(message);
    },
  });

  const modelInfoQuery = api.strategy.getCurrentModel.useQuery(
    { 
      functionType: "analyzeMarketPosition", // デフォルトは総合分析
      userId: USER_ID_PLACEHOLDER,
    },
    {
      retry: 2,
      staleTime: 60000, // 1分間キャッシュ
    }
  );

  // AI選択の変更ハンドラー
  const handleAIProviderChange = (selectedOption: { value: string; label: string } | null) => {
    if (selectedOption) {
      updateUserSettingsMutation.mutate({
        userId: USER_ID_PLACEHOLDER,
        strategyAIProvider: selectedOption.value as "claude" | "chatgpt" | "gemini",
      });
    }
  };

  const handleAnalyzeMarketPosition = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (!location.trim()) {
      toast.showError("場所を入力してください");
      return;
    }

    if (selectedProductIds.length === 0) {
      toast.showError("分析する商品を1つ以上選択してください");
      return;
    }

    try {
      await marketPositionMutation.mutateAsync({
        userId: USER_ID_PLACEHOLDER,
        location: location.trim(),
        productIds: selectedProductIds,
        includeMarketData,
        includeSNSData,
      });
    } catch (error) {
      if (error instanceof TRPCClientError) {
        toast.showError(error.message);
      }
    }
  };

  const handleProductToggle = (productId: number) => {
    setSelectedProductIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleSelectAllProducts = () => {
    if (productsQuery.data && productsQuery.data.length > 0) {
      const allProductIds = productsQuery.data
        .filter((p) => p.isActive)
        .map((p) => p.id);
      setSelectedProductIds(allProductIds);
    }
  };

  const handleDeselectAllProducts = () => {
    setSelectedProductIds([]);
  };

  const handleGeneratePriceRecommendations = async () => {
    try {
      await priceRecommendationMutation.mutateAsync({
        userId: USER_ID_PLACEHOLDER,
      });
    } catch (error) {
      if (error instanceof TRPCClientError) {
        toast.showError(error.message);
      }
    }
  };

  const handleGenerateCampaigns = async () => {
    try {
      await campaignMutation.mutateAsync({
        userId: USER_ID_PLACEHOLDER,
      });
    } catch (error) {
      if (error instanceof TRPCClientError) {
        toast.showError(error.message);
      }
    }
  };

  const handleSuggestNewTreatments = async () => {
    try {
      await newTreatmentMutation.mutateAsync({
        userId: USER_ID_PLACEHOLDER,
      });
    } catch (error) {
      if (error instanceof TRPCClientError) {
        toast.showError(error.message);
      }
    }
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "48px 16px" }}>
      <header style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "12px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "#172B4D" }}>
            戦略分析
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {/* AI選択UI */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ fontSize: "12px", color: "#6B778C", fontWeight: 500 }}>
                AI:
              </label>
              <Select
                options={[
                  { value: "chatgpt", label: "ChatGPT" },
                  { value: "claude", label: "Claude" },
                  { value: "gemini", label: "Gemini" },
                ]}
                value={
                  userSettingsQuery.data
                    ? {
                        value: userSettingsQuery.data.strategyAIProvider,
                        label: userSettingsQuery.data.strategyAIProvider === "claude" 
                          ? "Claude" 
                          : userSettingsQuery.data.strategyAIProvider === "gemini"
                          ? "Gemini"
                          : "ChatGPT",
                      }
                    : { value: "chatgpt", label: "ChatGPT" }
                }
                onChange={handleAIProviderChange}
                isDisabled={updateUserSettingsMutation.isPending}
                styles={{
                  control: (provided) => ({
                    ...provided,
                    minWidth: "120px",
                    fontSize: "12px",
                  }),
                }}
              />
            </div>
            {/* 現在のモデル情報 */}
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
        </div>
        <p style={{ fontSize: "14px", color: "#6B778C" }}>
          収集したデータを分析し、戦略的な提案を受けることができます
        </p>
      </header>


      <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* 総合分析 */}
        <div style={{ padding: "32px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
            総合分析
          </h2>
          {productsQuery.isLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "16px" }}>
              <Spinner size="small" />
              <span style={{ fontSize: "14px", color: "#6B778C" }}>商品を読み込み中...</span>
            </div>
          )}
          {productsQuery.error && (
            <Banner appearance="error">
              エラー: {productsQuery.error.message.includes("<!DOCTYPE") || productsQuery.error.message.includes("Unexpected token")
                ? "サーバーに接続できません。サーバーが起動しているか確認してください。"
                : productsQuery.error.message}
            </Banner>
          )}
          {productsQuery.data && productsQuery.data.length === 0 && (
            <Banner appearance="warning">
              <div>
                <p style={{ marginBottom: "8px", fontSize: "14px", fontWeight: 500 }}>
                  分析する商品がありません。まず商品を登録してください。
                </p>
                <Link href="/" style={{ fontSize: "14px", color: "#0052CC", textDecoration: "none" }}>
                  → 商品管理ページで商品を登録する
                </Link>
              </div>
            </Banner>
          )}
          {productsQuery.data && productsQuery.data.length > 0 && (
            <form onSubmit={handleAnalyzeMarketPosition} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                  分析する商品 * (1つ以上選択)
                </label>
                <div style={{ padding: "12px", borderRadius: "4px", border: "1px solid #DFE1E6", background: "#F4F5F7", maxHeight: "200px", overflowY: "auto" }}>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <Button
                      type="button"
                      appearance="subtle"
                      onClick={handleSelectAllProducts}
                      style={{ fontSize: "12px", padding: "4px 8px" }}
                    >
                      すべて選択
                    </Button>
                    <Button
                      type="button"
                      appearance="subtle"
                      onClick={handleDeselectAllProducts}
                      style={{ fontSize: "12px", padding: "4px 8px" }}
                    >
                      すべて解除
                    </Button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {productsQuery.data
                      .filter((p) => p.isActive)
                      .map((product) => (
                        <div key={product.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Checkbox
                            isChecked={selectedProductIds.includes(product.id)}
                            onChange={() => handleProductToggle(product.id)}
                          />
                          <label style={{ fontSize: "14px", color: "#42526E", cursor: "pointer", flex: 1 }}>
                            {product.name}
                            {product.category && (
                              <span style={{ marginLeft: "8px", fontSize: "12px", color: "#6B778C" }}>
                                ({product.category})
                              </span>
                            )}
                          </label>
                          <span style={{ fontSize: "12px", color: "#6B778C" }}>
                            {product.sellingPrice.toLocaleString()}円
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                {selectedProductIds.length === 0 && (
                  <p style={{ marginTop: "4px", fontSize: "12px", color: "#DE350B" }}>
                    分析する商品を1つ以上選択してください
                  </p>
                )}
              </div>
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
                isDisabled={marketPositionMutation.isPending || selectedProductIds.length === 0}
              >
                {marketPositionMutation.isPending
                  ? "分析中..."
                  : "総合分析を実行"}
              </Button>
            </form>
          )}
        </div>

        {/* 価格設定提案 */}
        <div style={{ padding: "32px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
            価格設定提案
          </h2>
          <p style={{ marginBottom: "24px", fontSize: "14px", color: "#6B778C" }}>
            市場価格データと比較して、最適な価格設定を提案します
          </p>
          <Button
            onClick={handleGeneratePriceRecommendations}
            appearance="primary"
            isDisabled={priceRecommendationMutation.isPending}
            style={{ width: "100%", maxWidth: "300px" }}
          >
            {priceRecommendationMutation.isPending
              ? "生成中..."
              : "価格提案を生成"}
          </Button>
          {priceRecommendationMutation.data && (
            <details style={{ marginTop: "24px" }}>
              <summary style={{ cursor: "pointer", fontSize: "14px", fontWeight: 500, color: "#42526E", listStyle: "none" }}>
                結果を表示
              </summary>
              <div style={{ marginTop: "12px", whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "16px", fontSize: "14px", color: "#172B4D" }}>
                {typeof priceRecommendationMutation.data.result === "string"
                  ? priceRecommendationMutation.data.result
                  : String(priceRecommendationMutation.data.result)}
              </div>
            </details>
          )}
        </div>

        {/* キャンペーン案生成 */}
        <div style={{ padding: "32px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
            キャンペーン案生成
          </h2>
          <p style={{ marginBottom: "24px", fontSize: "14px", color: "#6B778C" }}>
            トレンドデータから効果的な月次キャンペーン案を2つ以上提案します
          </p>
          <Button
            onClick={handleGenerateCampaigns}
            appearance="primary"
            isDisabled={campaignMutation.isPending}
            style={{ width: "100%", maxWidth: "300px" }}
          >
            {campaignMutation.isPending ? "生成中..." : "キャンペーン案を生成"}
          </Button>
          {campaignMutation.data && (
            <details style={{ marginTop: "24px" }}>
              <summary style={{ cursor: "pointer", fontSize: "14px", fontWeight: 500, color: "#42526E", listStyle: "none" }}>
                結果を表示
              </summary>
              <div style={{ marginTop: "12px", whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "16px", fontSize: "14px", color: "#172B4D" }}>
                {typeof campaignMutation.data.result === "string"
                  ? campaignMutation.data.result
                  : String(campaignMutation.data.result)}
              </div>
            </details>
          )}
        </div>

        {/* 新施術導入提案 */}
        <div style={{ padding: "32px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
            新施術導入提案
          </h2>
          <p style={{ marginBottom: "24px", fontSize: "14px", color: "#6B778C" }}>
            市場トレンドとSNSトレンドから、未導入の有望な施術を提案します
          </p>
          <Button
            onClick={handleSuggestNewTreatments}
            appearance="primary"
            isDisabled={newTreatmentMutation.isPending}
            style={{ width: "100%", maxWidth: "300px" }}
          >
            {newTreatmentMutation.isPending
              ? "生成中..."
              : "新施術提案を生成"}
          </Button>
          {newTreatmentMutation.data && (
            <details style={{ marginTop: "24px" }}>
              <summary style={{ cursor: "pointer", fontSize: "14px", fontWeight: 500, color: "#42526E", listStyle: "none" }}>
                結果を表示
              </summary>
              <div style={{ marginTop: "12px", whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "16px", fontSize: "14px", color: "#172B4D" }}>
                {typeof newTreatmentMutation.data.result === "string"
                  ? newTreatmentMutation.data.result
                  : String(newTreatmentMutation.data.result)}
              </div>
            </details>
          )}
        </div>
      </section>

      {/* 提案履歴 */}
      <section style={{ marginTop: "32px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "24px", color: "#172B4D" }}>
          提案履歴
        </h2>

        {/* 総合分析履歴 */}
        <div style={{ marginBottom: "32px", padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
            総合分析履歴
          </h3>
          {strategiesQuery.isLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "16px" }}>
              <Spinner size="small" />
              <span style={{ fontSize: "14px", color: "#6B778C" }}>読み込み中...</span>
            </div>
          )}
          {strategiesQuery.error && (
            <Banner appearance="error">
              エラー: {strategiesQuery.error.message.includes("<!DOCTYPE") || strategiesQuery.error.message.includes("Unexpected token")
                ? "サーバーに接続できません。サーバーが起動しているか確認してください。"
                : strategiesQuery.error.message}
            </Banner>
          )}
          {strategiesQuery.data && (
            (() => {
              const analysisHistories = strategiesQuery.data.filter((s) => s.marketingStrategy);
              if (analysisHistories.length === 0) {
                return (
                  <EmptyState
                    header="まだ総合分析がありません"
                    description="総合分析を実行すると、ここに履歴が表示されます"
                  />
                );
              }
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {analysisHistories.map((strategy) => (
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
                          分析結果を表示
                        </summary>
                        <div style={{ marginTop: "12px", whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "16px", fontSize: "14px", color: "#172B4D" }}>
                          {strategy.marketingStrategy}
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>

        {/* 価格設定提案履歴 */}
        <div style={{ marginBottom: "32px", padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
            価格設定提案履歴
          </h3>
          {strategiesQuery.isLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "16px" }}>
              <Spinner size="small" />
              <span style={{ fontSize: "14px", color: "#6B778C" }}>読み込み中...</span>
            </div>
          )}
          {strategiesQuery.error && (
            <Banner appearance="error">
              エラー: {strategiesQuery.error.message.includes("<!DOCTYPE") || strategiesQuery.error.message.includes("Unexpected token")
                ? "サーバーに接続できません。サーバーが起動しているか確認してください。"
                : strategiesQuery.error.message}
            </Banner>
          )}
          {strategiesQuery.data && (
            (() => {
              const priceHistories = strategiesQuery.data.filter((s) => s.priceRecommendations);
              if (priceHistories.length === 0) {
                return (
                  <EmptyState
                    header="まだ価格設定提案がありません"
                    description="価格設定提案を生成すると、ここに履歴が表示されます"
                  />
                );
              }
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {priceHistories.map((strategy) => (
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
                        <div style={{ marginTop: "12px", whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "16px", fontSize: "14px", color: "#172B4D" }}>
                          {strategy.priceRecommendations}
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>

        {/* キャンペーン案履歴 */}
        <div style={{ marginBottom: "32px", padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
            キャンペーン案履歴
          </h3>
          {strategiesQuery.isLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "16px" }}>
              <Spinner size="small" />
              <span style={{ fontSize: "14px", color: "#6B778C" }}>読み込み中...</span>
            </div>
          )}
          {strategiesQuery.error && (
            <Banner appearance="error">
              エラー: {strategiesQuery.error.message.includes("<!DOCTYPE") || strategiesQuery.error.message.includes("Unexpected token")
                ? "サーバーに接続できません。サーバーが起動しているか確認してください。"
                : strategiesQuery.error.message}
            </Banner>
          )}
          {strategiesQuery.data && (
            (() => {
              const campaignHistories = strategiesQuery.data.filter((s) => s.campaignProposals);
              if (campaignHistories.length === 0) {
                return (
                  <EmptyState
                    header="まだキャンペーン案がありません"
                    description="キャンペーン案を生成すると、ここに履歴が表示されます"
                  />
                );
              }
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {campaignHistories.map((strategy) => (
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
                        <div style={{ marginTop: "12px", whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "16px", fontSize: "14px", color: "#172B4D" }}>
                          {strategy.campaignProposals}
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>

        {/* 新施術提案履歴 */}
        <div style={{ marginBottom: "32px", padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
            新施術提案履歴
          </h3>
          {strategiesQuery.isLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "16px" }}>
              <Spinner size="small" />
              <span style={{ fontSize: "14px", color: "#6B778C" }}>読み込み中...</span>
            </div>
          )}
          {strategiesQuery.error && (
            <Banner appearance="error">
              エラー: {strategiesQuery.error.message.includes("<!DOCTYPE") || strategiesQuery.error.message.includes("Unexpected token")
                ? "サーバーに接続できません。サーバーが起動しているか確認してください。"
                : strategiesQuery.error.message}
            </Banner>
          )}
          {strategiesQuery.data && (
            (() => {
              const treatmentHistories = strategiesQuery.data.filter((s) => s.newTreatmentSuggestions);
              if (treatmentHistories.length === 0) {
                return (
                  <EmptyState
                    header="まだ新施術提案がありません"
                    description="新施術提案を生成すると、ここに履歴が表示されます"
                  />
                );
              }
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {treatmentHistories.map((strategy) => (
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
                        <div style={{ marginTop: "12px", whiteSpace: "pre-wrap", borderRadius: "4px", background: "#F4F5F7", padding: "16px", fontSize: "14px", color: "#172B4D" }}>
                          {strategy.newTreatmentSuggestions}
                        </div>
                      </details>
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

export default StrategyAnalysis;
