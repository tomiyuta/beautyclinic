"use client";

import { useState } from "react";
import Button from "@atlaskit/button";
import TextField from "@atlaskit/textfield";
import Textarea from "@atlaskit/textarea";
import Banner from "@atlaskit/banner";
import Badge from "@atlaskit/badge";
import Checkbox from "@atlaskit/checkbox";
import Spinner from "@atlaskit/spinner";
import EmptyState from "@atlaskit/empty-state";
import { api } from "@/trpc/react";
import { TRPCClientError } from "@trpc/client";
import type { PromptTemplate } from "@/generated/prisma/client";

type PromptType =
  | "claude_analyze_market_position"
  | "claude_generate_price_recommendations"
  | "claude_generate_campaign_proposals"
  | "claude_suggest_new_treatments"
  | "gemini_research_trend_analysis"
  | "gemini_research_price_comparison"
  | "gemini_analyze_instagram_trends"
  | "gemini_analyze_youtube_trends"
  | "gemini_research_competitor_analysis"
  | "grok_analyze_twitter_trends"
  | "chatgpt_system_prompt"
  | "chatgpt_generate_instagram_lp"
  | "chatgpt_generate_website_article"
  | "chatgpt_generate_campaign_copy";

const PROMPT_INFO: Record<
  PromptType,
  { name: string; description: string; aiAgent: "claude" | "gemini" | "grok" | "chatgpt" }
> = {
  claude_analyze_market_position: {
    name: "市場ポジション分析",
    description: "自院商品、市場データ、SNSデータを総合的に分析し、戦略的な提案を行います",
    aiAgent: "claude",
  },
  claude_generate_price_recommendations: {
    name: "価格推奨",
    description: "商品情報と市場価格データを基に、価格設定の提案を行います",
    aiAgent: "claude",
  },
  claude_generate_campaign_proposals: {
    name: "キャンペーン案生成",
    description: "トレンドデータとSNSデータを基に、効果的な月次キャンペーン案を提案します",
    aiAgent: "claude",
  },
  claude_suggest_new_treatments: {
    name: "新施術提案",
    description: "市場トレンドとSNSトレンドを基に、未導入の有望な施術・治療の導入提案を行います",
    aiAgent: "claude",
  },
  gemini_research_trend_analysis: {
    name: "トレンド分析調査",
    description: "指定地域で流行している美容施術・治療について調査します",
    aiAgent: "gemini",
  },
  gemini_research_price_comparison: {
    name: "価格比較調査",
    description: "複数の都市での美容クリニックの施術価格を調査します",
    aiAgent: "gemini",
  },
  gemini_analyze_instagram_trends: {
    name: "Instagramトレンド分析",
    description: "Instagramで最新のトレンドを調査します",
    aiAgent: "gemini",
  },
  gemini_analyze_youtube_trends: {
    name: "YouTubeトレンド分析",
    description: "YouTubeで最新のトレンドを調査します",
    aiAgent: "gemini",
  },
  gemini_research_competitor_analysis: {
    name: "競合分析調査",
    description: "指定地域周辺の競合クリニックについて調査します",
    aiAgent: "gemini",
  },
  grok_analyze_twitter_trends: {
    name: "Twitter/Xトレンド分析",
    description: "Twitter/Xで最新のトレンドを調査します",
    aiAgent: "grok",
  },
  chatgpt_system_prompt: {
    name: "ChatGPTシステムプロンプト",
    description: "ChatGPTの基本システムプロンプト（コンテンツ生成時の基本設定）",
    aiAgent: "chatgpt",
  },
  chatgpt_generate_instagram_lp: {
    name: "Instagram用LP生成",
    description: "Instagram用のLP案を生成します",
    aiAgent: "chatgpt",
  },
  chatgpt_generate_website_article: {
    name: "HP記事生成",
    description: "SEO最適化されたHP記事を作成します",
    aiAgent: "chatgpt",
  },
  chatgpt_generate_campaign_copy: {
    name: "キャンペーンコピー生成",
    description: "キャンペーンコピーを作成します",
    aiAgent: "chatgpt",
  },
};

export default function PromptManagement() {
  const { data: prompts, refetch, isLoading, error } = api.prompt.getAll.useQuery(undefined, {
    retry: 3,
    retryDelay: 1000,
    staleTime: 30000,
  });
  const upsertPrompt = api.prompt.upsert.useMutation({
    onSuccess: () => {
      setSuccessMessage("プロンプトを保存しました");
      setTimeout(() => setSuccessMessage(""), 5000);
      void refetch();
      setEditingPrompt(null);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "プロンプトの保存に失敗しました";
      setErrorMessage(`エラー: ${message}`);
      setTimeout(() => setErrorMessage(""), 5000);
    },
  });

  const [editingPrompt, setEditingPrompt] = useState<PromptType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    prompt: "",
    isActive: true,
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleEdit = (promptType: PromptType) => {
    const prompt = prompts?.find((p: PromptTemplate) => p.promptType === promptType);
    if (prompt) {
      setFormData({
        name: prompt.name || "",
        description: prompt.description || "",
        prompt: prompt.prompt || "",
        isActive: prompt.isActive ?? true,
      });
      setEditingPrompt(promptType);
    }
  };

  const handleSubmit = (e: React.FormEvent, promptType: PromptType) => {
    e.preventDefault();
    const info = PROMPT_INFO[promptType];
    if (!info) {
      setErrorMessage("無効なプロンプトタイプです");
      setTimeout(() => setErrorMessage(""), 5000);
      return;
    }
    upsertPrompt.mutate({
      promptType,
      aiAgent: info.aiAgent,
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      prompt: formData.prompt.trim(),
      isActive: formData.isActive,
    });
  };

  const handleCancel = () => {
    setEditingPrompt(null);
    setFormData({
      name: "",
      description: "",
      prompt: "",
      isActive: true,
    });
  };

  const groupedPrompts: Record<"claude" | "gemini" | "grok" | "chatgpt", PromptTemplate[]> = prompts?.reduce(
    (acc: Record<"claude" | "gemini" | "grok" | "chatgpt", PromptTemplate[]>, prompt: PromptTemplate) => {
      if (!prompt || !prompt.aiAgent) return acc;
      const agent = prompt.aiAgent as "claude" | "gemini" | "grok" | "chatgpt";
      if (!acc[agent]) {
        acc[agent] = [];
      }
      acc[agent]!.push(prompt);
      return acc;
    },
    {} as Record<"claude" | "gemini" | "grok" | "chatgpt", PromptTemplate[]>,
  ) || {} as Record<"claude" | "gemini" | "grok" | "chatgpt", PromptTemplate[]>;

  const getAgentName = (agent: string) => {
    switch (agent) {
      case "claude":
        return "Claude";
      case "gemini":
        return "Gemini";
      case "grok":
        return "Grok";
      case "chatgpt":
        return "ChatGPT";
      default:
        return agent;
    }
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "48px 16px" }}>
      <header style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px", color: "#172B4D" }}>
          プロンプト管理
        </h1>
        <p style={{ fontSize: "14px", color: "#6B778C" }}>
          各AIサービスへの指示文を管理できます。変更はすぐに反映されます。
        </p>
      </header>

      {successMessage && (
        <div style={{ marginBottom: "16px" }}>
          <Banner appearance="announcement">
            {successMessage}
          </Banner>
        </div>
      )}
      {errorMessage && (
        <div style={{ marginBottom: "16px" }}>
          <Banner appearance="error">
            {errorMessage}
          </Banner>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: "32px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6", display: "flex", alignItems: "center", gap: "8px" }}>
          <Spinner size="small" />
          <span style={{ fontSize: "14px", color: "#6B778C" }}>読み込み中...</span>
        </div>
      ) : error ? (
        <div style={{ padding: "32px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DE350B" }}>
          <div style={{ marginBottom: "16px" }}>
            <Banner appearance="error">
              エラー: {error.message || "データの取得に失敗しました"}
            </Banner>
          </div>
          <Button appearance="primary" onClick={() => void refetch()}>
            再試行
          </Button>
        </div>
      ) : !prompts || prompts.length === 0 ? (
        <EmptyState
          header="プロンプトが登録されていません"
          description="初期設定を実行してください"
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {(["claude", "gemini", "grok", "chatgpt"] as const).map((agent) => {
            const agentPrompts = groupedPrompts[agent] || [];
            if (!agentPrompts || agentPrompts.length === 0) return null;

            return (
              <section
                key={agent}
                style={{ padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}
              >
                <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D", textTransform: "capitalize" }}>
                  {getAgentName(agent)}
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {agentPrompts.map((prompt: PromptTemplate) => {
                    if (!prompt || !prompt.promptType) return null;
                    const info = PROMPT_INFO[prompt.promptType as PromptType];
                    if (!info) return null;
                    const isEditing = editingPrompt === prompt.promptType;

                    return (
                      <div
                        key={prompt.id}
                        style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6" }}
                      >
                        {isEditing ? (
                          <form
                            onSubmit={(e) =>
                              handleSubmit(e, prompt.promptType as PromptType)
                            }
                            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
                          >
                            <div>
                              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                                プロンプト名
                              </label>
                              <TextField
                                isRequired
                                type="text"
                                value={formData.name}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, name: (e.target as HTMLInputElement).value }))
                                }
                                style={{ width: "100%" }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                                説明
                              </label>
                              <TextField
                                type="text"
                                value={formData.description}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, description: (e.target as HTMLInputElement).value }))
                                }
                                style={{ width: "100%" }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                                プロンプト内容
                              </label>
                              <Textarea
                                isRequired
                                value={formData.prompt}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, prompt: (e.target as HTMLTextAreaElement).value }))
                                }
                                minimumRows={15}
                                style={{ width: "100%", fontFamily: "monospace" }}
                              />
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <Checkbox
                                isChecked={formData.isActive}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                                }
                              />
                              <label style={{ fontSize: "14px", color: "#42526E" }}>
                                有効
                              </label>
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <Button
                                type="submit"
                                appearance="primary"
                                isDisabled={upsertPrompt.isPending}
                              >
                                {upsertPrompt.isPending ? "保存中..." : "保存"}
                              </Button>
                              <Button
                                type="button"
                                appearance="default"
                                onClick={handleCancel}
                              >
                                キャンセル
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                              <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#172B4D" }}>
                                  {prompt.name || info.name}
                                </h3>
                                {prompt.description && (
                                  <p style={{ marginTop: "4px", fontSize: "14px", color: "#6B778C" }}>
                                    {prompt.description}
                                  </p>
                                )}
                                <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                                  <Badge appearance={prompt.isActive ? "added" : "removed"}>
                                    {prompt.isActive ? "有効" : "無効"}
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                appearance="default"
                                onClick={() => handleEdit(prompt.promptType as PromptType)}
                              >
                                編集
                              </Button>
                            </div>
                            <div style={{ marginTop: "16px", padding: "12px", borderRadius: "8px", background: "#F4F5F7" }}>
                              <p style={{ marginBottom: "8px", fontSize: "12px", fontWeight: 500, color: "#6B778C" }}>
                                プロンプト内容（プレビュー）
                              </p>
                              <pre style={{ maxHeight: "160px", overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "monospace", fontSize: "12px", color: "#42526E", margin: 0 }}>
                                {prompt.prompt && prompt.prompt.length > 200
                                  ? `${prompt.prompt.substring(0, 200)}...`
                                  : prompt.prompt || "(プロンプトが設定されていません)"}
                              </pre>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* 注意事項 */}
      <section style={{ marginTop: "32px", padding: "24px", borderRadius: "8px", border: "1px solid #FFC400", background: "#FFF7E6" }}>
        <Banner appearance="warning">
          <div>
            <strong style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 600, color: "#172B4D" }}>
              ⚠️ 重要な注意事項
            </strong>
            <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "12px", color: "#42526E" }}>
              <li>プロンプトを変更すると、AIの出力形式や内容が変わります</li>
              <li>変更後は実際の動作を確認してください</li>
              <li>プレースホルダー（例: {"${location}"}）はそのまま残してください</li>
            </ul>
          </div>
        </Banner>
      </section>
    </div>
  );
}
