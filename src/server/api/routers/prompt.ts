import { z } from "zod";
import { publicProcedure, router } from "@/server/api/trpc";
import { db } from "@/server/db";

export const promptRouter = router({
  // すべてのプロンプトを取得
  getAll: publicProcedure.query(async () => {
    try {
      const prompts = await db.promptTemplate.findMany({
        where: {
          isActive: true,
        },
      });
      console.log(`Found ${prompts.length} prompts`);
      // メモリ上でソート
      return prompts
        .filter((p) => p && p.aiAgent && p.name && p.prompt)
        .sort((a, b) => {
          if (a.aiAgent !== b.aiAgent) {
            return (a.aiAgent || "").localeCompare(b.aiAgent || "");
          }
          return (a.name || "").localeCompare(b.name || "");
        });
    } catch (error) {
      console.error("Failed to fetch prompts:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message, error.stack);
      }
      throw new Error(`プロンプトの取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }),

  // 特定のプロンプトタイプのプロンプトを取得
  getByType: publicProcedure
    .input(
      z.object({
        promptType: z.enum([
          "claude_analyze_market_position",
          "claude_generate_price_recommendations",
          "claude_generate_campaign_proposals",
          "claude_suggest_new_treatments",
          "gemini_research_trend_analysis",
          "gemini_research_price_comparison",
          "gemini_analyze_instagram_trends",
          "gemini_analyze_youtube_trends",
          "gemini_research_competitor_analysis",
          "grok_analyze_twitter_trends",
          "chatgpt_system_prompt",
          "chatgpt_generate_instagram_lp",
          "chatgpt_generate_website_article",
          "chatgpt_generate_campaign_copy",
        ]),
      }),
    )
    .query(async ({ input }) => {
      try {
        const prompt = await db.promptTemplate.findUnique({
          where: { promptType: input.promptType },
        });
        if (!prompt) {
          throw new Error(`プロンプトタイプ ${input.promptType} が見つかりません`);
        }
        return prompt;
      } catch (error) {
        console.error(`Failed to fetch prompt ${input.promptType}:`, error);
        throw new Error(
          `プロンプトの取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }),

  // プロンプトを更新または作成
  upsert: publicProcedure
    .input(
      z.object({
        promptType: z.enum([
          "claude_analyze_market_position",
          "claude_generate_price_recommendations",
          "claude_generate_campaign_proposals",
          "claude_suggest_new_treatments",
          "gemini_research_trend_analysis",
          "gemini_research_price_comparison",
          "gemini_analyze_instagram_trends",
          "gemini_analyze_youtube_trends",
          "gemini_research_competitor_analysis",
          "grok_analyze_twitter_trends",
          "chatgpt_system_prompt",
          "chatgpt_generate_instagram_lp",
          "chatgpt_generate_website_article",
          "chatgpt_generate_campaign_copy",
        ]),
        aiAgent: z.enum(["gemini", "grok", "claude", "chatgpt"]),
        name: z.string(),
        description: z.string().optional(),
        prompt: z.string(),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        if (!input.name || !input.name.trim()) {
          throw new Error("プロンプト名は必須です");
        }
        if (!input.prompt || !input.prompt.trim()) {
          throw new Error("プロンプト内容は必須です");
        }
        const prompt = await db.promptTemplate.upsert({
          where: { promptType: input.promptType },
          update: {
            name: input.name.trim(),
            description: input.description?.trim() || null,
            prompt: input.prompt.trim(),
            isActive: input.isActive,
          },
          create: {
            promptType: input.promptType,
            aiAgent: input.aiAgent,
            name: input.name.trim(),
            description: input.description?.trim() || null,
            prompt: input.prompt.trim(),
            isActive: input.isActive,
          },
        });
        return prompt;
      } catch (error) {
        console.error(`Failed to upsert prompt ${input.promptType}:`, error);
        throw new Error(
          `プロンプトの保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }),

  // プロンプトを削除（論理削除）
  delete: publicProcedure
    .input(
      z.object({
        promptType: z.enum([
          "claude_analyze_market_position",
          "claude_generate_price_recommendations",
          "claude_generate_campaign_proposals",
          "claude_suggest_new_treatments",
          "gemini_research_trend_analysis",
          "gemini_research_price_comparison",
          "gemini_analyze_instagram_trends",
          "gemini_analyze_youtube_trends",
          "gemini_research_competitor_analysis",
          "grok_analyze_twitter_trends",
          "chatgpt_system_prompt",
          "chatgpt_generate_instagram_lp",
          "chatgpt_generate_website_article",
          "chatgpt_generate_campaign_copy",
        ]),
      }),
    )
    .mutation(async ({ input }) => {
      await db.promptTemplate.update({
        where: { promptType: input.promptType },
        data: { isActive: false },
      });
      return { success: true };
    }),
});

