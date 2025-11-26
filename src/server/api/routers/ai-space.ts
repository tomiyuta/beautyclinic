/**
 * Acontext Space tRPCルーター
 */

import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { db } from "@/server/db";

const USER_ID_PLACEHOLDER = 1;

export const aiSpaceRouter = router({
  // スペース作成
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const space = await db.aiSpace.create({
        data: {
          userId: USER_ID_PLACEHOLDER,
          name: input.name,
          description: input.description,
          metadata: (input.metadata ?? {}) as Record<string, unknown>,
        },
      });
      return space;
    }),

  // スペース一覧
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const spaces = await db.aiSpace.findMany({
        where: { userId: USER_ID_PLACEHOLDER },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              sessions: true,
              skills: true,
            },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (spaces.length > input.limit) {
        const nextItem = spaces.pop();
        nextCursor = nextItem?.id;
      }

      return { spaces, nextCursor };
    }),

  // スペース詳細
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const space = await db.aiSpace.findUnique({
        where: { id: input.id },
        include: {
          sessions: {
            take: 10,
            orderBy: { createdAt: "desc" },
            include: {
              _count: { select: { messages: true, tasks: true } },
            },
          },
          skills: {
            take: 10,
            orderBy: { usageCount: "desc" },
          },
          _count: {
            select: { sessions: true, skills: true },
          },
        },
      });

      if (!space || space.userId !== USER_ID_PLACEHOLDER) {
        throw new Error("Space not found");
      }

      return space;
    }),

  // スペース更新
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const space = await db.aiSpace.findUnique({
        where: { id: input.id },
      });

      if (!space || space.userId !== USER_ID_PLACEHOLDER) {
        throw new Error("Space not found");
      }

      return db.aiSpace.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          metadata: input.metadata,
        },
      });
    }),

  // スペース削除
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const space = await db.aiSpace.findUnique({
        where: { id: input.id },
      });

      if (!space || space.userId !== USER_ID_PLACEHOLDER) {
        throw new Error("Space not found");
      }

      // 関連データも削除（カスケード設定がない場合）
      await db.$transaction([
        db.aiMetric.deleteMany({ where: { spaceId: input.id } }),
        db.aiSkill.deleteMany({ where: { spaceId: input.id } }),
        // セッション関連は別途削除が必要な場合あり
        db.aiSpace.delete({ where: { id: input.id } }),
      ]);

      return { success: true };
    }),
});

