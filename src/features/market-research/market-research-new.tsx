"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Button from "@atlaskit/button";
import TextField from "@atlaskit/textfield";
import Spinner from "@atlaskit/spinner";
import { api } from "@/trpc/react";
import { TRPCClientError } from "@trpc/client";
import { useToastContext } from "@/components/ToastProvider";
import { USER_ID_PLACEHOLDER } from "@/lib/constants";
import { SelectionCard } from "@/components/research/SelectionCard";
import { HistoryCard } from "@/components/research/HistoryCard";
import { FilterBar, type FilterState } from "@/components/research/FilterBar";
import { ResearchDetailDrawer } from "@/components/research/ResearchDetailDrawer";
import Tag from "@atlaskit/tag";
import Select from "@atlaskit/select";

type ResearchType = "trend_analysis" | "price_research" | "competitor_analysis";

const researchTypes = [
  {
    type: "trend_analysis" as const,
    icon: "📈",
    title: "トレンド分析",
    description: "市場の最新トレンドを把握",
  },
  {
    type: "price_research" as const,
    icon: "💰",
    title: "価格調査",
    description: "競合の価格情報を収集",
  },
  {
    type: "competitor_analysis" as const,
    icon: "🔍",
    title: "競合調査",
    description: "周辺の競合を分析",
  },
];

interface DetailedResult {
  id: number;
  researchType: string;
  location: string;
  processedData: string | null;
  createdAt: Date;
}

export function MarketResearchNew() {
  const [researchType, setResearchType] = useState<ResearchType | "">("");
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState(5);
  const [treatments, setTreatments] = useState<string[]>([]);
  const [treatmentInput, setTreatmentInput] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    timeRange: "all",
    status: "all",
  });
  const [selectedResult, setSelectedResult] = useState<DetailedResult | null>(null);
  const [selectedAIProvider, setSelectedAIProvider] = useState<"claude" | "chatgpt" | "gemini" | "grok">("gemini");

  const utils = api.useUtils();
  const toast = useToastContext();

  const trendMutation = api.marketResearch.executeTrendAnalysis.useMutation({
    onSuccess: () => {
      toast.showSuccess("トレンド分析が完了しました");
      void utils.marketResearch.list.invalidate({
        userId: USER_ID_PLACEHOLDER,
      });
      setLocation("");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      toast.showError(message);
    },
  });

  const priceMutation = api.marketResearch.executePriceResearch.useMutation({
    onSuccess: () => {
      toast.showSuccess("価格調査が完了しました");
      void utils.marketResearch.list.invalidate({
        userId: USER_ID_PLACEHOLDER,
      });
      setTreatments([]);
      setCities([]);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      toast.showError(message);
    },
  });

  const competitorMutation =
    api.marketResearch.executeCompetitorAnalysis.useMutation({
      onSuccess: () => {
        toast.showSuccess("競合調査が完了しました");
        void utils.marketResearch.list.invalidate({
          userId: USER_ID_PLACEHOLDER,
        });
        setLocation("");
        setRadius(5);
      },
      onError: (error: unknown) => {
        const message = error instanceof Error ? error.message : "エラーが発生しました";
        toast.showError(message);
      },
    });

  const resultsQuery = api.marketResearch.list.useQuery({
    userId: USER_ID_PLACEHOLDER,
  }, {
    retry: 3,
    retryDelay: 1000,
    staleTime: 30000,
  });

  const modelInfoQuery = api.marketResearch.getCurrentModel.useQuery(
    { userId: USER_ID_PLACEHOLDER, aiProvider: selectedAIProvider },
    {
      retry: 2,
      staleTime: 60000,
    }
  );

  const productsQuery = api.product.list.useQuery({
    userId: USER_ID_PLACEHOLDER,
  }, {
    retry: 2,
    staleTime: 60000,
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

  const handleProductSelectionChange = (selectedOptions: Array<{ value: number; label: string }> | null) => {
    const selected = selectedOptions || [];
    const productIds = selected.map(opt => opt.value);
    setSelectedProductIds(productIds);
    
    const selectedProductNames = selected.map(opt => opt.label);
    const freeInputTreatments = treatments.filter(t => 
      !productsQuery.data?.some(p => p.name === t)
    );
    
    const allTreatments = [...freeInputTreatments];
    selectedProductNames.forEach(name => {
      if (!allTreatments.includes(name)) {
        allTreatments.push(name);
      }
    });
    
    setTreatments(allTreatments);
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

    try {
      if (researchType === "trend_analysis") {
        if (!location.trim()) {
          toast.showError("場所を入力してください");
          return;
        }
        await trendMutation.mutateAsync({
          userId: USER_ID_PLACEHOLDER,
          location: location.trim(),
          aiProvider: selectedAIProvider,
        });
      } else if (researchType === "price_research") {
        if (treatments.length === 0) {
          toast.showError("少なくとも1つの施術を追加してください");
          return;
        }
        if (cities.length === 0) {
          toast.showError("少なくとも1つの都市を追加してください");
          return;
        }
        await priceMutation.mutateAsync({
          userId: USER_ID_PLACEHOLDER,
          treatments,
          cities,
          aiProvider: selectedAIProvider,
        });
      } else if (researchType === "competitor_analysis") {
        if (!location.trim()) {
          toast.showError("場所を入力してください");
          return;
        }
        await competitorMutation.mutateAsync({
          userId: USER_ID_PLACEHOLDER,
          location: location.trim(),
          radius,
          aiProvider: selectedAIProvider,
        });
      }
    } catch (error) {
      if (error instanceof TRPCClientError) {
        toast.showError(error.message);
      }
    }
  };

  const isPending = trendMutation.isPending || priceMutation.isPending || competitorMutation.isPending;

  // Filter and search results
  const filteredResults = useMemo(() => {
    if (!resultsQuery.data) return [];

    let filtered = [...resultsQuery.data];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.location.toLowerCase().includes(query) ||
        (r.processedData && r.processedData.toLowerCase().includes(query))
      );
    }

    // Time range filter
    if (filters.timeRange && filters.timeRange !== "all") {
      const now = new Date();
      const cutoff = new Date();
      if (filters.timeRange === "7days") cutoff.setDate(now.getDate() - 7);
      else if (filters.timeRange === "30days") cutoff.setDate(now.getDate() - 30);
      else if (filters.timeRange === "90days") cutoff.setDate(now.getDate() - 90);
      
      filtered = filtered.filter(r => new Date(r.createdAt) >= cutoff);
    }

    return filtered;
  }, [resultsQuery.data, searchQuery, filters]);

  const handleRerun = (result: DetailedResult) => {
    setResearchType(result.researchType as ResearchType);
    setLocation(result.location);
    toast.showInfo("調査条件を復元しました。「調査を開始」ボタンをクリックしてください。");
  };

  const generateSummary = (result: DetailedResult): string => {
    if (!result.processedData) return "調査結果なし";
    const preview = result.processedData.substring(0, 100);
    return preview.length < result.processedData.length ? `${preview}...` : preview;
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "48px 16px" }}>
      {/* ヘッダー */}
      <header style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 600, margin: 0, color: "#172B4D" }}>
            📊 市場調査
          </h1>
          {modelInfoQuery.data && (
            <div
              style={{
                padding: "6px 16px",
                borderRadius: "6px",
                backgroundColor: "#0052CC",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              🤖 {modelInfoQuery.data.aiAgent.toUpperCase()} ({modelInfoQuery.data.model})
            </div>
          )}
        </div>
        <p style={{ fontSize: "15px", color: "#6B778C" }}>
          AIを活用して市場動向、価格情報、競合情報を自動収集・分析します
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
        {/* 左側: 調査実行エリア */}
        <div>
          {/* AI選択 */}
          <section style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
              ステップ 1: AIを選択
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
              {[
                { value: "gemini", label: "Gemini", icon: "🤖" },
                { value: "chatgpt", label: "ChatGPT", icon: "💬" },
                { value: "claude", label: "Claude", icon: "🧠" },
                { value: "grok", label: "Grok", icon: "𝕏" },
              ].map((ai) => (
                <SelectionCard
                  key={ai.value}
                  icon={ai.icon}
                  title={ai.label}
                  description=""
                  isSelected={selectedAIProvider === ai.value}
                  onClick={() => setSelectedAIProvider(ai.value as "claude" | "chatgpt" | "gemini" | "grok")}
                  disabled={isPending}
                />
              ))}
            </div>
            {modelInfoQuery.data && (
              <div style={{ marginTop: "12px", fontSize: "13px", color: "#6B778C" }}>
                使用モデル: {modelInfoQuery.data.model}
              </div>
            )}
          </section>

          {/* 調査タイプ選択 */}
          <section style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
              ステップ 2: 調査タイプを選択
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              {researchTypes.map((type) => (
                <SelectionCard
                  key={type.type}
                  icon={type.icon}
                  title={type.title}
                  description={type.description}
                  isSelected={researchType === type.type}
                  onClick={() => setResearchType(type.type)}
                  disabled={isPending}
                />
              ))}
            </div>
          </section>

          {/* 調査フォーム */}
          {researchType && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                padding: "32px",
                background: "#FFFFFF",
                borderRadius: "12px",
                border: "2px solid #0052CC20",
              }}
            >
              <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "24px", color: "#172B4D" }}>
                ステップ 3: 詳細条件を入力
              </h2>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
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
                    />
                  </div>
                )}

                {researchType === "price_research" && (
                  <>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                        調査対象施術 *
                      </label>
                      
                      {productsQuery.data && productsQuery.data.length > 0 && (
                        <div style={{ marginBottom: "16px" }}>
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
                            placeholder="登録済み商品から選択（複数可）"
                            isClearable
                          />
                        </div>
                      )}
                      
                      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
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
                          placeholder="または直接入力..."
                        />
                        <Button type="button" appearance="default" onClick={handleAddTreatment}>
                          追加
                        </Button>
                      </div>
                      
                      {treatments.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
                          {treatments.map((treatment) => (
                            <div key={treatment} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <Tag text={treatment} />
                              <Button
                                appearance="subtle-link"
                                onClick={() => {
                                  handleRemoveTreatment(treatment);
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
                        />
                        <Button type="button" appearance="default" onClick={handleAddCity}>
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
                      />
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  appearance="primary"
                  isDisabled={isPending}
                  style={{ marginTop: "16px", fontSize: "15px", padding: "12px 24px", fontWeight: 600 }}
                >
                  {isPending ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Spinner size="small" />
                      調査中...
                    </div>
                  ) : (
                    "🚀 調査を開始"
                  )}
                </Button>
              </form>
            </motion.section>
          )}
        </div>

        {/* 右側: 調査結果履歴 */}
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
            📋 調査結果履歴
          </h2>

          <FilterBar
            onSearch={setSearchQuery}
            onFilterChange={setFilters}
            showPlatformFilter={false}
          />

          {resultsQuery.isLoading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px" }}>
              <Spinner size="large" />
            </div>
          )}

          {resultsQuery.data && filteredResults.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px", color: "#6B778C" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
              <div style={{ fontSize: "16px", fontWeight: 500 }}>
                {searchQuery ? "検索結果が見つかりません" : "まだ調査履歴がありません"}
              </div>
              <div style={{ fontSize: "14px", marginTop: "8px" }}>
                {searchQuery ? "別のキーワードで試してください" : "左側のフォームから調査を開始してください"}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {filteredResults.map((result) => (
              <HistoryCard
                key={result.id}
                type="market"
                query={`${result.location} - ${result.researchType === "trend_analysis" ? "トレンド分析" : result.researchType === "price_research" ? "価格調査" : "競合調査"}`}
                summary={generateSummary(result)}
                timestamp={new Date(result.createdAt)}
                status="success"
                onRerun={() => handleRerun(result)}
                onViewDetail={() => setSelectedResult(result)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 詳細表示ドロワー */}
      <ResearchDetailDrawer
        isOpen={selectedResult !== null}
        onClose={() => setSelectedResult(null)}
        title={selectedResult ? `${selectedResult.location} - 調査詳細` : ""}
      >
        {selectedResult && (
          <div>
            <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #EBECF0" }}>
              <div style={{ fontSize: "12px", color: "#6B778C", marginBottom: "4px" }}>調査日時</div>
              <div style={{ fontSize: "14px", fontWeight: 500 }}>
                {new Date(selectedResult.createdAt).toLocaleString("ja-JP")}
              </div>
            </div>
            
            <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #EBECF0" }}>
              <div style={{ fontSize: "12px", color: "#6B778C", marginBottom: "4px" }}>調査タイプ</div>
              <div style={{ fontSize: "14px", fontWeight: 500 }}>
                {selectedResult.researchType === "trend_analysis" ? "📈 トレンド分析" :
                 selectedResult.researchType === "price_research" ? "💰 価格調査" : "🔍 競合調査"}
              </div>
            </div>

            {selectedResult.processedData && (
              <div>
                <div style={{ fontSize: "12px", color: "#6B778C", marginBottom: "8px" }}>調査結果</div>
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    borderRadius: "8px",
                    background: "#F4F5F7",
                    padding: "20px",
                    fontSize: "14px",
                    color: "#172B4D",
                    lineHeight: 1.6,
                    maxHeight: "600px",
                    overflow: "auto",
                  }}
                >
                  {selectedResult.processedData}
                </div>
              </div>
            )}
          </div>
        )}
      </ResearchDetailDrawer>
    </div>
  );
}

export default MarketResearchNew;

