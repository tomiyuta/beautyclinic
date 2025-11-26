/**
 * Vercel Cron Jobs: メトリクス集計
 * 毎日1時に実行
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  // 認証チェック
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 昨日のメトリクスを集計
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // セッション数
    const sessionCount = await db.aiSession.count({
      where: {
        createdAt: {
          gte: yesterday,
          lt: today,
        },
      },
    });

    // タスク数
    const taskCount = await db.aiTask.count({
      where: {
        createdAt: {
          gte: yesterday,
          lt: today,
        },
      },
    });

    // スキル数
    const skillCount = await db.aiSkill.count({
      where: {
        createdAt: {
          gte: yesterday,
          lt: today,
        },
      },
    });

    // 完了したタスク数
    const completedTaskCount = await db.aiTask.count({
      where: {
        status: "success",
        createdAt: {
          gte: yesterday,
          lt: today,
        },
      },
    });

    // メトリクスを保存
    const metrics = {
      sessionCount,
      taskCount,
      skillCount,
      completedTaskCount,
      completionRate: taskCount > 0 ? completedTaskCount / taskCount : 0,
    };

    // 全スペースに対してメトリクスを保存（またはグローバルメトリクス）
    await db.aiMetric.create({
      data: {
        spaceId: null, // グローバルメトリクス
        metricType: "daily",
        date: yesterday,
        data: JSON.parse(JSON.stringify(metrics)),
      },
    });

    return NextResponse.json({
      success: true,
      date: yesterday.toISOString(),
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[aggregate-metrics] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

