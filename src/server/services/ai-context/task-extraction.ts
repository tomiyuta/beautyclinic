/**
 * タスク抽出サービス
 * LLMを使用して会話からタスクを抽出
 */

import OpenAI from "openai";
import { AI_CONTEXT_PROMPTS, replacePromptVariables } from "./prompts";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface Task {
  order: number;
  description: string;
  status: "pending" | "running" | "success" | "failed";
  progresses?: string[];
  userPreferences?: string[];
}

export interface ExtractTasksOptions {
  timeoutMs?: number;
}

/**
 * 会話からタスクを抽出
 */
export async function extractTasks(
  conversation: string,
  options: ExtractTasksOptions = {}
): Promise<Task[]> {
  if (!openai) {
    throw new Error("OpenAI API key is not set");
  }

  const prompt = replacePromptVariables(AI_CONTEXT_PROMPTS.TASK_EXTRACTION, {
    conversation,
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // コスト効率の良いモデル
      messages: [
        {
          role: "system",
          content:
            "あなたはタスク抽出エージェントです。会話を分析し、JSON配列のみを出力してください。配列の形式: [{ \"order\": 1, \"description\": \"...\", \"status\": \"pending\", \"progresses\": [], \"userPreferences\": [] }]",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3, // 一貫性を重視
      // response_formatは使用しない（配列を直接返すため）
      timeout: options.timeoutMs ? options.timeoutMs / 1000 : 30, // 秒単位
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // JSONをパース
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      // JSON形式でない場合、配列を探す
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        parsed = JSON.parse(arrayMatch[0]);
      } else {
        throw new Error("Failed to parse JSON response");
      }
    }

    // 配列形式に正規化
    // response_format: json_objectの場合、{ tasks: [...] } または直接配列の可能性がある
    const tasksArray = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed !== null && "tasks" in parsed
      ? (parsed as { tasks: unknown }).tasks
      : typeof parsed === "object" && parsed !== null && Array.isArray(Object.values(parsed)[0])
      ? Object.values(parsed)[0]
      : [];

    // タスクを検証・正規化
    const tasks: Task[] = tasksArray
      .map((task: unknown, index: number) => {
        if (typeof task !== "object" || task === null) {
          return null;
        }

        const t = task as Record<string, unknown>;

        return {
          order: typeof t.order === "number" ? t.order : index + 1,
          description:
            typeof t.description === "string"
              ? t.description
              : String(t.description ?? ""),
          status:
            typeof t.status === "string" &&
            ["pending", "running", "success", "failed"].includes(t.status)
              ? (t.status as Task["status"])
              : "pending",
          progresses: Array.isArray(t.progresses)
            ? t.progresses.map(String)
            : undefined,
          userPreferences: Array.isArray(t.userPreferences)
            ? t.userPreferences.map(String)
            : undefined,
        };
      })
      .filter((task): task is Task => task !== null);

    return tasks;
  } catch (error) {
    console.error("[extractTasks] Error:", error);
    throw error;
  }
}

