/**
 * Acontext Session tRPCルーター
 */

import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { db } from "@/server/db";
import {
  createSession,
  sendMessage,
  getMessages,
  flush,
  getTasks,
  getSession,
  listSessions,
  completeSession,
} from "@/server/services/ai-context/ai-session";
import { searchSkills } from "@/server/services/ai-context/skill-search";
import {
  saveArtifact,
  getArtifact,
  listArtifacts,
} from "@/server/services/ai-context/storage-adapter";
import { USER_ID_PLACEHOLDER } from "@/lib/constants";

export const aiSessionRouter = router({
  /**
   * セッションを作成
   */
  create: publicProcedure
    .input(
      z.object({
        spaceId: z.string().optional(),
        title: z.string().optional(),
        context: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createSession(input);
    }),

  /**
   * メッセージを送信
   */
  sendMessage: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return sendMessage(input);
    }),

  /**
   * メッセージを取得
   */
  getMessages: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        limit: z.number().min(1).max(100).optional().default(100),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      return getMessages(input);
    }),

  /**
   * flush() - タスク抽出とスキル学習を実行
   */
  flush: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        timeoutMs: z.number().min(1000).max(50000).optional().default(50000),
        pollIntervalMs: z.number().min(100).max(5000).optional().default(1000),
        jobType: z.enum(["task_extraction", "full_processing"]).optional().default("task_extraction"),
      })
    )
    .mutation(async ({ input }) => {
      return flush(input);
    }),

  /**
   * タスクを取得
   */
  getTasks: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      return getTasks(input.sessionId);
    }),

  /**
   * セッションを取得
   */
  get: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      return getSession(input.sessionId);
    }),

  /**
   * セッション一覧を取得
   */
  list: publicProcedure
    .input(
      z.object({
        spaceId: z.string().optional(),
        limit: z.number().min(1).max(100).optional().default(50),
      })
    )
    .query(async ({ input }) => {
      return listSessions(input.spaceId, input.limit);
    }),

  /**
   * セッションを完了
   */
  complete: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input }) => {
      return completeSession(input.sessionId);
    }),

  /**
   * スキルを検索
   */
  searchSkills: publicProcedure
    .input(
      z.object({
        query: z.string(),
        spaceId: z.string().optional(),
        mode: z.enum(["fast", "agentic"]).optional().default("fast"),
        limit: z.number().min(1).max(50).optional().default(10),
      })
    )
    .query(async ({ input }) => {
      return searchSkills(input);
    }),

  /**
   * アーティファクトを保存
   */
  saveArtifact: publicProcedure
    .input(
      z.object({
        sessionId: z.string().optional(),
        name: z.string(),
        data: z.string(), // Base64エンコードされたデータ
        mimeType: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.data, "base64");
      return saveArtifact({
        sessionId: input.sessionId,
        name: input.name,
        data: buffer,
        mimeType: input.mimeType,
        metadata: input.metadata,
      });
    }),

  /**
   * アーティファクトを取得
   */
  getArtifact: publicProcedure
    .input(z.object({ artifactId: z.string() }))
    .query(async ({ input }) => {
      return getArtifact(input);
    }),

  /**
   * アーティファクト一覧を取得
   */
  listArtifacts: publicProcedure
    .input(
      z.object({
        sessionId: z.string().optional(),
        limit: z.number().min(1).max(100).optional().default(50),
      })
    )
    .query(async ({ input }) => {
      return listArtifacts(input.sessionId, input.limit);
    }),

  /**
   * タスク更新
   */
  updateTask: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
        status: z.enum(["pending", "running", "success", "failed"]).optional(),
        progresses: z.array(z.string()).optional(),
        userPreferences: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // タスク存在確認
      const task = await db.aiTask.findUnique({
        where: { id: input.taskId },
        include: {
          session: {
            include: {
              space: true,
            },
          },
        },
      });

      if (!task) {
        throw new Error("Task not found");
      }

      const updateData: Record<string, unknown> = {};
      
      if (input.status !== undefined) {
        updateData.status = input.status;
        if (input.status === "success" || input.status === "failed") {
          updateData.completedAt = new Date();
        }
      }
      
      if (input.progresses !== undefined) {
        updateData.progresses = input.progresses;
      }
      
      if (input.userPreferences !== undefined) {
        updateData.userPreferences = input.userPreferences;
      }

      const updatedTask = await db.aiTask.update({
        where: { id: input.taskId },
        data: updateData,
      });

      return updatedTask;
    }),

  /**
   * タスク進捗追加（単一追加用）
   */
  addTaskProgress: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
        progress: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const task = await db.aiTask.findUnique({
        where: { id: input.taskId },
      });

      if (!task) {
        throw new Error("Task not found");
      }

      const currentProgresses = (task.progresses as string[]) ?? [];
      
      const updatedTask = await db.aiTask.update({
        where: { id: input.taskId },
        data: {
          progresses: [...currentProgresses, input.progress],
        },
      });

      return updatedTask;
    }),

  /**
   * メトリクス取得
   */
  getMetrics: publicProcedure
    .input(
      z.object({
        spaceId: z.string().optional(),
        metricType: z.enum(["daily", "weekly", "monthly"]).default("daily"),
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ input }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // スペース指定の処理
      let spaceIds: string[] = [];
      if (input.spaceId) {
        spaceIds = [input.spaceId];
      } else {
        const userSpaces = await db.aiSpace.findMany({
          where: { userId: USER_ID_PLACEHOLDER },
          select: { id: true },
        });
        spaceIds = userSpaces.map((s) => s.id);
      }

      // 保存済みメトリクスを取得
      const metrics = await db.aiMetric.findMany({
        where: {
          spaceId: { in: spaceIds },
          metricType: input.metricType,
          date: { gte: startDate },
        },
        orderBy: { date: "asc" },
      });

      return metrics;
    }),

  /**
   * リアルタイム集計（保存済みメトリクスがない日用）
   */
  getRealtimeStats: publicProcedure
    .input(
      z.object({
        spaceId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      // スペース指定の処理
      let spaceIds: string[] = [];
      if (input.spaceId) {
        spaceIds = [input.spaceId];
      } else {
        const userSpaces = await db.aiSpace.findMany({
          where: { userId: USER_ID_PLACEHOLDER },
          select: { id: true },
        });
        spaceIds = userSpaces.map((s) => s.id);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 今日のセッション数
      const todaySessions = await db.aiSession.count({
        where: {
          spaceId: { in: spaceIds },
          createdAt: { gte: today },
        },
      });

      // 今日のタスク
      const todayTasks = await db.aiTask.findMany({
        where: {
          session: { spaceId: { in: spaceIds } },
          createdAt: { gte: today },
        },
        select: { status: true },
      });

      const taskSuccess = todayTasks.filter((t) => t.status === "success").length;
      const taskFailed = todayTasks.filter((t) => t.status === "failed").length;

      // 総計
      const totalSessions = await db.aiSession.count({
        where: { spaceId: { in: spaceIds } },
      });

      const totalSkills = await db.aiSkill.count({
        where: { spaceId: { in: spaceIds } },
      });

      const totalTasks = await db.aiTask.count({
        where: { session: { spaceId: { in: spaceIds } } },
      });

      const successTasks = await db.aiTask.count({
        where: {
          session: { spaceId: { in: spaceIds } },
          status: "success",
        },
      });

      return {
        today: {
          sessions: todaySessions,
          tasks: todayTasks.length,
          taskSuccess,
          taskFailed,
        },
        total: {
          sessions: totalSessions,
          skills: totalSkills,
          tasks: totalTasks,
          taskSuccessRate: totalTasks > 0 ? successTasks / totalTasks : 0,
        },
      };
    }),
});


