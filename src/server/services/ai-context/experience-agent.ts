/**
 * Experience Agent（バックグラウンド処理）
 * Vercel Cron Jobsから呼び出される
 */

import { db } from "@/server/db";
import { extractTasks } from "./task-extraction";
import { learnSkill } from "./skill-learning";
import type { Task } from "./task-extraction";

/**
 * 未処理のExperience Jobを処理
 */
export async function processExperienceJobs(limit = 10) {
  const jobs = await db.aiExperienceJob.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: {
      session: {
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
          tasks: true,
        },
      },
    },
  });

  const results = [];

  for (const job of jobs) {
    try {
      // ジョブの状態を更新
      await db.aiExperienceJob.update({
        where: { id: job.id },
        data: { status: "processing" },
      });

      if (job.jobType === "task_extraction") {
        // タスク抽出
        await processTaskExtraction(job.sessionId, job.session);
      } else if (job.jobType === "skill_learning") {
        // スキル学習
        await processSkillLearning(job.sessionId, job.session);
      } else if (job.jobType === "full_processing") {
        // 両方実行
        await processTaskExtraction(job.sessionId, job.session);
        await processSkillLearning(job.sessionId, job.session);
      }

      // ジョブを完了
      await db.aiExperienceJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          completedAt: new Date(),
        },
      });

      results.push({ jobId: job.id, status: "success" });
    } catch (error) {
      console.error(`[processExperienceJobs] Error processing job ${job.id}:`, error);

      // ジョブを失敗としてマーク
      await db.aiExperienceJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        },
      });

      results.push({
        jobId: job.id,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

/**
 * タスク抽出を処理
 */
async function processTaskExtraction(
  sessionId: string,
  session: {
    messages: Array<{ role: string; content: string }>;
    tasks: unknown[];
  }
) {
  // 既にタスクが存在する場合はスキップ
  if (session.tasks.length > 0) {
    return;
  }

  // 会話をフォーマット
  const conversation = session.messages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n");

  if (!conversation) {
    return;
  }

  // タスクを抽出
  const tasks = await extractTasks(conversation);

  // タスクをDBに保存
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
}

/**
 * スキル学習を処理
 */
async function processSkillLearning(
  sessionId: string,
  session: {
    tasks: Array<{
      id: string;
      description: string;
      status: string;
      progresses: unknown;
      userPreferences: unknown;
    }>;
  }
) {
  // 完了したタスクを取得
  const completedTasks: Task[] = session.tasks
    .filter((t) => t.status === "success")
    .map((t) => ({
      order: 1,
      description: t.description,
      status: "success" as const,
      progresses: Array.isArray(t.progresses) ? t.progresses.map(String) : undefined,
      userPreferences: Array.isArray(t.userPreferences)
        ? t.userPreferences.map(String)
        : undefined,
    }));

  if (completedTasks.length === 0) {
    return;
  }

  // スキルを学習
  const skills = await learnSkill(completedTasks);

  // スキルをDBに保存
  const spaceId = (await db.aiSession.findUnique({
    where: { id: sessionId },
    select: { spaceId: true },
  }))?.spaceId;

  for (const skill of skills) {
    await db.aiSkill.create({
      data: {
        spaceId: spaceId ?? null,
        name: skill.name,
        description: skill.description,
        steps: JSON.parse(JSON.stringify(skill.steps)),
        complexity: skill.complexity,
        tags: skill.tags ? JSON.parse(JSON.stringify(skill.tags)) : null,
      },
    });
  }

  // セッションの状態を更新
  await db.aiSession.update({
    where: { id: sessionId },
    data: { experienceStatus: "completed" },
  });
}


