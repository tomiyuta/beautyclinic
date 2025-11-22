import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { publicProcedure, router } from "../trpc";
import {
  templateCreateInputSchema,
  listTemplatesInputSchema,
  getTemplateInputSchema,
  updateTemplateInputSchema,
  deleteTemplateInputSchema,
} from "@/server/api/schemas/content";

export const contentTemplateRouter = router({
  // テンプレート作成
  createTemplate: publicProcedure.input(templateCreateInputSchema)
    .mutation(async ({ input }) => {
      try {
        const template = await db.contentTemplate.create({
          data: {
            userId: input.userId,
            name: input.name,
            contentType: input.contentType,
            settings: input.settings as any,
            isDefault: input.isDefault || false,
          },
        });

        return {
          id: template.id,
          message: "テンプレートが作成されました",
        };
      } catch (error) {
        console.error("Create template error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "テンプレート作成に失敗しました",
        });
      }
    }),

  // テンプレート一覧
  listTemplates: publicProcedure.input(listTemplatesInputSchema)
    .query(async ({ input }) => {
      try {
        const templates = await db.contentTemplate.findMany({
          where: {
            userId: input.userId,
            ...(input.contentType && { contentType: input.contentType }),
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return templates;
      } catch (error) {
        console.error("List templates error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "テンプレート一覧の取得に失敗しました",
        });
      }
    }),

  // テンプレート取得
  getTemplate: publicProcedure.input(getTemplateInputSchema)
    .query(async ({ input }) => {
      try {
        const template = await db.contentTemplate.findUnique({
          where: { id: input.id },
        });

        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "テンプレートが見つかりません",
          });
        }

        return template;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Get template error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "テンプレートの取得に失敗しました",
        });
      }
    }),

  // テンプレート更新
  updateTemplate: publicProcedure.input(updateTemplateInputSchema)
    .mutation(async ({ input }) => {
      try {
        const updated = await db.contentTemplate.update({
          where: { id: input.id },
          data: {
            name: input.name,
            settings: input.settings as any,
            isDefault: input.isDefault,
          },
        });

        return {
          id: updated.id,
          message: "テンプレートが更新されました",
        };
      } catch (error) {
        console.error("Update template error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "テンプレート更新に失敗しました",
        });
      }
    }),

  // テンプレート削除
  deleteTemplate: publicProcedure.input(deleteTemplateInputSchema)
    .mutation(async ({ input }) => {
      try {
        await db.contentTemplate.delete({
          where: { id: input.id },
        });

        return {
          message: "テンプレートが削除されました",
        };
      } catch (error) {
        console.error("Delete template error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "テンプレート削除に失敗しました",
        });
      }
    }),
});


