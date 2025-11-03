"use client";

import { useState } from "react";
import { api } from "@/trpc/react";

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
      alert("プロンプトを保存しました");
      void refetch();
      setEditingPrompt(null);
    },
    onError: (error) => {
      alert(`エラー: ${error.message || "プロンプトの保存に失敗しました"}`);
    },
  });

  const [editingPrompt, setEditingPrompt] = useState<PromptType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    prompt: "",
    isActive: true,
  });

  const handleEdit = (promptType: PromptType) => {
    const prompt = prompts?.find((p) => p.promptType === promptType);
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
      alert("無効なプロンプトタイプです");
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

  const groupedPrompts = prompts?.reduce(
    (acc, prompt) => {
      if (!prompt || !prompt.aiAgent) return acc;
      const agent = prompt.aiAgent as "claude" | "gemini" | "grok" | "chatgpt";
      if (!acc[agent]) {
        acc[agent] = [];
      }
      acc[agent]!.push(prompt);
      return acc;
    },
    {} as Record<"claude" | "gemini" | "grok" | "chatgpt", typeof prompts>,
  ) || {};

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">プロンプト管理</h1>
        <p className="text-sm text-zinc-600">
          各AIサービスへの指示文を管理できます。変更はすぐに反映されます。
        </p>
      </header>

      {isLoading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-zinc-600">読み込み中...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 shadow-sm">
          <p className="text-sm font-medium text-red-900">
            エラー: {error.message || "データの取得に失敗しました"}
          </p>
          <button
            onClick={() => void refetch()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
          >
            再試行
          </button>
        </div>
      ) : !prompts || prompts.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-zinc-600">
            プロンプトが登録されていません。初期設定を実行してください。
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {(["claude", "gemini", "grok", "chatgpt"] as const).map((agent) => {
            const agentPrompts = groupedPrompts[agent] || [];
            if (!agentPrompts || agentPrompts.length === 0) return null;

            return (
              <section
                key={agent}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <h2 className="mb-4 text-lg font-semibold text-zinc-900 capitalize">
                  {agent === "claude"
                    ? "Claude"
                    : agent === "gemini"
                      ? "Gemini"
                      : agent === "grok"
                        ? "Grok"
                        : "ChatGPT"}
                </h2>
                <div className="space-y-4">
                  {agentPrompts.map((prompt) => {
                    if (!prompt || !prompt.promptType) return null;
                    const info = PROMPT_INFO[prompt.promptType as PromptType];
                    if (!info) return null;
                    const isEditing = editingPrompt === prompt.promptType;

                    return (
                      <div
                        key={prompt.id}
                        className="rounded-lg border border-zinc-200 p-4"
                      >
                        {isEditing ? (
                          <form
                            onSubmit={(e) =>
                              handleSubmit(e, prompt.promptType as PromptType)
                            }
                            className="space-y-4"
                          >
                            <div>
                              <label className="mb-2 block text-sm font-medium text-zinc-700">
                                プロンプト名
                              </label>
                              <input
                                type="text"
                                value={formData.name}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                                }
                                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                required
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-medium text-zinc-700">
                                説明
                              </label>
                              <input
                                type="text"
                                value={formData.description}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                                }
                                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              />
                            </div>
                            <div>
                              <label className="mb-2 block text-sm font-medium text-zinc-700">
                                プロンプト内容
                              </label>
                              <textarea
                                value={formData.prompt}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, prompt: e.target.value }))
                                }
                                rows={15}
                                className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                required
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`active-${prompt.id}`}
                                checked={formData.isActive}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                                }
                                className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                              />
                              <label
                                htmlFor={`active-${prompt.id}`}
                                className="text-sm text-zinc-700"
                              >
                                有効
                              </label>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={upsertPrompt.isPending}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {upsertPrompt.isPending ? "保存中..." : "保存"}
                              </button>
                              <button
                                type="button"
                                onClick={handleCancel}
                                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                              >
                                キャンセル
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="text-base font-semibold text-zinc-900">
                                  {prompt.name || info.name}
                                </h3>
                                {prompt.description && (
                                  <p className="mt-1 text-sm text-zinc-600">
                                    {prompt.description}
                                  </p>
                                )}
                                <div className="mt-2 flex items-center gap-2">
                                  <span
                                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                                      prompt.isActive
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {prompt.isActive ? "有効" : "無効"}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleEdit(prompt.promptType as PromptType)}
                                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                              >
                                編集
                              </button>
                            </div>
                            <div className="mt-4 rounded-lg bg-zinc-50 p-3">
                              <p className="mb-2 text-xs font-medium text-zinc-600">
                                プロンプト内容（プレビュー）
                              </p>
                              <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-zinc-700">
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
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h3 className="mb-2 text-sm font-semibold text-amber-900">⚠️ 重要な注意事項</h3>
        <ul className="space-y-1 text-xs text-amber-800">
          <li>• プロンプトを変更すると、AIの出力形式や内容が変わります</li>
          <li>• 変更後は実際の動作を確認してください</li>
          <li>• プレースホルダー（例: {"${location}"}）はそのまま残してください</li>
        </ul>
      </section>
    </div>
  );
}


