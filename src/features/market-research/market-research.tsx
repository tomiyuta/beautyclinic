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

type ResearchType = "trend_analysis" | "price_research" | "competitor_analysis";

const USER_ID_PLACEHOLDER = 1;

const researchTypeOptions = [
  { label: "トレンド分析", value: "trend_analysis" },
  { label: "価格調査", value: "price_research" },
  { label: "競合調査", value: "competitor_analysis" },
];

export function MarketResearch() {
  const [researchType, setResearchType] = useState<ResearchType | "">("");
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState(5);
  const [treatments, setTreatments] = useState<string[]>([]);
  const [treatmentInput, setTreatmentInput] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
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
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
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
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    },
  });

  const priceMutation = api.marketResearch.executePriceResearch.useMutation({
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "価格調査が完了しました",
      });
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
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
      setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    },
  });

  const competitorMutation =
    api.marketResearch.executeCompetitorAnalysis.useMutation({
      onSuccess: () => {
        setFeedback({
          type: "success",
          message: "競合調査が完了しました",
        });
        setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
        void utils.marketResearch.list.invalidate({
          userId: USER_ID_PLACEHOLDER,
        });
        setLocation("");
        setRadius(5);
      },
      onError: (error: unknown) => {
        const message = error instanceof Error ? error.message : "エラーが発生しました";
        setFeedback({ type: "error", message });
        setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
      },
    });

  const resultsQuery = api.marketResearch.list.useQuery({
    userId: USER_ID_PLACEHOLDER,
  }, {
    retry: 3,
    retryDelay: 1000,
    staleTime: 30000,
  });

  const modelInfoQuery = api.marketResearch.getCurrentModel.useQuery(undefined, {
    retry: 2,
    staleTime: 60000, // 1分間キャッシュ
  });

  // 商品管理から商品一覧を取得
  const productsQuery = api.product.list.useQuery({
    userId: USER_ID_PLACEHOLDER,
  }, {
    retry: 2,
    staleTime: 60000, // 1分間キャッシュ
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

  const handleProductSelectionChange = (selectedOptions: Array<{ value: number; label: string }>) => {
    const productIds = selectedOptions.map(opt => opt.value);
    setSelectedProductIds(productIds);
    
    // 選択した商品名をtreatmentsに追加（重複を避ける）
    const productNames = selectedOptions.map(opt => opt.label);
    const newTreatments = [...treatments];
    productNames.forEach(name => {
      if (!newTreatments.includes(name)) {
        newTreatments.push(name);
      }
    });
    
    // 選択解除された商品名をtreatmentsから削除
    const currentProductNames = productsQuery.data
      ?.filter(p => productIds.includes(p.id))
      .map(p => p.name) || [];
    const treatmentsToKeep = newTreatments.filter(t => 
      currentProductNames.includes(t) || !productsQuery.data?.some(p => p.name === t)
    );
    
    setTreatments(treatmentsToKeep);
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
          setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
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
          setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
          return;
        }
        if (cities.length === 0) {
          setFeedback({
            type: "error",
            message: "少なくとも1つの都市を追加してください",
          });
          setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
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
          setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
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
        setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
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

  const isPending = trendMutation.isPending || priceMutation.isPending || competitorMutation.isPending;

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "48px 16px" }}>
      <header style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "#172B4D" }}>
            市場調査
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
          市場動向、価格情報、競合情報を自動収集します
        </p>
      </header>

      {/* フィードバックメッセージ */}
      {feedback.type && (
        <Banner appearance={feedback.type === "success" ? "announcement" : "error"}>
          {feedback.message}
        </Banner>
      )}

      {/* 調査フォーム */}
      <section style={{ marginBottom: "32px", padding: "32px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
              調査タイプ *
            </label>
            <Select
              options={researchTypeOptions}
              value={researchType ? researchTypeOptions.find(opt => opt.value === researchType) : null}
              onChange={(option) => {
                if (option && 'value' in option) {
                  setResearchType(option.value as ResearchType);
                } else {
                  setResearchType("");
                }
              }}
              placeholder="選択してください"
              isRequired
            />
          </div>

          {researchType === "trend_analysis" && (
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                調査対象地域 *
              </label>
              <TextField
                required
                type="text"
                value={location}
                onChange={(e) => setLocation((e.target as HTMLInputElement).value)}
                placeholder="例：東京、大阪、名古屋"
                style={{ width: "100%" }}
              />
            </div>
          )}

          {researchType === "price_research" && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                  調査対象施術 *
                </label>
                
                {/* 商品管理から選択 */}
                {productsQuery.data && productsQuery.data.length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", fontWeight: 500, color: "#6B778C" }}>
                      登録済み商品から選択
                    </label>
                    <Select
                      isMulti
                      options={productsQuery.data
                        .filter(p => p.isActive)
                        .map(p => ({ value: p.id, label: p.name }))}
                      value={productsQuery.data
                        .filter(p => selectedProductIds.includes(p.id))
                        .map(p => ({ value: p.id, label: p.name }))}
                      onChange={(selected) => {
                        if (selected && Array.isArray(selected)) {
                          handleProductSelectionChange(selected as Array<{ value: number; label: string }>);
                        } else {
                          handleProductSelectionChange([]);
                        }
                      }}
                      placeholder="商品を選択してください（複数選択可）"
                      isClearable
                    />
                  </div>
                )}
                
                {/* 自由入力 */}
                <div style={{ marginBottom: "8px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", fontWeight: 500, color: "#6B778C" }}>
                    自由入力
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <TextField
                      type="text"
                      value={treatmentInput}
                      onChange={(e) => setTreatmentInput((e.target as HTMLInputElement).value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTreatment();
                        }
                      }}
                      placeholder="例：ダーマペン4"
                      style={{ flex: 1 }}
                    />
                    <Button
                      type="button"
                      appearance="default"
                      onClick={handleAddTreatment}
                    >
                      追加
                    </Button>
                  </div>
                </div>
                
                {/* 選択された施術の一覧 */}
                {treatments.length > 0 && (
                  <div style={{ marginTop: "8px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 500, color: "#6B778C", marginBottom: "8px" }}>
                      選択された施術 ({treatments.length}件)
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {treatments.map((treatment) => (
                        <div key={treatment} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Tag text={treatment} />
                          <Button
                            appearance="subtle-link"
                            onClick={() => {
                              handleRemoveTreatment(treatment);
                              // 商品選択からも削除
                              const product = productsQuery.data?.find(p => p.name === treatment);
                              if (product) {
                                setSelectedProductIds(selectedProductIds.filter(id => id !== product.id));
                              }
                            }}
                            style={{ padding: "0", minWidth: "auto" }}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                  調査対象都市 *
                </label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <TextField
                    type="text"
                    value={cityInput}
                    onChange={(e) => setCityInput((e.target as HTMLInputElement).value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCity();
                      }
                    }}
                    placeholder="例：東京、大阪、名古屋"
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="button"
                    appearance="default"
                    onClick={handleAddCity}
                  >
                    追加
                  </Button>
                </div>
                {cities.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {cities.map((city) => (
                      <div key={city} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Tag text={city} />
                        <Button
                          appearance="subtle-link"
                          onClick={() => handleRemoveCity(city)}
                          style={{ padding: "0", minWidth: "auto" }}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {researchType === "competitor_analysis" && (
            <>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                  調査対象地域 *
                </label>
                <TextField
                  required
                  type="text"
                  value={location}
                  onChange={(e) => setLocation((e.target as HTMLInputElement).value)}
                  placeholder="例：東京 新宿区"
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                  調査半径 (km)
                </label>
                <TextField
                  type="number"
                  min="1"
                  max="20"
                  value={radius.toString()}
                  onChange={(e) => setRadius(Number.parseInt((e.target as HTMLInputElement).value, 10) || 5)}
                  style={{ width: "100%" }}
                />
              </div>
            </>
          )}

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
      <section style={{ padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
          調査結果履歴
        </h2>
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
        {resultsQuery.data && resultsQuery.data.length === 0 && (
          <EmptyState
            header="まだ調査結果がありません"
            description="上記のフォームから調査を開始してください"
          />
        )}
        {resultsQuery.data && resultsQuery.data.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {resultsQuery.data.map((result) => (
              <div
                key={result.id}
                style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                      <Badge appearance="added">
                        {getResearchTypeLabel(result.researchType)}
                      </Badge>
                      <span style={{ fontSize: "12px", color: "#6B778C" }}>
                        {result.location}
                      </span>
                      <span style={{ fontSize: "12px", color: "#6B778C" }}>
                        {new Date(result.createdAt).toLocaleString("ja-JP")}
                      </span>
                    </div>
                    {result.processedData && (
                      <details style={{ marginTop: "8px" }}>
                        <summary style={{ cursor: "pointer", fontSize: "14px", fontWeight: 500, color: "#42526E", listStyle: "none" }}>
                          結果を表示
                        </summary>
                        <div style={{ marginTop: "8px", maxHeight: "240px", overflow: "auto", whiteSpace: "pre-wrap", padding: "12px", borderRadius: "4px", background: "#F4F5F7", fontSize: "14px", color: "#172B4D" }}>
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
