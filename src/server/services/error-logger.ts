import { db } from "@/server/db";
import type { AIAgent } from "./ai-health-check";

export interface ErrorLogContext {
  userId: number;
  module: string;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  context?: Record<string, unknown>;
  aiAgent?: AIAgent;
}

export async function logError(errorLog: ErrorLogContext): Promise<number> {
  try {
    const saved = await db.errorLog.create({
      data: {
        userId: errorLog.userId,
        module: errorLog.module,
        errorType: errorLog.errorType,
        errorMessage: errorLog.errorMessage,
        stackTrace: errorLog.stackTrace,
        context: errorLog.context
          ? JSON.stringify(errorLog.context)
          : null,
        aiAgent: errorLog.aiAgent,
        isNotified: false,
        resolved: false,
      },
    });

    // 管理者への通知（簡易実装：重要なエラーの場合のみ）
    if (shouldNotifyAdmin(errorLog)) {
      await notifyAdmin(saved.id);
    }

    return saved.id;
  } catch (error) {
    // エラーログの保存自体が失敗した場合はコンソールに出力
    console.error("Failed to save error log:", error);
    console.error("Original error:", errorLog);
    throw error;
  }
}

function shouldNotifyAdmin(errorLog: ErrorLogContext): boolean {
  // 重要なエラーの場合のみ通知
  const criticalModules = ["sns_research", "market_research", "strategy_analysis"];
  const criticalErrorTypes = ["API_ERROR", "NETWORK_ERROR", "DATABASE_ERROR"];

  return (
    criticalModules.includes(errorLog.module) ||
    criticalErrorTypes.includes(errorLog.errorType) ||
    errorLog.aiAgent !== undefined // AIエージェント関連のエラーは重要
  );
}

async function notifyAdmin(errorLogId: number): Promise<void> {
  try {
    // 簡易実装：データベースに通知フラグを設定
    // 実際の本番環境では、メール送信、Slack通知、SNS通知などを実装
    await db.errorLog.update({
      where: { id: errorLogId },
      data: {
        isNotified: true,
        notifiedAt: new Date(),
      },
    });

    // コンソールにも出力（本番環境では適切な通知サービスを使用）
    console.error(`⚠️  ADMIN NOTIFICATION: Critical error logged (ID: ${errorLogId})`);
    console.error(
      "In production, this should trigger email/Slack/SNS notification",
    );
  } catch (error) {
    console.error("Failed to notify admin:", error);
  }
}

export async function getErrorLogs(
  userId?: number,
  module?: string,
  resolved?: boolean,
): Promise<Array<{
  id: number;
  module: string;
  errorType: string;
  errorMessage: string;
  aiAgent: string | null;
  isNotified: boolean;
  resolved: boolean;
  createdAt: Date;
}>> {
  const where: {
    userId?: number;
    module?: string;
    resolved?: boolean;
  } = {};

  if (userId) {
    where.userId = userId;
  }
  if (module) {
    where.module = module;
  }
  if (resolved !== undefined) {
    where.resolved = resolved;
  }

  const logs = await db.errorLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100, // 最新100件
  });

  return logs.map((log) => ({
    id: log.id,
    module: log.module,
    errorType: log.errorType,
    errorMessage: log.errorMessage,
    aiAgent: log.aiAgent,
    isNotified: log.isNotified,
    resolved: log.resolved,
    createdAt: log.createdAt,
  }));
}

export async function markErrorAsResolved(errorLogId: number): Promise<void> {
  await db.errorLog.update({
    where: { id: errorLogId },
    data: {
      resolved: true,
      resolvedAt: new Date(),
    },
  });
}

