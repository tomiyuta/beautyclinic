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
 * データベースからプロンプトを取得し、存在しない場合はデフォルトプロンプトを返す
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
      return promptTemplate.prompt;
    }
  } catch (error) {
    console.error(`Failed to get prompt for ${promptType}:`, error);
  }

  return defaultPrompt;
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



