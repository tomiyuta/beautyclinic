import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { z } from "zod";

import { checkAIHealth } from "@/server/services/ai-health-check";
import {
  WorkflowOrchestrator,
  type WorkflowExecution,
} from "@/server/services/workflow-orchestrator";

import { publicProcedure, router } from "../trpc";

const orchestrator = new WorkflowOrchestrator();

export const workflowRouter = router({
  checkAIHealth: publicProcedure.query(async () => {
    try {
      return await checkAIHealth();
    } catch (error) {
      console.error("AI health check error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "AIヘルスチェックに失敗しました",
      });
    }
  }),

  executeFullAnalysis: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        location: z.string().min(1, "場所を入力してください"),
      }),
    )
    .mutation(async ({ input }): Promise<WorkflowExecution> => {
      try {
        return await orchestrator.executeFullAnalysisWorkflow(
          input.userId,
          input.location,
        );
      } catch (error) {
        console.error("Workflow execution error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "ワークフローの実行に失敗しました",
        });
      }
    }),

  list: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        status: z.enum(["running", "completed", "failed"]).optional(),
      }),
    )
    .query(async ({ input }) => {
      const where = {
        userId: input.userId,
        ...(input.status && { status: input.status }),
      };

      const executions = await db.workflowExecution.findMany({
        where,
        orderBy: { startedAt: "desc" },
      });

      return executions.map((exec) => ({
        ...exec,
        steps: JSON.parse(exec.steps),
        results: exec.results ? JSON.parse(exec.results) : null,
      }));
    }),

  getById: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        userId: z.number().int().positive(),
      }),
    )
    .query(async ({ input }): Promise<WorkflowExecution> => {
      const execution = await db.workflowExecution.findFirst({
        where: {
          id: input.id,
          userId: input.userId,
        },
      });

      if (!execution) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "ワークフロー実行が見つかりません",
        });
      }

      return {
        id: execution.id,
        workflowType: execution.workflowType,
        steps: JSON.parse(execution.steps),
        startedAt: execution.startedAt,
        completedAt: execution.completedAt || undefined,
        results: execution.results ? JSON.parse(execution.results) : {},
        status: execution.status,
        errorMessage: execution.errorMessage || undefined,
      };
    }),
});

