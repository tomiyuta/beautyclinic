/**
 * Vercel Cron Jobs: Experience Agent処理
 * 1分ごとに未処理のジョブを処理
 */

import { NextRequest, NextResponse } from "next/server";
import { processExperienceJobs } from "@/server/services/ai-context/experience-agent";

export async function GET(request: NextRequest) {
  // 認証チェック（Vercel Cron Jobsからのリクエストを検証）
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 未処理のジョブを処理（最大10件）
    const results = await processExperienceJobs(10);

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[process-experience-jobs] Error:", error);

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


