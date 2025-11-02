"use client";

import { useState } from "react";
import { api } from "@/trpc/react";

export default function ApiKeyManagement() {
  const [formData, setFormData] = useState({
    geminiApiKey: "",
    grokApiKey: "",
    claudeApiKey: "",
    openaiApiKey: "",
  });
  const [showKeys, setShowKeys] = useState({
    gemini: false,
    grok: false,
    claude: false,
    openai: false,
  });

  const { data: status, refetch } = api.apiKey.getApiKeyStatus.useQuery();
  const setApiKeys = api.apiKey.setApiKeys.useMutation({
    onSuccess: () => {
      alert("APIキーを設定しました。変更を反映するには、サーバーを再起動してください。");
      refetch();
      // フォームをクリア
      setFormData({
        geminiApiKey: "",
        grokApiKey: "",
        claudeApiKey: "",
        openaiApiKey: "",
      });
    },
    onError: (error) => {
      alert(`エラー: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const keysToUpdate: Record<string, string> = {};
    
    if (formData.geminiApiKey.trim()) {
      keysToUpdate.geminiApiKey = formData.geminiApiKey.trim();
    }
    if (formData.grokApiKey.trim()) {
      keysToUpdate.grokApiKey = formData.grokApiKey.trim();
    }
    if (formData.claudeApiKey.trim()) {
      keysToUpdate.claudeApiKey = formData.claudeApiKey.trim();
    }
    if (formData.openaiApiKey.trim()) {
      keysToUpdate.openaiApiKey = formData.openaiApiKey.trim();
    }

    if (Object.keys(keysToUpdate).length === 0) {
      alert("少なくとも1つのAPIキーを入力してください。");
      return;
    }

    setApiKeys.mutate(keysToUpdate);
  };

  const toggleShowKey = (key: keyof typeof showKeys) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">APIキー設定</h1>
        <p className="text-sm text-zinc-600">
          AIサービスのAPIキーを設定してください。変更を反映するにはサーバーを再起動してください。
        </p>
      </header>

      {/* APIキーの状態表示 */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">現在の設定状態</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center gap-3">
              <div
                className={`size-3 rounded-full ${status?.gemini ? "bg-green-500" : "bg-red-500"}`}
              />
              <span className="text-sm font-medium text-zinc-700">Gemini API</span>
            </div>
            <span className="text-xs text-zinc-500">
              {status?.gemini ? "設定済み" : "未設定"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center gap-3">
              <div
                className={`size-3 rounded-full ${status?.grok ? "bg-green-500" : "bg-red-500"}`}
              />
              <span className="text-sm font-medium text-zinc-700">Grok API</span>
            </div>
            <span className="text-xs text-zinc-500">{status?.grok ? "設定済み" : "未設定"}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center gap-3">
              <div
                className={`size-3 rounded-full ${status?.claude ? "bg-green-500" : "bg-red-500"}`}
              />
              <span className="text-sm font-medium text-zinc-700">Claude API</span>
            </div>
            <span className="text-xs text-zinc-500">
              {status?.claude ? "設定済み" : "未設定"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4">
            <div className="flex items-center gap-3">
              <div
                className={`size-3 rounded-full ${status?.openai ? "bg-green-500" : "bg-red-500"}`}
              />
              <span className="text-sm font-medium text-zinc-700">OpenAI API</span>
            </div>
            <span className="text-xs text-zinc-500">
              {status?.openai ? "設定済み" : "未設定"}
            </span>
          </div>
        </div>
      </section>

      {/* APIキー設定フォーム */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-zinc-900">新しいAPIキーを設定</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Gemini API Key */}
          <label className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-700">Gemini API Key</span>
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                (取得方法)
              </a>
            </div>
            <div className="relative">
              <input
                type={showKeys.gemini ? "text" : "password"}
                placeholder="AIza..."
                value={formData.geminiApiKey}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, geminiApiKey: e.target.value }))
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 pr-10 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                type="button"
                onClick={() => toggleShowKey("gemini")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-700"
              >
                {showKeys.gemini ? "非表示" : "表示"}
              </button>
            </div>
          </label>

          {/* Grok API Key */}
          <label className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-700">Grok API Key</span>
              <a
                href="https://console.x.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                (取得方法)
              </a>
            </div>
            <div className="relative">
              <input
                type={showKeys.grok ? "text" : "password"}
                placeholder="xai-..."
                value={formData.grokApiKey}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, grokApiKey: e.target.value }))
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 pr-10 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                type="button"
                onClick={() => toggleShowKey("grok")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-700"
              >
                {showKeys.grok ? "非表示" : "表示"}
              </button>
            </div>
          </label>

          {/* Claude API Key */}
          <label className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-700">Claude API Key</span>
              <a
                href="https://console.anthropic.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                (取得方法)
              </a>
            </div>
            <div className="relative">
              <input
                type={showKeys.claude ? "text" : "password"}
                placeholder="sk-ant-..."
                value={formData.claudeApiKey}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, claudeApiKey: e.target.value }))
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 pr-10 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                type="button"
                onClick={() => toggleShowKey("claude")}
                className="absolute right-2 text-xs text-zinc-500 hover:text-zinc-700"
              >
                {showKeys.claude ? "非表示" : "表示"}
              </button>
            </div>
          </label>

          {/* OpenAI API Key */}
          <label className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-700">OpenAI API Key</span>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                (取得方法)
              </a>
            </div>
            <div className="relative">
              <input
                type={showKeys.openai ? "text" : "password"}
                placeholder="sk-..."
                value={formData.openaiApiKey}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, openaiApiKey: e.target.value }))
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 pr-10 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                type="button"
                onClick={() => toggleShowKey("openai")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-700"
              >
                {showKeys.openai ? "非表示" : "表示"}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={setApiKeys.isPending}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {setApiKeys.isPending ? "設定中..." : "APIキーを設定"}
          </button>
        </form>
      </section>

      {/* 注意事項 */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h3 className="mb-2 text-sm font-semibold text-amber-900">⚠️ 重要な注意事項</h3>
        <ul className="space-y-1 text-xs text-amber-800">
          <li>• APIキーを設定した後は、サーバーを再起動してください</li>
          <li>• APIキーは安全に管理し、他人に共有しないでください</li>
          <li>• .envファイルは.gitignoreに含まれており、バージョン管理されません</li>
          <li>• 本番環境では環境変数の直接編集は推奨されません</li>
        </ul>
      </section>
    </div>
  );
}

