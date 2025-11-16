"use client";

import { useState, useMemo } from "react";
import Button from "@atlaskit/button";
import TextField from "@atlaskit/textfield";
import Banner from "@atlaskit/banner";
import Badge from "@atlaskit/badge";
import Spinner from "@atlaskit/spinner";
import Select from "@atlaskit/select";
import { api } from "@/trpc/react";

const USER_ID_PLACEHOLDER = 1;

const PROVIDER_OPTIONS = [
  { label: "Claude API (Anthropic)", value: "claude" },
  { label: "ChatGPT API (OpenAI)", value: "chatgpt" },
];

export default function ApiKeyManagement() {
  const [formData, setFormData] = useState({
    geminiApiKey: "",
    grokApiKey: "",
    claudeApiKey: "",
    openaiApiKey: "",
    serpApiKey: "",
  });
  const [showKeys, setShowKeys] = useState({
    gemini: false,
    grok: false,
    claude: false,
    openai: false,
    serp: false,
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: status, refetch } = api.apiKey.getApiKeyStatus.useQuery();
  const healthCheckQuery = api.workflow.checkAIHealth.useQuery(undefined, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // ユーザー設定の取得
  const { data: userSettings, refetch: refetchUserSettings } = api.strategy.getUserSettings.useQuery({
    userId: USER_ID_PLACEHOLDER,
  });

  // 現在選択されているプロバイダーのオプションを計算
  const selectedProviderOption = useMemo(() => {
    const currentProvider = userSettings?.strategyAIProvider || "chatgpt";
    const found = PROVIDER_OPTIONS.find(opt => opt.value === currentProvider);
    console.log("[API Key Settings] Current provider:", currentProvider, "Found option:", found);
    // nullではなく、デフォルト値を返す
    return found || PROVIDER_OPTIONS[1]; // デフォルトはChatGPT
  }, [userSettings?.strategyAIProvider]);

  // AIプロバイダー設定の更新
  const updateUserSettings = api.strategy.updateUserSettings.useMutation({
    onSuccess: (data) => {
      console.log("[API Key Settings] Update successful:", data);
      setSuccessMessage(`戦略分析のAIプロバイダー設定を更新しました: ${data.strategyAIProvider === "chatgpt" ? "ChatGPT API" : "Claude API"}`);
      setErrorMessage(null);
      refetchUserSettings();
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (error: unknown) => {
      console.error("[API Key Settings] Update error:", error);
      let message = "エラーが発生しました";
      
      if (error && typeof error === "object" && "message" in error) {
        message = String(error.message);
      } else if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === "string") {
        message = error;
      }
      
      setErrorMessage(`設定の更新に失敗しました: ${message}`);
      setSuccessMessage(null);
      setTimeout(() => setErrorMessage(null), 10000);
    },
  });
  const setApiKeys = api.apiKey.setApiKeys.useMutation({
    onSuccess: () => {
      setSuccessMessage("APIキーを設定しました。変更を反映するには、サーバーを再起動してください。");
      setErrorMessage(null);
      refetch();
      setFormData({
        geminiApiKey: "",
        grokApiKey: "",
        claudeApiKey: "",
        openaiApiKey: "",
        serpApiKey: "",
      });
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      setErrorMessage(`エラー: ${message}`);
      setSuccessMessage(null);
      setTimeout(() => setErrorMessage(null), 5000);
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
    if (formData.serpApiKey.trim()) {
      keysToUpdate.serpApiKey = formData.serpApiKey.trim();
    }

    if (Object.keys(keysToUpdate).length === 0) {
      setErrorMessage("少なくとも1つのAPIキーを入力してください。");
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    setApiKeys.mutate(keysToUpdate);
  };

  const toggleShowKey = (key: keyof typeof showKeys) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      await healthCheckQuery.refetch();
      setTimeout(() => setIsTestingConnection(false), 1000);
    } catch (error) {
      setIsTestingConnection(false);
    }
  };

  const getAIStatusBadgeAppearance = (agent: string) => {
    if (!healthCheckQuery.data) return "removed";
    const agentStatus = healthCheckQuery.data.find((s) => s.agent === agent);
    if (!agentStatus) return "removed";
    switch (agentStatus.status) {
      case "healthy":
        return "added";
      case "unhealthy":
        return "removed";
      default:
        return "default";
    }
  };

  const getAIStatusText = (agent: string) => {
    if (!healthCheckQuery.data) return "未確認";
    const agentStatus = healthCheckQuery.data.find((s) => s.agent === agent);
    if (!agentStatus) return "未確認";
    switch (agentStatus.status) {
      case "healthy":
        return "接続成功";
      case "unhealthy":
        return "接続失敗";
      default:
        return "確認中";
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "48px 16px" }}>
      <header style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px", color: "#172B4D" }}>
          APIキー設定
        </h1>
        <p style={{ fontSize: "14px", color: "#6B778C" }}>
          AIサービスのAPIキーを設定してください。変更を反映するにはサーバーを再起動してください。
        </p>
      </header>

      {/* メッセージ表示 */}
      {successMessage && (
        <Banner appearance="announcement">
          {successMessage}
        </Banner>
      )}
      {errorMessage && (
        <Banner appearance="error">
          {errorMessage}
        </Banner>
      )}

      {/* APIキーの状態表示 */}
      <section style={{ marginBottom: "32px", padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#172B4D", margin: 0 }}>
            現在の設定状態
          </h2>
          <Button
            appearance="default"
            onClick={handleTestConnection}
            isDisabled={isTestingConnection || healthCheckQuery.isFetching}
          >
            {isTestingConnection || healthCheckQuery.isFetching ? (
              <>
                <Spinner size="small" />
                <span style={{ marginLeft: "8px" }}>接続確認中...</span>
              </>
            ) : (
              "接続を確認"
            )}
          </Button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
          <div style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    backgroundColor: status?.gemini ? "#36B37E" : "#DE350B",
                  }}
                />
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#42526E" }}>Gemini API</span>
              </div>
              <Badge appearance={status?.gemini ? "added" : "removed"}>
                {status?.gemini ? "設定済み" : "未設定"}
              </Badge>
            </div>
            {healthCheckQuery.data && (
              <div style={{ marginTop: "8px" }}>
                <Badge appearance={getAIStatusBadgeAppearance("gemini")}>
                  {getAIStatusText("gemini")}
                </Badge>
                {healthCheckQuery.data.find((s) => s.agent === "gemini")?.error && (
                  <p style={{ fontSize: "12px", color: "#DE350B", marginTop: "4px" }}>
                    {healthCheckQuery.data.find((s) => s.agent === "gemini")?.error}
                  </p>
                )}
              </div>
            )}
          </div>
          <div style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    backgroundColor: status?.grok ? "#36B37E" : "#DE350B",
                  }}
                />
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#42526E" }}>Grok API</span>
              </div>
              <Badge appearance={status?.grok ? "added" : "removed"}>
                {status?.grok ? "設定済み" : "未設定"}
              </Badge>
            </div>
            {healthCheckQuery.data && (
              <div style={{ marginTop: "8px" }}>
                <Badge appearance={getAIStatusBadgeAppearance("grok")}>
                  {getAIStatusText("grok")}
                </Badge>
                {healthCheckQuery.data.find((s) => s.agent === "grok")?.error && (
                  <p style={{ fontSize: "12px", color: "#DE350B", marginTop: "4px" }}>
                    {healthCheckQuery.data.find((s) => s.agent === "grok")?.error}
                  </p>
                )}
              </div>
            )}
          </div>
          <div style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    backgroundColor: status?.claude ? "#36B37E" : "#DE350B",
                  }}
                />
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#42526E" }}>Claude API</span>
              </div>
              <Badge appearance={status?.claude ? "added" : "removed"}>
                {status?.claude ? "設定済み" : "未設定"}
              </Badge>
            </div>
            {healthCheckQuery.data && (
              <div style={{ marginTop: "8px" }}>
                <Badge appearance={getAIStatusBadgeAppearance("claude")}>
                  {getAIStatusText("claude")}
                </Badge>
                {healthCheckQuery.data.find((s) => s.agent === "claude")?.error && (
                  <p style={{ fontSize: "12px", color: "#DE350B", marginTop: "4px" }}>
                    {healthCheckQuery.data.find((s) => s.agent === "claude")?.error}
                  </p>
                )}
              </div>
            )}
          </div>
          <div style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    backgroundColor: status?.openai ? "#36B37E" : "#DE350B",
                  }}
                />
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#42526E" }}>OpenAI API</span>
              </div>
              <Badge appearance={status?.openai ? "added" : "removed"}>
                {status?.openai ? "設定済み" : "未設定"}
              </Badge>
            </div>
            {healthCheckQuery.data && (
              <div style={{ marginTop: "8px" }}>
                <Badge appearance={getAIStatusBadgeAppearance("chatgpt")}>
                  {getAIStatusText("chatgpt")}
                </Badge>
                {healthCheckQuery.data.find((s) => s.agent === "chatgpt")?.error && (
                  <p style={{ fontSize: "12px", color: "#DE350B", marginTop: "4px" }}>
                    {healthCheckQuery.data.find((s) => s.agent === "chatgpt")?.error}
                  </p>
                )}
              </div>
            )}
          </div>
          <div style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    backgroundColor: status?.serp ? "#36B37E" : "#DE350B",
                  }}
                />
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#42526E" }}>SerpAPI (Web検索)</span>
              </div>
              <Badge appearance={status?.serp ? "added" : "removed"}>
                {status?.serp ? "設定済み" : "未設定"}
              </Badge>
            </div>
            <p style={{ fontSize: "12px", color: "#6B778C", marginTop: "8px", margin: 0 }}>
              最新情報取得用のWeb検索API
            </p>
          </div>
        </div>
        {healthCheckQuery.error && (
          <div style={{ marginTop: "16px" }}>
            <Banner appearance="error">
              接続確認エラー: {healthCheckQuery.error.message}
            </Banner>
          </div>
        )}
      </section>

      {/* APIキー設定フォーム */}
      <section style={{ marginBottom: "32px", padding: "32px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "24px", color: "#172B4D" }}>
          新しいAPIキーを設定
        </h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Gemini API Key */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#42526E" }}>Gemini API Key</span>
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "12px", color: "#0052CC", textDecoration: "none" }}
              >
                (取得方法)
              </a>
            </label>
            <div style={{ position: "relative" }}>
              <TextField
                type={showKeys.gemini ? "text" : "password"}
                placeholder="AIza..."
                value={formData.geminiApiKey}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, geminiApiKey: (e.target as HTMLInputElement).value }))
                }
                style={{ width: "100%" }}
              />
              <Button
                appearance="subtle"
                onClick={() => toggleShowKey("gemini")}
                style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)" }}
              >
                {showKeys.gemini ? "非表示" : "表示"}
              </Button>
            </div>
          </div>

          {/* Grok API Key */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#42526E" }}>Grok API Key</span>
              <a
                href="https://console.x.ai/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "12px", color: "#0052CC", textDecoration: "none" }}
              >
                (取得方法)
              </a>
            </label>
            <div style={{ position: "relative" }}>
              <TextField
                type={showKeys.grok ? "text" : "password"}
                placeholder="xai-..."
                value={formData.grokApiKey}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, grokApiKey: (e.target as HTMLInputElement).value }))
                }
                style={{ width: "100%" }}
              />
              <Button
                appearance="subtle"
                onClick={() => toggleShowKey("grok")}
                style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)" }}
              >
                {showKeys.grok ? "非表示" : "表示"}
              </Button>
            </div>
          </div>

          {/* Claude API Key */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#42526E" }}>Claude API Key</span>
              <a
                href="https://console.anthropic.com/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "12px", color: "#0052CC", textDecoration: "none" }}
              >
                (取得方法)
              </a>
            </label>
            <div style={{ position: "relative" }}>
              <TextField
                type={showKeys.claude ? "text" : "password"}
                placeholder="sk-ant-..."
                value={formData.claudeApiKey}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, claudeApiKey: (e.target as HTMLInputElement).value }))
                }
                style={{ width: "100%" }}
              />
              <Button
                appearance="subtle"
                onClick={() => toggleShowKey("claude")}
                style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)" }}
              >
                {showKeys.claude ? "非表示" : "表示"}
              </Button>
            </div>
          </div>

          {/* OpenAI API Key */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#42526E" }}>OpenAI API Key</span>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "12px", color: "#0052CC", textDecoration: "none" }}
              >
                (取得方法)
              </a>
            </label>
            <div style={{ position: "relative" }}>
              <TextField
                type={showKeys.openai ? "text" : "password"}
                placeholder="sk-..."
                value={formData.openaiApiKey}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, openaiApiKey: (e.target as HTMLInputElement).value }))
                }
                style={{ width: "100%" }}
              />
              <Button
                appearance="subtle"
                onClick={() => toggleShowKey("openai")}
                style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)" }}
              >
                {showKeys.openai ? "非表示" : "表示"}
              </Button>
            </div>
          </div>

          {/* SerpAPI Key */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#42526E" }}>SerpAPI Key (Web検索用)</span>
              <a
                href="https://serpapi.com/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "12px", color: "#0052CC", textDecoration: "none" }}
              >
                (取得方法)
              </a>
            </label>
            <div style={{ position: "relative" }}>
              <TextField
                type={showKeys.serp ? "text" : "password"}
                placeholder="serpapi..."
                value={formData.serpApiKey}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, serpApiKey: (e.target as HTMLInputElement).value }))
                }
                style={{ width: "100%" }}
              />
              <Button
                appearance="subtle"
                onClick={() => toggleShowKey("serp")}
                style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)" }}
              >
                {showKeys.serp ? "非表示" : "表示"}
              </Button>
            </div>
            <p style={{ fontSize: "12px", color: "#6B778C", marginTop: "4px", margin: 0 }}>
              最新情報を取得するために使用されます。トレンド分析・価格調査で最新のWeb情報を取得できます。
            </p>
          </div>

          <Button
            type="submit"
            appearance="primary"
            isDisabled={setApiKeys.isPending}
          >
            {setApiKeys.isPending ? "設定中..." : "APIキーを設定"}
          </Button>
        </form>
      </section>

      {/* 戦略分析AIプロバイダー設定 */}
      <section style={{ marginBottom: "32px", padding: "32px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#172B4D" }}>
          戦略分析で使用するAIプロバイダー
        </h2>
        <p style={{ fontSize: "14px", color: "#6B778C", marginBottom: "24px" }}>
          戦略分析（総合分析、価格設定提案、キャンペーン案生成、新施術提案）で使用するAIプロバイダーを選択できます。
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "8px", color: "#42526E" }}>
              AIプロバイダー
            </label>
            <Select
              options={PROVIDER_OPTIONS}
              value={selectedProviderOption}
              onChange={(option: unknown) => {
                console.log("[API Key Settings] Select onChange called:", option);
                console.log("[API Key Settings] Option type:", typeof option);
                console.log("[API Key Settings] Is array:", Array.isArray(option));
                console.log("[API Key Settings] Option keys:", option && typeof option === "object" ? Object.keys(option) : "N/A");
                
                // @atlaskit/selectのonChangeの型を確認
                // 単一選択の場合、optionは { label: string, value: string } または null
                let selectedValue: "claude" | "chatgpt" | null = null;
                
                if (option === null || option === undefined) {
                  console.log("[API Key Settings] Option is null/undefined, ignoring");
                  return;
                }
                
                // オブジェクトの場合
                if (typeof option === "object" && option !== null) {
                  // 配列の場合
                  if (Array.isArray(option)) {
                    if (option.length > 0) {
                      const firstOption = option[0];
                      if (firstOption && typeof firstOption === "object" && "value" in firstOption) {
                        selectedValue = firstOption.value as "claude" | "chatgpt";
                      }
                    }
                  } 
                  // 単一オブジェクトの場合
                  else if ("value" in option) {
                    selectedValue = (option as { value: string }).value as "claude" | "chatgpt";
                  }
                }
                
                if (selectedValue && (selectedValue === "claude" || selectedValue === "chatgpt")) {
                  console.log("[API Key Settings] Valid value selected, updating to:", selectedValue);
                  updateUserSettings.mutate({
                    userId: USER_ID_PLACEHOLDER,
                    strategyAIProvider: selectedValue,
                  });
                } else {
                  console.error("[API Key Settings] Invalid option format:", option);
                  setErrorMessage(`無効な選択値です: ${JSON.stringify(option)}`);
                  setTimeout(() => setErrorMessage(null), 5000);
                }
              }}
              isDisabled={updateUserSettings.isPending}
              placeholder="AIプロバイダーを選択"
              isClearable={false}
              isSearchable={false}
              menuPlacement="auto"
            />
          </div>
        </div>
        <div style={{ padding: "12px", borderRadius: "8px", background: "#F4F5F7", fontSize: "12px", color: "#6B778C" }}>
          <strong>現在の設定:</strong>{" "}
          {(userSettings?.strategyAIProvider || "chatgpt") === "chatgpt"
            ? "ChatGPT API (OpenAI) を使用します"
            : "Claude API (Anthropic) を使用します"}
          <br />
          <span style={{ marginTop: "4px", display: "block" }}>
            選択したプロバイダーのAPIキーが設定されていることを確認してください。
          </span>
        </div>
      </section>

      {/* 注意事項 */}
      <Banner appearance="warning">
        <div>
          <strong>⚠️ 重要な注意事項</strong>
          <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
            <li>APIキーを設定した後は、サーバーを再起動してください</li>
            <li>AIプロバイダーの変更は即座に反映されます（サーバー再起動不要）</li>
            <li>APIキーは安全に管理し、他人に共有しないでください</li>
            <li>.envファイルは.gitignoreに含まれており、バージョン管理されません</li>
            <li>本番環境では環境変数の直接編集は推奨されません</li>
          </ul>
        </div>
      </Banner>
    </div>
  );
}
