/**
 * Acontext Session管理サービス
 * セッション作成、メッセージ送信、タスク抽出、スキル学習を提供
 */

import { db } from "@/server/db";
import { AI_CONTEXT_PROMPTS, replacePromptVariables } from "./prompts";
import { extractTasks } from "./task-extraction";
import { learnSkill } from "./skill-learning";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface CreateSessionInput {
  spaceId?: string;
  title?: string;
  context?: Record<string, unknown>;
}

export interface SendMessageInput {
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
}

export interface FlushInput {
  sessionId: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
  jobType?: "task_extraction" | "full_processing";
}

export interface GetMessagesInput {
  sessionId: string;
  limit?: number;
  offset?: number;
}

/**
 * セッションを作成
 */
export async function createSession(input: CreateSessionInput) {
  const session = await db.aiSession.create({
    data: {
      spaceId: input.spaceId ?? null,
      title: input.title ?? null,
      context: input.context ? JSON.parse(JSON.stringify(input.context)) : null,
      status: "active",
      experienceStatus: "pending",
    },
  });

  return session;
}

/**
 * メッセージを送信
 */
export async function sendMessage(input: SendMessageInput) {
  const message = await db.aiMessage.create({
    data: {
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : null,
    },
  });

  return message;
}

/**
 * メッセージを取得
 */
export async function getMessages(input: GetMessagesInput) {
  const messages = await db.aiMessage.findMany({
    where: { sessionId: input.sessionId },
    orderBy: { createdAt: "asc" },
    take: input.limit ?? 100,
    skip: input.offset ?? 0,
  });

  return messages;
}

/**
 * セッションを完了（非同期処理をトリガー）
 */
export async function completeSession(sessionId: string) {
  const session = await db.aiSession.update({
    where: { id: sessionId },
    data: {
      status: "completed",
      completedAt: new Date(),
      experienceStatus: "pending", // バックグラウンド処理をトリガー
    },
  });

  // バックグラウンドジョブを作成
  await db.aiExperienceJob.create({
    data: {
      sessionId,
      jobType: "full_processing",
      status: "pending",
    },
  });

  return session;
}

/**
 * flush() - タスク抽出とスキル学習を実行（同期）
 * ハイブリッドパターン: タスク抽出のみ同期、スキル学習は非同期
 */
export async function flush(input: FlushInput) {
  const {
    sessionId,
    timeoutMs = 50000, // デフォルト50秒（Vercel Proの60秒制限内）
    pollIntervalMs = 1000,
    jobType = "task_extraction", // デフォルトはタスク抽出のみ
  } = input;

  const startTime = Date.now();

  try {
    // 1. メッセージを取得
    const messages = await getMessages({ sessionId });
    if (messages.length === 0) {
      return { success: true, tasks: [], skills: [] };
    }

    // 2. 会話をフォーマット
    const conversation = messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    // 3. タスク抽出を実行
    const tasks = await extractTasks(conversation, {
      timeoutMs: timeoutMs - 10000, // 10秒のバッファ
    });

    // 4. タスクをDBに保存
    for (const task of tasks) {
      await db.aiTask.create({
        data: {
          sessionId,
          order: task.order,
          description: task.description,
          status: task.status,
          progresses: task.progresses ? JSON.parse(JSON.stringify(task.progresses)) : null,
          userPreferences: task.userPreferences
            ? JSON.parse(JSON.stringify(task.userPreferences))
            : null,
        },
      });
    }

    // 5. スキル学習の処理
    if (jobType === "full_processing") {
      // 完了したタスクを取得
      const completedTasks = tasks.filter((t) => t.status === "success");

      if (completedTasks.length > 0) {
        // スキル学習を実行（時間が残っている場合のみ）
        const elapsed = Date.now() - startTime;
        const remainingTime = timeoutMs - elapsed - 5000; // 5秒のバッファ

        if (remainingTime > 10000) {
          // 10秒以上残っている場合のみ実行
          try {
            const skills = await learnSkill(completedTasks, {
              timeoutMs: remainingTime,
            });

            // スキルをDBに保存
            for (const skill of skills) {
              const session = await db.aiSession.findUnique({
                where: { id: sessionId },
                select: { spaceId: true },
              });

              await db.aiSkill.create({
                data: {
                  spaceId: session?.spaceId ?? null,
                  name: skill.name,
                  description: skill.description,
                  steps: JSON.parse(JSON.stringify(skill.steps)),
                  complexity: skill.complexity,
                  tags: skill.tags ? JSON.parse(JSON.stringify(skill.tags)) : null,
                },
              });
            }
          } catch (error) {
            console.error("[flush] Skill learning failed:", error);
            // エラーが発生してもタスク抽出は成功しているので続行
          }
        } else {
          // 時間が足りない場合は非同期処理にフォールバック
          await db.aiExperienceJob.create({
            data: {
              sessionId,
              jobType: "skill_learning",
              status: "pending",
            },
          });
        }
      }
    } else {
      // タスク抽出のみの場合、スキル学習は非同期処理に任せる
      const completedTasks = tasks.filter((t) => t.status === "success");
      if (completedTasks.length > 0) {
        await db.aiExperienceJob.create({
          data: {
            sessionId,
            jobType: "skill_learning",
            status: "pending",
          },
        });
      }
    }

    // 6. セッションの状態を更新
    await db.aiSession.update({
      where: { id: sessionId },
      data: {
        experienceStatus: jobType === "full_processing" ? "completed" : "processing",
      },
    });

    return {
      success: true,
      tasks,
      message: "Tasks extracted successfully",
    };
  } catch (error) {
    console.error("[flush] Error:", error);

    // エラー時は非同期処理にフォールバック
    await db.aiExperienceJob.create({
      data: {
        sessionId,
        jobType: jobType === "full_processing" ? "full_processing" : "task_extraction",
        status: "pending",
        error: error instanceof Error ? error.message : String(error),
      },
    });

    throw error;
  }
}

/**
 * タスクを取得
 */
export async function getTasks(sessionId: string) {
  const tasks = await db.aiTask.findMany({
    where: { sessionId },
    orderBy: { order: "asc" },
  });

  return tasks;
}

/**
 * セッションを取得
 */
export async function getSession(sessionId: string) {
  const session = await db.aiSession.findUnique({
    where: { id: sessionId },
    include: {
      space: true,
      messages: {
        orderBy: { createdAt: "asc" },
        take: 100,
      },
      tasks: {
        orderBy: { order: "asc" },
      },
    },
  });

  return session;
}

/**
 * セッション一覧を取得
 */
export async function listSessions(spaceId?: string, limit = 50) {
  const sessions = await db.aiSession.findMany({
    where: spaceId ? { spaceId } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      space: true,
      _count: {
        select: {
          messages: true,
          tasks: true,
        },
      },
    },
  });

  return sessions;
}

