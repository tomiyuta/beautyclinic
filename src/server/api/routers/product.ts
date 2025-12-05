import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { z } from "zod";

import { publicProcedure, router } from "../trpc";

const productInput = z
  .object({
    userId: z.number().int().positive(),
    name: z.string().min(1, "商品名を入力してください"),
    category: z.string().max(100).optional().or(z.literal("")),
    costPrice: z.number().int().nonnegative(),
    sellingPrice: z.number().int().nonnegative(),
    description: z.string().max(2000).optional().or(z.literal("")),
    isActive: z.boolean().optional().default(true),
  })
  .refine((data) => data.sellingPrice >= data.costPrice, {
    message: "販売価格は原価以上で入力してください",
    path: ["sellingPrice"],
  });

export const productRouter = router({
  list: publicProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .query(async ({ input }) => {
      try {
        return await db.clinicProduct.findMany({
          where: { userId: input.userId },
          orderBy: { createdAt: "desc" },
        });
      } catch (error) {
        console.error("商品データ取得エラー:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "データベースエラーが発生しました",
        });
      }
    }),
  create: publicProcedure.input(productInput).mutation(async ({ input }) => {
    const { userId, isActive = true, ...data } = input;

    return db.clinicProduct.create({
      data: {
        userId,
        isActive,
        name: data.name,
        category: data.category ? data.category : null,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        description: data.description ? data.description : null,
      },
    });
  }),
  update: publicProcedure
    .input(
      productInput
        .partial({
          name: true,
          category: true,
          costPrice: true,
          sellingPrice: true,
          description: true,
          isActive: true,
        })
        .extend({
          id: z.number().int().positive(),
          userId: z.number().int().positive(),
        }),
    )
    .mutation(async ({ input }) => {
      const { id, userId, ...updates } = input;

      const product = await db.clinicProduct.findFirst({
        where: { id, userId },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "商品が見つかりません",
        });
      }

      const { isActive = product.isActive, ...rest } = updates;

      return db.clinicProduct.update({
        where: { id },
        data: {
          ...(rest.name !== undefined ? { name: rest.name } : {}),
          ...(rest.category !== undefined
            ? { category: rest.category ? rest.category : null }
            : {}),
          ...(rest.costPrice !== undefined
            ? { costPrice: rest.costPrice }
            : {}),
          ...(rest.sellingPrice !== undefined
            ? { sellingPrice: rest.sellingPrice }
            : {}),
          ...(rest.description !== undefined
            ? { description: rest.description ? rest.description : null }
            : {}),
          isActive,
        },
      });
    }),
  delete: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        userId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input }) => {
      const product = await db.clinicProduct.findFirst({
        where: { id: input.id, userId: input.userId },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "商品が見つかりません",
        });
      }

      await db.clinicProduct.delete({ where: { id: input.id } });

      return { success: true };
    }),
});

