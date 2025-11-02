import { db } from "@/server/db";
import type { AIAgent } from "./ai-health-check";
import { checkAIHealth, selectAIAgent } from "./ai-health-check";

export interface WorkflowStep {
  id: string;
  name: string;
  aiAgent: AIAgent;
  dependencies: string[];
  status: "pending" | "running" | "completed" | "failed";
  result?: unknown;
  error?: string;
}

export interface WorkflowExecution {
  id: number;
  workflowType: string;
  steps: WorkflowStep[];
  startedAt: Date;
  completedAt?: Date;
  results: Record<string, unknown>;
  status: "running" | "completed" | "failed";
  errorMessage?: string;
}

export class WorkflowOrchestrator {
  async executeFullAnalysisWorkflow(
    userId: number,
    _location: string,
  ): Promise<WorkflowExecution> {
    // ワークフロー実行レコードを作成
    const execution = await db.workflowExecution.create({
      data: {
        userId,
        workflowType: "full_analysis",
        status: "running",
        steps: JSON.stringify([]),
      },
    });

    const workflowSteps: WorkflowStep[] = [
      {
        id: "step1",
        name: "市場調査（トレンド分析）",
        aiAgent: "gemini",
        dependencies: [],
        status: "pending",
      },
      {
        id: "step2",
        name: "市場調査（価格調査）",
        aiAgent: "gemini",
        dependencies: [],
        status: "pending",
      },
      {
        id: "step3",
        name: "SNS調査（Twitter）",
        aiAgent: "grok",
        dependencies: [],
        status: "pending",
      },
      {
        id: "step4",
        name: "SNS調査（Instagram）",
        aiAgent: "gemini",
        dependencies: [],
        status: "pending",
      },
      {
        id: "step5",
        name: "総合分析",
        aiAgent: "claude",
        dependencies: ["step1", "step2", "step3", "step4"],
        status: "pending",
      },
    ];

    const results: Record<string, unknown> = {};

    try {
      // AIヘルスチェック
      const healthStatus = await checkAIHealth();
      const availableAgents = healthStatus
        .filter((h) => h.status === "healthy")
        .map((h) => h.agent);

      if (availableAgents.length === 0) {
        throw new Error("利用可能なAIエージェントがありません");
      }

      // ステップを順次実行
      for (const step of workflowSteps) {
        // 依存関係の確認
        const dependenciesMet = step.dependencies.every((depId) => {
          const depStep = workflowSteps.find((s) => s.id === depId);
          return depStep?.status === "completed";
        });

        if (!dependenciesMet && step.dependencies.length > 0) {
          continue; // 依存関係が未完了の場合はスキップ
        }

        // エージェントが利用可能か確認
        if (!availableAgents.includes(step.aiAgent)) {
          const alternative = selectAIAgent(step.name, availableAgents);
          if (alternative) {
            step.aiAgent = alternative;
          } else {
            step.status = "failed";
            step.error = `${step.aiAgent}が利用不可で、代替エージェントも見つかりません`;
            continue;
          }
        }

        step.status = "running";
        await this.updateWorkflowExecution(execution.id, workflowSteps, results);

        try {
          // 実際のタスク実行は既存のサービスを使用
          // ここでは簡易的な実装として、ステータスのみ更新
          step.status = "completed";
          step.result = { message: "実行完了" };
          results[step.id] = step.result;
        } catch (error) {
          step.status = "failed";
          step.error =
            error instanceof Error ? error.message : "Unknown error";
        }

        await this.updateWorkflowExecution(execution.id, workflowSteps, results);
      }

      // ワークフロー完了
      const allCompleted = workflowSteps.every(
        (s) => s.status === "completed" || s.status === "failed",
      );

      const finalStatus =
        workflowSteps.some((s) => s.status === "failed") && !allCompleted
          ? "failed"
          : "completed";

      await db.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: finalStatus,
          steps: JSON.stringify(workflowSteps),
          results: JSON.stringify(results),
          completedAt: new Date(),
        },
      });

      return {
        id: execution.id,
        workflowType: execution.workflowType,
        steps: workflowSteps,
        startedAt: execution.startedAt,
        completedAt: new Date(),
        results,
        status: finalStatus,
      };
    } catch (error) {
      await db.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  private async updateWorkflowExecution(
    executionId: number,
    steps: WorkflowStep[],
    results: Record<string, unknown>,
  ): Promise<void> {
    await db.workflowExecution.update({
      where: { id: executionId },
      data: {
        steps: JSON.stringify(steps),
        results: JSON.stringify(results),
      },
    });
  }
}

