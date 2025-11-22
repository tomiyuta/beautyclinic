"use client";

import TextField from "@atlaskit/textfield";
import Textarea from "@atlaskit/textarea";
import Banner from "@atlaskit/banner";
import Button from "@atlaskit/button";
import Spinner from "@atlaskit/spinner";
import type { ContentGenerationFormState, ContentCategory } from "../hooks/useContentGenerationFormState";

interface CampaignInfoFieldsProps {
  formState: ContentGenerationFormState;
  contentCategory: ContentCategory;
  onCampaignDescriptionChange: (value: string) => void;
  onApplySuggestion: (original: string, suggestion: string) => void;
}

export function CampaignInfoFields({
  formState,
  contentCategory,
  onCampaignDescriptionChange,
  onApplySuggestion,
}: CampaignInfoFieldsProps) {
  const { campaign, compliance } = formState;
  const { realtimeCompliance, highlightedText, isCheckingCompliance } = compliance;

  return (
    <>
      <div>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: 500,
            color: "#42526E",
          }}
        >
          キャンペーン名 *
        </label>
        <TextField
          isRequired
          type="text"
          value={campaign.campaignTitle}
          onChange={(e) => campaign.setCampaignTitle((e.target as HTMLInputElement).value)}
          placeholder="例：11月限定 ダーマペンキャンペーン"
          style={{ width: "100%" }}
        />
      </div>

      <div>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: 500,
            color: "#42526E",
          }}
        >
          キャンペーン説明 *
        </label>
        <div>
          <Textarea
            isRequired
            value={campaign.campaignDescription}
            onChange={(e) => onCampaignDescriptionChange((e.target as HTMLTextAreaElement).value)}
            placeholder="キャンペーンの詳細な説明を入力してください"
            minimumRows={4}
            style={{ width: "100%" }}
          />
          {/* リアルタイムコンプライアンスチェック表示 */}
          {realtimeCompliance && (contentCategory === "text" || contentCategory === "image") && (
            <div style={{ marginTop: "8px" }}>
              {realtimeCompliance.status === "violation" && (
                <div style={{ marginBottom: "8px" }}>
                  <Banner appearance="error">
                    <div style={{ fontSize: "14px" }}>
                      <strong>禁止フレーズが検出されました:</strong>
                      <ul style={{ margin: "4px 0 0 20px", padding: 0 }}>
                        {realtimeCompliance.foundPhrases.map((phrase, i) => (
                          <li key={i}>{phrase}</li>
                        ))}
                      </ul>
                    </div>
                  </Banner>

                  {/* 問題箇所のハイライト表示 */}
                  {highlightedText && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "12px",
                        background: "#F4F5F7",
                        borderRadius: "4px",
                        border: "1px solid #DFE1E6",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#172B4D",
                          marginBottom: "4px",
                        }}
                      >
                        問題箇所（赤色でハイライト）:
                      </div>
                      <div
                        style={{ fontSize: "14px", lineHeight: "1.6", color: "#172B4D" }}
                        dangerouslySetInnerHTML={{ __html: highlightedText }}
                      />
                    </div>
                  )}

                  {/* 代替案の自動提示 */}
                  {realtimeCompliance.suggestions && realtimeCompliance.suggestions.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "12px",
                        background: "#E3FCEF",
                        borderRadius: "4px",
                        border: "1px solid #36B37E",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#172B4D",
                          marginBottom: "8px",
                        }}
                      >
                        推奨される代替表現:
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {realtimeCompliance.suggestions.map(
                          (suggestion: { original: string; suggestion: string }, i: number) => (
                            <div
                              key={i}
                              style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}
                            >
                              <span style={{ color: "#C62828" }}>「{suggestion.original}」</span>
                              <span>→</span>
                              <span style={{ color: "#36B37E", fontWeight: 600 }}>
                                「{suggestion.suggestion}」
                              </span>
                              <Button
                                appearance="subtle"
                                onClick={() => onApplySuggestion(suggestion.original, suggestion.suggestion)}
                              >
                                適用
                              </Button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* 自動修正されたテキストを表示 */}
                  {realtimeCompliance.cleanedText &&
                    realtimeCompliance.cleanedText !== campaign.campaignDescription && (
                      <div
                        style={{
                          marginTop: "8px",
                          padding: "12px",
                          background: "#FFF4E5",
                          borderRadius: "4px",
                          border: "1px solid #FFC400",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#172B4D",
                            marginBottom: "4px",
                          }}
                        >
                          自動修正案:
                        </div>
                        <div
                          style={{
                            fontSize: "14px",
                            lineHeight: "1.6",
                            color: "#172B4D",
                            marginBottom: "8px",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {realtimeCompliance.cleanedText}
                        </div>
                        <Button
                          appearance="default"
                          onClick={() => {
                            campaign.setCampaignDescription(realtimeCompliance.cleanedText || "");
                            onCampaignDescriptionChange(realtimeCompliance.cleanedText || "");
                          }}
                        >
                          自動修正を適用
                        </Button>
                      </div>
                    )}
                </div>
              )}
              {realtimeCompliance.status === "warning" && realtimeCompliance.warnings.length > 0 && (
                <Banner appearance="warning">
                  <div style={{ fontSize: "14px" }}>
                    <strong>警告:</strong>
                    <ul style={{ margin: "4px 0 0 20px", padding: 0 }}>
                      {realtimeCompliance.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </Banner>
              )}
              {realtimeCompliance.status === "compliant" && !isCheckingCompliance && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#36B37E" }}>
                  <span>✓</span>
                  <span>医療広告ガイドラインに準拠しています</span>
                </div>
              )}
              {isCheckingCompliance && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#6B778C" }}>
                  <Spinner size="small" />
                  <span>コンプライアンスチェック中...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: 500,
            color: "#42526E",
          }}
        >
          ターゲット層
        </label>
        <TextField
          type="text"
          value={campaign.targetAudience}
          onChange={(e) => campaign.setTargetAudience((e.target as HTMLInputElement).value)}
          placeholder="例：20-50代の美容に興味のある女性"
          style={{ width: "100%" }}
        />
      </div>
    </>
  );
}


