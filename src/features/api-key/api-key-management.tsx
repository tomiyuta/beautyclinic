"use client";

import { useState } from "react";
import Button from "@atlaskit/button";
import TextField from "@atlaskit/textfield";
import Banner from "@atlaskit/banner";
import Badge from "@atlaskit/badge";
import Spinner from "@atlaskit/spinner";
import { api } from "@/trpc/react";

export default function ApiKeyManagement() {
  const [formData, setFormData] = useState({
    geminiApiKey: "",
    grokApiKey: "",
    claudeApiKey: "",
    openaiApiKey: "",
    serpApiKey: "",
    pikaLabsApiKey: "",
    synthesiaApiKey: "",
  });
  const [showKeys, setShowKeys] = useState({
    gemini: false,
    grok: false,
    claude: false,
    openai: false,
    serp: false,
    pikaLabs: false,
    synthesia: false,
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: status, refetch } = api.apiKey.getApiKeyStatus.useQuery();
  const healthCheckQuery = api.workflow.checkAIHealth.useQuery(undefined, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);
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
        pikaLabsApiKey: "",
        synthesiaApiKey: "",
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
    if (formData.pikaLabsApiKey.trim()) {
      keysToUpdate.pikaLabsApiKey = formData.pikaLabsApiKey.trim();
    }
    if (formData.synthesiaApiKey.trim()) {
      keysToUpdate.synthesiaApiKey = formData.synthesiaApiKey.trim();
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
          <div style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    backgroundColor: status?.pikaLabs ? "#36B37E" : "#DE350B",
                  }}
                />
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#42526E" }}>Pika Labs API</span>
              </div>
              <Badge appearance={status?.pikaLabs ? "added" : "removed"}>
                {status?.pikaLabs ? "設定済み" : "未設定"}
              </Badge>
            </div>
            <p style={{ fontSize: "12px", color: "#6B778C", marginTop: "8px", margin: 0 }}>
              短尺動画生成（Instagram Reels, TikTok, YouTube Shorts）<br />
              <span style={{ fontSize: "11px" }}>fal-ai経由でPika 2.2モデルにアクセス</span>
            </p>
          </div>
          <div style={{ padding: "16px", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    backgroundColor: status?.synthesia ? "#36B37E" : "#DE350B",
                  }}
                />
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#42526E" }}>Synthesia API</span>
              </div>
              <Badge appearance={status?.synthesia ? "added" : "removed"}>
                {status?.synthesia ? "設定済み" : "未設定"}
              </Badge>
            </div>
            <p style={{ fontSize: "12px", color: "#6B778C", marginTop: "8px", margin: 0 }}>
              施術説明動画生成（AIアバターを使用した説明動画）
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

          {/* Pika Labs API Key (fal-ai経由) */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#42526E" }}>Pika Labs API Key (fal-ai)</span>
              <a
                href="https://fal.ai/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "12px", color: "#0052CC", textDecoration: "none" }}
              >
                (取得方法)
              </a>
            </label>
            <p style={{ fontSize: "12px", color: "#6B778C", marginBottom: "8px", marginTop: "0" }}>
              fal-ai経由でPika 2.2モデルにアクセスします。FAL_KEYとして設定されます。
            </p>
            <div style={{ position: "relative" }}>
              <TextField
                type={showKeys.pikaLabs ? "text" : "password"}
                placeholder="pika-..."
                value={formData.pikaLabsApiKey}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, pikaLabsApiKey: (e.target as HTMLInputElement).value }))
                }
                style={{ width: "100%" }}
              />
              <Button
                appearance="subtle"
                onClick={() => toggleShowKey("pikaLabs")}
                style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)" }}
              >
                {showKeys.pikaLabs ? "非表示" : "表示"}
              </Button>
            </div>
            <p style={{ fontSize: "12px", color: "#6B778C", marginTop: "4px", margin: 0 }}>
              fal-ai経由でPika 2.2モデルにアクセス。短尺動画生成（Instagram Reels, TikTok, YouTube Shorts）に使用されます。
            </p>
          </div>

          {/* Synthesia API Key */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#42526E" }}>Synthesia API Key</span>
              <a
                href="https://www.synthesia.io/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "12px", color: "#0052CC", textDecoration: "none" }}
              >
                (取得方法)
              </a>
            </label>
            <div style={{ position: "relative" }}>
              <TextField
                type={showKeys.synthesia ? "text" : "password"}
                placeholder="synthesia-..."
                value={formData.synthesiaApiKey}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, synthesiaApiKey: (e.target as HTMLInputElement).value }))
                }
                style={{ width: "100%" }}
              />
              <Button
                appearance="subtle"
                onClick={() => toggleShowKey("synthesia")}
                style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)" }}
              >
                {showKeys.synthesia ? "非表示" : "表示"}
              </Button>
            </div>
            <p style={{ fontSize: "12px", color: "#6B778C", marginTop: "4px", margin: 0 }}>
              施術説明動画生成（AIアバターを使用した説明動画）に使用されます。
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

      {/* 注意事項 */}
      <Banner appearance="warning">
        <div>
          <strong>⚠️ 重要な注意事項</strong>
          <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
            <li>APIキーを設定した後は、サーバーを再起動してください</li>
            <li>APIキーは安全に管理し、他人に共有しないでください</li>
            <li>.envファイルは.gitignoreに含まれており、バージョン管理されません</li>
            <li>本番環境では環境変数の直接編集は推奨されません</li>
          </ul>
        </div>
      </Banner>
    </div>
  );
}
