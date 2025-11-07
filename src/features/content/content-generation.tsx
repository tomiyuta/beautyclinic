"use client";

import { useState, useRef } from "react";
import html2canvas from "html2canvas";

import { api } from "@/trpc/react";
import { TRPCClientError } from "@trpc/client";

const USER_ID_PLACEHOLDER = 1;

// Instagram LPの視覚的プレビューコンポーネント
function InstagramLPPreview({ content, onExportImage }: { content: unknown; onExportImage?: (element: HTMLElement) => void }) {
  // テキスト形式のコンテンツを解析して構造化
  const contentText = typeof content === "string" ? content : String(content);
  
  // テキストから情報を抽出（Markdownや構造化されたテキストを解析）
  const parseContent = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    let title = '';
    let headline = '';
    let description = '';
    const keyPoints: string[] = [];
    const benefits: string[] = [];
    let callToAction = '';
    const hashtags: string[] = [];
    
    let currentSection = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      
      // セクション判定
      if (line.includes('タイトル') || line.includes('タイトル:')) {
        currentSection = 'title';
        title = line.replace(/.*[:：]\s*/, '').trim() || lines[i + 1]?.trim() || '';
        if (title) i++;
        continue;
      }
      if (line.includes('ヘッドライン') || line.includes('メインヘッドライン')) {
        currentSection = 'headline';
        headline = line.replace(/.*[:：]\s*/, '').trim() || lines[i + 1]?.trim() || '';
        if (headline) i++;
        continue;
      }
      if (line.includes('説明') || line.includes('説明文')) {
        currentSection = 'description';
        continue;
      }
      if (line.includes('ポイント') || line.includes('キーポイント') || line.includes('主要ポイント')) {
        currentSection = 'keyPoints';
        continue;
      }
      if (line.includes('メリット') || line.includes('特典') || line.includes('ベネフィット')) {
        currentSection = 'benefits';
        continue;
      }
      if (line.includes('行動喚起') || line.includes('CTA') || line.includes('コールトゥアクション')) {
        currentSection = 'cta';
        callToAction = line.replace(/.*[:：]\s*/, '').trim() || lines[i + 1]?.trim() || '';
        if (callToAction) i++;
        continue;
      }
      if (line.includes('ハッシュタグ') || line.includes('ハッシュタッグ')) {
        currentSection = 'hashtags';
        continue;
      }
      
      // 内容の抽出
      if (currentSection === 'title' && !title && line) title = line;
      else if (currentSection === 'headline' && !headline && line) headline = line;
      else if (currentSection === 'description' && line && !line.startsWith('-') && !line.startsWith('•') && !line.startsWith('*')) {
        description += (description ? '\n' : '') + line;
      }
      else if (currentSection === 'keyPoints' && (line.startsWith('-') || line.startsWith('•') || line.startsWith('*') || line.startsWith('✓'))) {
        keyPoints.push(line.replace(/^[-•*✓]\s*/, '').trim());
      }
      else if (currentSection === 'benefits' && (line.startsWith('-') || line.startsWith('•') || line.startsWith('*'))) {
        benefits.push(line.replace(/^[-•*]\s*/, '').trim());
      }
      else if (currentSection === 'cta' && !callToAction && line) callToAction = line;
      else if (currentSection === 'hashtags' && (line.includes('#') || line.match(/^[#＃]/))) {
        const tags = line.match(/#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g) || [];
        hashtags.push(...tags.map(t => t.replace('#', '')));
      }
    }
    
    // フォールバック: 最初の数行からタイトルや説明を抽出
    if (!title && !headline && lines.length > 0) {
      headline = lines[0]!;
    }
    if (!description && lines.length > 1) {
      description = lines.slice(1, 4).join('\n');
    }
    
    return { title, headline, description, keyPoints, benefits, callToAction, hashtags };
  };
  
  const parsed = parseContent(contentText);
  const displayTitle = parsed.title || parsed.headline || '';
  const displayDescription = parsed.description || contentText.split('\n').slice(1, 4).join('\n') || contentText;

  const previewRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-2">
      {onExportImage && (
        <button
          onClick={() => {
            if (previewRef.current) {
              onExportImage(previewRef.current);
            }
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          📥 画像としてダウンロード
        </button>
      )}
      <div ref={previewRef} className="mx-auto max-w-md rounded-lg border-2 border-zinc-300 bg-white shadow-lg" style={{ width: '400px' }}>
        {/* Instagram風のヘッダー */}
        <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3 bg-white">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"></div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-zinc-900">美容クリニック</div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="p-6 bg-white">
          {/* タイトルまたはヘッドライン */}
          {displayTitle && (
            <h3 className="mb-4 text-xl font-bold text-zinc-900 leading-tight">
              {displayTitle}
            </h3>
          )}

          {/* 説明文 */}
          {displayDescription && (
            <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-zinc-700">
              {displayDescription}
            </p>
          )}

          {/* キーポイント */}
          {parsed.keyPoints.length > 0 && (
            <div className="mb-4 space-y-2">
              {parsed.keyPoints.map((point, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="mt-1 text-blue-600 font-bold">✓</span>
                  <span className="flex-1 text-sm text-zinc-700">{point}</span>
                </div>
              ))}
            </div>
          )}

          {/* ベネフィット */}
          {parsed.benefits.length > 0 && (
            <div className="mb-4 rounded-lg bg-gradient-to-r from-pink-50 to-purple-50 p-4">
              <h4 className="mb-2 text-sm font-semibold text-zinc-900">✨ 特典</h4>
              <ul className="space-y-1">
                {parsed.benefits.map((benefit, index) => (
                  <li key={index} className="text-sm text-zinc-700">
                    • {benefit}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* コールトゥアクション */}
          {parsed.callToAction && (
            <button className="mb-4 w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-3 text-base font-semibold text-white transition hover:from-pink-600 hover:to-purple-600 shadow-md">
              {parsed.callToAction}
            </button>
          )}

          {/* ハッシュタグ */}
          {parsed.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-3">
              {parsed.hashtags.map((tag, index) => (
                <span
                  key={index}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  #{tag.replace(/^#/, "")}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* フッター（いいね、コメントなど） */}
        <div className="border-t border-zinc-200 px-4 py-3 bg-white">
          <div className="flex items-center gap-4 text-base text-zinc-500">
            <span className="text-xl">❤️</span>
            <span className="text-xl">💬</span>
            <span className="text-xl">📤</span>
            <span className="ml-auto text-xs">{new Date().toLocaleDateString("ja-JP")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContentGeneration() {
  const [contentType, setContentType] = useState<
    "instagram_lp" | "website_article" | "campaign_copy" | ""
  >("");
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [promotion, setPromotion] = useState("");
  const [designApproach, setDesignApproach] = useState<
    "minimal" | "bold" | "elegant" | "trendy"
  >("trendy");
  const [lpCount, setLpCount] = useState(3);
  const [tone, setTone] = useState<"professional" | "friendly" | "trendy">(
    "friendly",
  );
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [previewContent, setPreviewContent] = useState<{
    type: string;
    data: unknown;
  } | null>(null);

  const utils = api.useUtils();

  const instagramLPMutation = api.content.generateInstagramLP.useMutation({
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "Instagram LP案が生成されました",
      });
      void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
      resetForm();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      setFeedback({ type: "error", message });
    },
  });

  const articleMutation = api.content.generateWebsiteArticle.useMutation({
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "HP記事が生成されました",
      });
      void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
      resetForm();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      setFeedback({ type: "error", message });
    },
  });

  const copyMutation = api.content.generateCampaignCopy.useMutation({
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "キャンペーンコピーが生成されました",
      });
      void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
      resetForm();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      setFeedback({ type: "error", message });
    },
  });

  const contentsQuery = api.content.list.useQuery({
    userId: USER_ID_PLACEHOLDER,
  });

  const resetForm = () => {
    setCampaignTitle("");
    setCampaignDescription("");
    setTargetAudience("");
    setPromotion("");
    setSeoKeywords([]);
    setKeywordInput("");
  };

  const handleExportImage = async (element: HTMLElement) => {
    try {
      // LP部分のみをキャプチャ（ボタンは親要素にあるので影響しない）
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2, // 高解像度で出力
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        useCORS: true,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });
      
      // 画像をダウンロード
      const url = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.download = `instagram-lp-${Date.now()}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setFeedback({
        type: "success",
        message: "画像をダウンロードしました",
      });
    } catch (error) {
      console.error("画像出力エラー:", error);
      setFeedback({
        type: "error",
        message: "画像の出力に失敗しました",
      });
    }
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !seoKeywords.includes(keywordInput.trim())) {
      setSeoKeywords([...seoKeywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setSeoKeywords(seoKeywords.filter((k) => k !== keyword));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback({ type: null, message: "" });
    setPreviewContent(null);

    if (!contentType) {
      setFeedback({
        type: "error",
        message: "コンテンツタイプを選択してください",
      });
      return;
    }

    if (!campaignTitle.trim() || !campaignDescription.trim()) {
      setFeedback({
        type: "error",
        message: "キャンペーン名と説明を入力してください",
      });
      return;
    }

    try {
      if (contentType === "instagram_lp") {
        const result = await instagramLPMutation.mutateAsync({
          userId: USER_ID_PLACEHOLDER,
          campaignTitle: campaignTitle.trim(),
          campaignDescription: campaignDescription.trim(),
          targetAudience: targetAudience.trim() || undefined,
          promotion: promotion.trim() || undefined,
          designApproach,
          count: lpCount,
        });
        setPreviewContent({
          type: "instagram_lp",
          data: result,
        });
      } else if (contentType === "website_article") {
        const result = await articleMutation.mutateAsync({
          userId: USER_ID_PLACEHOLDER,
          campaignTitle: campaignTitle.trim(),
          campaignDescription: campaignDescription.trim(),
          targetAudience: targetAudience.trim() || undefined,
          seoKeywords: seoKeywords.length > 0 ? seoKeywords : undefined,
        });
        setPreviewContent({
          type: "website_article",
          data: result,
        });
      } else if (contentType === "campaign_copy") {
        const result = await copyMutation.mutateAsync({
          userId: USER_ID_PLACEHOLDER,
          campaignTitle: campaignTitle.trim(),
          campaignDescription: campaignDescription.trim(),
          targetAudience: targetAudience.trim() || undefined,
          promotion: promotion.trim() || undefined,
          tone,
        });
        setPreviewContent({
          type: "campaign_copy",
          data: result,
        });
      }
    } catch (error) {
      if (error instanceof TRPCClientError) {
        setFeedback({ type: "error", message: error.message });
      }
    }
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case "instagram_lp":
        return "Instagram LP";
      case "website_article":
        return "HP記事";
      case "campaign_copy":
        return "キャンペーンコピー";
      default:
        return type;
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">コンテンツ生成</h1>
        <p className="text-sm text-zinc-600">
          キャンペーン用のマーケティング素材を自動生成します
        </p>
      </header>

      {feedback.type && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            feedback.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              コンテンツタイプ *
            </label>
            <select
              required
              value={contentType}
              onChange={(e) =>
                setContentType(
                  e.target.value as
                    | "instagram_lp"
                    | "website_article"
                    | "campaign_copy"
                    | "",
                )
              }
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">選択してください</option>
              <option value="instagram_lp">Instagram用LP案</option>
              <option value="website_article">HP記事</option>
              <option value="campaign_copy">キャンペーンコピー</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              キャンペーン名 *
            </label>
            <input
              required
              type="text"
              value={campaignTitle}
              onChange={(e) => setCampaignTitle(e.target.value)}
              placeholder="例：11月限定 ダーマペンキャンペーン"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              キャンペーン説明 *
            </label>
            <textarea
              required
              value={campaignDescription}
              onChange={(e) => setCampaignDescription(e.target.value)}
              rows={4}
              placeholder="キャンペーンの詳細な説明を入力してください"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              ターゲット層
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="例：20-50代の美容に興味のある女性"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {contentType === "instagram_lp" && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  プロモーション内容
                </label>
                <input
                  type="text"
                  value={promotion}
                  onChange={(e) => setPromotion(e.target.value)}
                  placeholder="例：初回20%OFF、2回目以降10%OFF"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  デザインアプローチ
                </label>
                <select
                  value={designApproach}
                  onChange={(e) =>
                    setDesignApproach(
                      e.target.value as
                        | "minimal"
                        | "bold"
                        | "elegant"
                        | "trendy",
                    )
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="trendy">トレンディ</option>
                  <option value="minimal">ミニマル</option>
                  <option value="bold">大胆</option>
                  <option value="elegant">エレガント</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  生成件数
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={lpCount}
                  onChange={(e) => setLpCount(Number.parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </>
          )}

          {contentType === "website_article" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                SEOキーワード
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                  placeholder="例：美容皮膚科、ダーマペン"
                  className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <button
                  type="button"
                  onClick={handleAddKeyword}
                  className="rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200"
                >
                  追加
                </button>
              </div>
              {seoKeywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {seoKeywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(keyword)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {contentType === "campaign_copy" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                トーン
              </label>
              <select
                value={tone}
                onChange={(e) =>
                  setTone(
                    e.target.value as "professional" | "friendly" | "trendy",
                  )
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="friendly">親しみやすい</option>
                <option value="professional">プロフェッショナル</option>
                <option value="trendy">トレンディ</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={
              instagramLPMutation.isPending ||
              articleMutation.isPending ||
              copyMutation.isPending
            }
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {instagramLPMutation.isPending ||
            articleMutation.isPending ||
            copyMutation.isPending
              ? "生成中..."
              : "コンテンツを生成"}
          </button>
        </form>
      </section>

      {/* プレビュー */}
      {previewContent && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">プレビュー</h2>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            {previewContent.type === "instagram_lp" && (
              <div className="space-y-6">
                {Array.isArray(previewContent.data) &&
                  "results" in previewContent.data &&
                  Array.isArray(previewContent.data.results) &&
                  previewContent.data.results.map((item: unknown, index: number) => {
                    const result =
                      typeof item === "object" &&
                      item !== null &&
                      "result" in item
                        ? item.result
                        : null;
                    if (!result) return null;

                    return (
                      <div
                        key={index}
                        className="rounded-lg border border-zinc-300 bg-white p-4"
                      >
                        <h3 className="mb-4 text-sm font-semibold text-zinc-900">
                          案 {index + 1}
                          {"approach" in (item as Record<string, unknown>) &&
                            typeof (item as Record<string, unknown>).approach === "string" && (
                              <span className="ml-2 text-xs text-zinc-500">
                                ({(item as Record<string, unknown>).approach as string})
                              </span>
                            )}
                        </h3>
                        <InstagramLPPreview 
                          content={typeof result === "string" ? result : String(result)} 
                          onExportImage={handleExportImage}
                        />
                      </div>
                    );
                  })}
              </div>
            )}
            {previewContent.type === "website_article" && (
              <div className="space-y-4">
                {"result" in (previewContent.data as Record<string, unknown>) && (
                  <div
                    className="prose prose-sm max-w-none whitespace-pre-line"
                  >
                    {typeof (previewContent.data as Record<string, unknown>).result === "string"
                      ? (previewContent.data as Record<string, unknown>).result as React.ReactNode
                      : String((previewContent.data as Record<string, unknown>).result)}
                  </div>
                )}
              </div>
            )}
            {previewContent.type === "campaign_copy" && (
              <div className="space-y-4">
                {"result" in (previewContent.data as Record<string, unknown>) && (
                  <div className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">
                    {typeof (previewContent.data as Record<string, unknown>).result === "string"
                      ? (previewContent.data as Record<string, unknown>).result as React.ReactNode
                      : String((previewContent.data as Record<string, unknown>).result)}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 生成履歴 */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          生成コンテンツ履歴
        </h2>
        {contentsQuery.isLoading && (
          <p className="text-sm text-zinc-500">読み込み中...</p>
        )}
        {contentsQuery.error && (
          <p className="text-sm text-red-600">
            エラー: {contentsQuery.error.message}
          </p>
        )}
        {contentsQuery.data && contentsQuery.data.length === 0 && (
          <p className="text-sm text-zinc-500">
            まだ生成されたコンテンツがありません
          </p>
        )}
        {contentsQuery.data && contentsQuery.data.length > 0 && (
          <div className="space-y-4">
            {contentsQuery.data.map((content) => (
              <div
                key={content.id}
                className="rounded-lg border border-zinc-200 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
                      {getContentTypeLabel(content.contentType)}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(content.createdAt).toLocaleString("ja-JP")}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      content.status === "published"
                        ? "bg-green-100 text-green-700"
                        : content.status === "approved"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {content.status === "published"
                      ? "公開済み"
                      : content.status === "approved"
                        ? "承認済み"
                        : "下書き"}
                  </span>
                </div>
                <h3 className="mb-2 text-sm font-semibold text-zinc-900">
                  {content.title}
                </h3>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-zinc-700 hover:text-zinc-900">
                    内容を表示
                  </summary>
                  <div className="mt-2">
                    {content.contentType === "instagram_lp" ? (
                      <InstagramLPPreview 
                        content={content.content} 
                        onExportImage={handleExportImage}
                      />
                    ) : (
                      <pre className="max-h-60 overflow-auto rounded bg-zinc-50 p-3 text-xs text-zinc-900 whitespace-pre-wrap">
                        {typeof content.content === "string"
                          ? content.content
                          : String(content.content)}
                      </pre>
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

export default ContentGeneration;

