import { db } from "@/server/db";

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

/**
 * Webリサーチの指示を追加する
 * プロンプトの先頭に追加して、最初にWebリサーチを実行するよう指示する
 */
function addWebResearchInstruction(prompt: string): string {
  // 現在の日付を取得
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDateStr = `${currentYear}年${currentMonth}月`;

  const webResearchInstruction = `【重要】Webリサーチの実施について
現在の日付は${currentDateStr}です。このタスクを実行する前に、必ず最新の情報を取得するためにWebリサーチを行ってください。

- 現在の日付は${currentDateStr}です。必ず${currentYear}年${currentMonth}月時点の最新情報を取得してください
- 2024年以前の古い情報は使用しないでください。必ず${currentYear}年${currentMonth}月時点の最新情報を使用してください
- 最新のトレンド、ニュース、統計データをWeb検索で取得してください
- 信頼性の高い情報源（公式サイト、ニュースサイト、業界レポートなど）を優先してください
- 検索結果を基に、最新かつ正確な情報を提供してください
- 情報の出典や日付を可能な限り明記してください
- 古い情報や不確実な情報は使用しないでください
- 特にトレンド分析や価格調査の場合は、必ず最新の市場データを検索してください
- 調査結果には必ず「${currentDateStr}時点の調査結果」と明記してください

上記のWebリサーチを実施した上で、以下の指示に従って回答してください。

`;

  // プロンプトの先頭にWebリサーチの指示を追加
  return webResearchInstruction + prompt;
}

/**
 * データベースからプロンプトを取得し、存在しない場合はデフォルトプロンプトを返す
 * Webリサーチの指示を自動的に追加します
 */
export async function getPrompt(
  promptType: PromptType,
  defaultPrompt: string,
): Promise<string> {
  try {
    const promptTemplate = await db.promptTemplate.findUnique({
      where: { promptType },
    });

    if (promptTemplate && promptTemplate.isActive) {
      // Webリサーチの指示を追加
      return addWebResearchInstruction(promptTemplate.prompt);
    }
  } catch (error) {
    console.error(`Failed to get prompt for ${promptType}:`, error);
  }

  // デフォルトプロンプトにもWebリサーチの指示を追加
  return addWebResearchInstruction(defaultPrompt);
}

/**
 * プレースホルダーを置換する
 */
export function replacePlaceholders(
  template: string,
  placeholders: Record<string, string | number | unknown>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(placeholders)) {
    const placeholder = `\${${key}}`;
    const replacement =
      typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
    result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), replacement);
  }
  return result;
}



