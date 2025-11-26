/**
 * Acontext Session tRPCルーター
 */

import { z } from "zod";
import { publicProcedure, router } from "../trpc";
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

export const aiSessionRouter = router({
  /**
   * セッションを作成
   */
  create: publicProcedure
    .input(
      z.object({
        spaceId: z.string().optional(),
        title: z.string().optional(),
        context: z.record(z.unknown()).optional(),
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
        metadata: z.record(z.unknown()).optional(),
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
        metadata: z.record(z.unknown()).optional(),
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
});

