/**
 * Acontext Skill tRPCルーター
 */

import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { db } from "@/server/db";
import { searchSkills } from "@/server/services/ai-context/skill-search";
import { USER_ID_PLACEHOLDER } from "@/lib/constants";

export const aiSkillRouter = router({
  // スキル一覧
  list: publicProcedure
    .input(
      z.object({
        spaceId: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
        complexity: z.enum(["simple", "medium", "complex"]).optional(),
        sortBy: z.enum(["usageCount", "successRate", "createdAt"]).default("usageCount"),
      })
    )
    .query(async ({ input }) => {
      const where: Record<string, unknown> = {};
      
      if (input.spaceId) {
        where.spaceId = input.spaceId;
      } else {
        // スペース指定なしの場合、ユーザーの全スペースのスキルを取得
        const userSpaces = await db.aiSpace.findMany({
          where: { userId: USER_ID_PLACEHOLDER },
          select: { id: true },
        });
        where.spaceId = { in: userSpaces.map((s) => s.id) };
      }

      if (input.complexity) {
        where.complexity = input.complexity;
      }

      const skills = await db.aiSkill.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { [input.sortBy]: "desc" },
        include: {
          space: { select: { id: true, name: true } },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (skills.length > input.limit) {
        const nextItem = skills.pop();
        nextCursor = nextItem?.id;
      }

      return { skills, nextCursor };
    }),

  // スキル詳細
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const skill = await db.aiSkill.findUnique({
        where: { id: input.id },
        include: {
          space: true,
        },
      });

      if (!skill) {
        throw new Error("Skill not found");
      }

      // 所有権チェック
      if (!skill.spaceId) {
        throw new Error("Access denied");
      }
      const space = await db.aiSpace.findUnique({
        where: { id: skill.spaceId },
      });
      if (!space || space.userId !== USER_ID_PLACEHOLDER) {
        throw new Error("Access denied");
      }

      return skill;
    }),

  // スキル検索（既存サービスを利用）
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        spaceId: z.string().optional(),
        mode: z.enum(["fast", "agentic"]).default("fast"),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      const results = await searchSkills({
        query: input.query,
        spaceId: input.spaceId,
        mode: input.mode,
        limit: input.limit,
      });
      return results;
    }),

  // スキル削除
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const skill = await db.aiSkill.findUnique({
        where: { id: input.id },
        include: { space: true },
      });

      if (!skill || !skill.space || skill.space.userId !== USER_ID_PLACEHOLDER) {
        throw new Error("Skill not found");
      }

      await db.aiSkill.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // 使用回数をインクリメント
  recordUsage: publicProcedure
    .input(
      z.object({
        id: z.string(),
        success: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const skill = await db.aiSkill.findUnique({
        where: { id: input.id },
      });

      if (!skill) {
        throw new Error("Skill not found");
      }

      const newUsageCount = skill.usageCount + 1;
      const currentSuccessRate = skill.successRate ?? 0;
      const currentSuccessCount = Math.round(currentSuccessRate * skill.usageCount);
      const newSuccessCount = input.success ? currentSuccessCount + 1 : currentSuccessCount;
      const newSuccessRate = newSuccessCount / newUsageCount;

      await db.aiSkill.update({
        where: { id: input.id },
        data: {
          usageCount: newUsageCount,
          successRate: newSuccessRate,
        },
      });

      return { success: true };
    }),
});

