/**
 * スキル検索サービス
 * fastモード（FULLTEXT検索）とagenticモード（LLM探索）を提供
 */

import { db } from "@/server/db";
import { AI_CONTEXT_PROMPTS, replacePromptVariables } from "./prompts";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface SearchSkillsInput {
  query: string;
  spaceId?: string;
  mode?: "fast" | "agentic";
  limit?: number;
}

/**
 * スキルを検索（fastモード: FULLTEXT検索）
 */
export async function searchSkillsFast(
  query: string,
  spaceId?: string,
  limit = 10
) {
  const where: {
    spaceId?: string;
    OR?: Array<{
      name?: { contains: string };
      description?: { contains: string };
    }>;
  } = {};

  if (spaceId) {
    where.spaceId = spaceId;
  }

  // MySQLのFULLTEXT検索（LIKE検索で代替）
  where.OR = [
    { name: { contains: query } },
    { description: { contains: query } },
  ];

  const skills = await db.aiSkill.findMany({
    where,
    orderBy: [
      { usageCount: "desc" },
      { successRate: "desc" },
      { createdAt: "desc" },
    ],
    take: limit,
  });

  return skills;
}

/**
 * スキルを検索（agenticモード: LLM探索）
 */
export async function searchSkillsAgentic(
  query: string,
  spaceId?: string,
  limit = 10
) {
  if (!openai) {
    // LLMが使えない場合はfastモードにフォールバック
    return searchSkillsFast(query, spaceId, limit);
  }

  try {
    // 既存スキルの例を取得
    const existingSkills = await db.aiSkill.findMany({
      where: spaceId ? { spaceId } : undefined,
      take: 20,
      orderBy: { usageCount: "desc" },
      select: {
        name: true,
        description: true,
        tags: true,
      },
    });

    const skillsText = existingSkills
      .map((skill) => `- ${skill.name}: ${skill.description}`)
      .join("\n");

    const prompt = replacePromptVariables(AI_CONTEXT_PROMPTS.SKILL_SEARCH_AGENTIC, {
      userIntent: query,
      existingSkills: skillsText || "既存スキルなし",
    });

    const response = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "あなたはスキル検索エージェントです。ユーザーの意図から関連キーワードを抽出し、JSON形式のみを出力してください。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        // response_formatは使用しない（オブジェクトを直接返すため）
      },
      {
        timeout: 10000, // 10秒 = 10000ミリ秒
      }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return searchSkillsFast(query, spaceId, limit);
    }

    const parsed = JSON.parse(content) as {
      keywords?: string[];
      suggestedTags?: string[];
      searchQuery?: string;
    };

    // キーワードとクエリを組み合わせて検索
    const searchTerms = [
      query,
      parsed.searchQuery,
      ...(parsed.keywords ?? []),
    ].filter(Boolean) as string[];

    // 各検索語で検索して結果を統合
    const allSkills = new Map<string, typeof existingSkills[0] & { score: number }>();

    for (const term of searchTerms) {
      const skills = await searchSkillsFast(term, spaceId, limit * 2);
      for (const skill of skills) {
        const existing = allSkills.get(skill.id);
        if (existing) {
          existing.score += 1;
        } else {
          allSkills.set(skill.id, { ...skill, score: 1 });
        }
      }
    }

    // スコアでソート
    const sortedSkills = Array.from(allSkills.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, ...skill }) => skill);

    return sortedSkills;
  } catch (error) {
    console.error("[searchSkillsAgentic] Error:", error);
    // エラー時はfastモードにフォールバック
    return searchSkillsFast(query, spaceId, limit);
  }
}

/**
 * スキルを検索（統一インターフェース）
 */
export async function searchSkills(input: SearchSkillsInput) {
  const { query, spaceId, mode = "fast", limit = 10 } = input;

  if (mode === "agentic") {
    return searchSkillsAgentic(query, spaceId, limit);
  } else {
    return searchSkillsFast(query, spaceId, limit);
  }
}

