/**
 * スキル学習サービス
 * 完了したタスクから再利用可能なスキル（SOP）を抽出
 */

import OpenAI from "openai";
import { AI_CONTEXT_PROMPTS, replacePromptVariables } from "./prompts";
import type { Task } from "./task-extraction";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface Skill {
  name: string;
  description: string;
  steps: Array<{
    order: number;
    action: string;
    tool?: string;
    description: string;
  }>;
  complexity: "simple" | "medium" | "complex";
  tags?: string[];
}

export interface LearnSkillOptions {
  timeoutMs?: number;
}

/**
 * 完了したタスクからスキルを学習
 */
export async function learnSkill(
  completedTasks: Task[],
  options: LearnSkillOptions = {}
): Promise<Skill[]> {
  if (!openai) {
    throw new Error("OpenAI API key is not set");
  }

  if (completedTasks.length === 0) {
    return [];
  }

  // タスクをフォーマット
  const tasksText = completedTasks
    .map(
      (task, index) => `
タスク${index + 1}:
- 説明: ${task.description}
- ステータス: ${task.status}
- 進捗: ${task.progresses?.join(", ") ?? "なし"}
- ユーザー好み: ${task.userPreferences?.join(", ") ?? "なし"}
`
    )
    .join("\n");

  const prompt = replacePromptVariables(AI_CONTEXT_PROMPTS.SKILL_LEARNING, {
    completedTasks: tasksText,
  });

  try {
    const response = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "あなたはスキル学習エージェントです。完了したタスクから再利用可能なスキルを抽出し、JSON形式のみを出力してください。",
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
        timeout: options.timeoutMs ? options.timeoutMs : 30000,
      }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // JSONをパース
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new Error("Failed to parse JSON response");
    }

    // スキルを正規化
    // レスポンスは { name: "...", description: "...", ... } または { skills: [...] } の可能性がある
    const skillsData: unknown[] = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed !== null && "skills" in parsed
      ? Array.isArray((parsed as { skills: unknown }).skills)
        ? (parsed as { skills: unknown[] }).skills
        : []
      : [parsed];

    const skills: Skill[] = skillsData
      .map((skill: unknown): Skill | null => {
        if (typeof skill !== "object" || skill === null) {
          return null;
        }

        const s = skill as Record<string, unknown>;

        // ステップを正規化
        const stepsWithNulls = Array.isArray(s.steps)
          ? s.steps.map((step: unknown, index: number): Skill["steps"][0] | null => {
              if (typeof step !== "object" || step === null) {
                return null;
              }

              const st = step as Record<string, unknown>;
              return {
                order: typeof st.order === "number" ? st.order : index + 1,
                action: String(st.action ?? ""),
                tool: st.tool ? String(st.tool) : undefined,
                description: String(st.description ?? ""),
              };
            })
          : [];

        const steps: Skill["steps"] = stepsWithNulls.filter(
          (step): step is Skill["steps"][0] => step !== null
        );

        return {
          name: String(s.name ?? "未命名スキル"),
          description: String(s.description ?? ""),
          steps,
          complexity:
            typeof s.complexity === "string" &&
            ["simple", "medium", "complex"].includes(s.complexity)
              ? (s.complexity as Skill["complexity"])
              : "simple",
          tags: Array.isArray(s.tags) ? s.tags.map(String) : undefined,
        };
      })
      .filter((skill): skill is Skill => skill !== null && skill.steps.length > 0);

    return skills;
  } catch (error) {
    console.error("[learnSkill] Error:", error);
    throw error;
  }
}

