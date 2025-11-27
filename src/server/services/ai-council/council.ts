/**
 * LLM Council コアロジック
 */

import { callClaude } from "../claude";
import { callChatGPT } from "../chatgpt";
import { callGemini } from "../gemini";
import { callGrok } from "../grok";
import { callAIWithTimeout } from "../strategy/ai-caller";
import {
  STRATEGY_SYSTEM_PROMPTS,
  PEER_REVIEW_PROMPT,
  CHAIRMAN_SYNTHESIS_PROMPT,
  RESPONSE_LABELS,
  CHAIRMAN_SYNTHESIS_PROMPT_STRATEGY,
  PEER_REVIEW_PROMPT_STRATEGY,
  getOutputFormatForType,
} from "./prompts";
import type {
  CouncilConfig,
  CouncilModel,
  CouncilResponse,
  PeerReviewResult,
  PeerReviewRanking,
  AggregateRanking,
  CouncilFinalResponse,
  CouncilResult,
} from "@/types/ai-council";
import type { StrategyAnalysisType } from "@/types/strategy";

/**
 * モデル別のAPI呼び出し
 */
async function callModel(
  model: CouncilModel,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  switch (model) {
    case "claude": {
      // ClaudeはsystemPromptを直接受け取らないので、プロンプトに含める
      const fullPrompt = systemPrompt
        ? `${systemPrompt}\n\n${prompt}`
        : prompt;
      return await callClaude(fullPrompt);
    }
    
    case "chatgpt": {
      // ChatGPTはsystemPromptを直接受け取る
      return await callChatGPT(prompt, systemPrompt);
    }
    
    case "gemini": {
      // GeminiはsystemPromptを直接受け取らないので、プロンプトに含める
      const fullPrompt = systemPrompt
        ? `${systemPrompt}\n\n${prompt}`
        : prompt;
      return await callGemini(fullPrompt);
    }
    
    case "grok": {
      // GrokはsystemPromptを直接受け取らないので、プロンプトに含める
      const fullPrompt = systemPrompt
        ? `${systemPrompt}\n\n${prompt}`
        : prompt;
      return await callGrok(fullPrompt);
    }
    
    default:
      throw new Error(`Unknown model: ${model}`);
  }
}

/**
 * タイムアウト付きPromise
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Stage 1: 並列クエリで各モデルの回答を収集
 */
export async function stage1CollectResponses(
  query: string,
  models: CouncilModel[],
  analysisType: string,
  timeoutMs: number
): Promise<{ responses: CouncilResponse[]; durationMs: number }> {
  const startTime = Date.now();
  const systemPrompt = STRATEGY_SYSTEM_PROMPTS[analysisType] ?? STRATEGY_SYSTEM_PROMPTS.comprehensive;

  const promises = models.map(async (model): Promise<CouncilResponse> => {
    const modelStartTime = Date.now();
    try {
      const content = await withTimeout(
        callModel(model, query, systemPrompt),
        timeoutMs,
        `${model} timeout`
      );
      
      return {
        model,
        content,
        timestamp: new Date(),
        durationMs: Date.now() - modelStartTime,
      };
    } catch (error) {
      console.error(`[Council] ${model} error:`, error);
      return {
        model,
        content: "",
        timestamp: new Date(),
        durationMs: Date.now() - modelStartTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  const responses = await Promise.all(promises);
  
  return {
    responses,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Stage 2: 匿名化ピアレビュー
 */
export async function stage2CollectRankings(
  query: string,
  responses: CouncilResponse[],
  models: CouncilModel[],
  timeoutMs: number
): Promise<{
  reviews: PeerReviewResult[];
  labelToModel: Record<string, CouncilModel>;
  aggregateRankings: AggregateRanking[];
  durationMs: number;
}> {
  const startTime = Date.now();

  // 成功した回答のみを対象
  const validResponses = responses.filter((r) => !r.error && r.content);
  
  if (validResponses.length < 2) {
    return {
      reviews: [],
      labelToModel: {},
      aggregateRankings: [],
      durationMs: Date.now() - startTime,
    };
  }

  // 匿名化マッピング作成
  const labelToModel: Record<string, CouncilModel> = {};
  validResponses.forEach((r, i) => {
    labelToModel[`Response ${RESPONSE_LABELS[i]}`] = r.model;
  });

  // 匿名化された回答テキスト
  const anonymizedResponses = validResponses
    .map((r, i) => `### Response ${RESPONSE_LABELS[i]}\n${r.content}`)
    .join("\n\n---\n\n");

  // レビュープロンプト作成
  const reviewPrompt = PEER_REVIEW_PROMPT
    .replace("{{QUERY}}", query)
    .replace("{{RESPONSES}}", anonymizedResponses);

  // 各モデルにレビューを依頼
  const reviewPromises = models.map(async (reviewer): Promise<PeerReviewResult> => {
    try {
      const result = await withTimeout(
        callModel(reviewer, reviewPrompt),
        timeoutMs,
        `${reviewer} review timeout`
      );

      const rankings = parseRankingFromText(result, validResponses.length);
      
      return { reviewer, rankings };
    } catch (error) {
      console.error(`[Council] ${reviewer} review error:`, error);
      return {
        reviewer,
        rankings: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  const reviews = await Promise.all(reviewPromises);
  const aggregateRankings = calculateAggregateRankings(reviews, labelToModel);

  return {
    reviews,
    labelToModel,
    aggregateRankings,
    durationMs: Date.now() - startTime,
  };
}

/**
 * ランキングテキストをパース（JSON形式対応）
 */
function parseRankingFromText(text: string, expectedCount: number): PeerReviewRanking[] {
  const rankings: PeerReviewRanking[] = [];

  try {
    // JSON形式を抽出（コードブロック内のJSONを探す）
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;

    // JSONオブジェクトを直接探す
    const jsonObjectMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      const parsed = JSON.parse(jsonObjectMatch[0]);
      if (parsed.evaluations && Array.isArray(parsed.evaluations)) {
        for (const evaluation of parsed.evaluations) {
          if (evaluation.label && typeof evaluation.rank === 'number') {
            rankings.push({
              label: evaluation.label,
              rank: evaluation.rank,
              reasoning: evaluation.reasoning || "",
            });
          }
        }
      }
    }
  } catch (error) {
    console.warn("[Council] JSON parse failed, trying fallback:", error);
  }

  // フォールバック: テキスト形式のパース（後方互換性）
  if (rankings.length === 0) {
    const rankingMatch = text.match(/FINAL RANKING:?\s*([\s\S]*?)(?:$|###|##)/i);
    if (rankingMatch) {
      const rankingSection = rankingMatch[1];
      const lines = rankingSection.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        const match = line.match(/(\d+)\.\s*Response\s+([A-F])\s*[-–:]?\s*(.*)/i);
        if (match) {
          rankings.push({
            label: `Response ${match[2]!.toUpperCase()}`,
            rank: parseInt(match[1]!),
            reasoning: match[3]?.trim() ?? "",
          });
        }
      }
    }
  }

  // 最終フォールバック: 最小限のパターンマッチ
  if (rankings.length === 0) {
    const fallbackMatches = [...text.matchAll(/(\d+)\.\s*Response\s+([A-F])/gi)];
    for (const match of fallbackMatches) {
      rankings.push({
        label: `Response ${match[2]!.toUpperCase()}`,
        rank: parseInt(match[1]!),
        reasoning: "",
      });
    }
  }

  return rankings;
}

/**
 * ランキング集計
 */
function calculateAggregateRankings(
  reviews: PeerReviewResult[],
  labelToModel: Record<string, CouncilModel>
): AggregateRanking[] {
  const modelScores: Record<string, { totalRank: number; count: number }> = {};

  // 初期化
  Object.values(labelToModel).forEach((model) => {
    modelScores[model] = { totalRank: 0, count: 0 };
  });

  // 集計
  for (const review of reviews) {
    if (review.error || !review.rankings.length) continue;
    
    for (const ranking of review.rankings) {
      const model = labelToModel[ranking.label];
      if (model && modelScores[model]) {
        modelScores[model]!.totalRank += ranking.rank;
        modelScores[model]!.count += 1;
      }
    }
  }

  // 平均ランク計算＆ソート
  const aggregateRankings: AggregateRanking[] = Object.entries(modelScores)
    .map(([model, scores]) => ({
      model: model as CouncilModel,
      averageRank: scores.count > 0 ? scores.totalRank / scores.count : 999,
      votes: scores.count,
    }))
    .sort((a, b) => a.averageRank - b.averageRank);

  return aggregateRankings;
}

/**
 * Stage 3: 議長による最終統合
 */
export async function stage3SynthesizeFinal(
  query: string,
  responses: CouncilResponse[],
  aggregateRankings: AggregateRanking[] | undefined,
  chairman: CouncilModel,
  timeoutMs: number
): Promise<CouncilFinalResponse> {
  const startTime = Date.now();

  // 有効な回答一覧
  const validResponses = responses.filter((r) => !r.error && r.content);
  const responsesText = validResponses
    .map((r) => `### ${r.model.toUpperCase()}\n${r.content}`)
    .join("\n\n---\n\n");

  // ランキング情報（あれば）- JSON形式で渡す
  let rankingInfo = "";
  if (aggregateRankings && aggregateRankings.length > 0) {
    const rankingJson = JSON.stringify(
      aggregateRankings.map((r, i) => ({
        rank: i + 1,
        model: r.model,
        averageRank: r.averageRank,
        votes: r.votes,
      })),
      null,
      2
    );
    rankingInfo = `
各AIは相互にレビューを行い、以下の評価結果が得られました：

\`\`\`json
${rankingJson}
\`\`\`

この評価結果を参考にしてください。`;
  }

  // 議長プロンプト作成
  const chairmanPrompt = CHAIRMAN_SYNTHESIS_PROMPT
    .replace("{{QUERY}}", query)
    .replace("{{RESPONSES}}", responsesText)
    .replace("{{RANKING_INFO}}", rankingInfo);

  const content = await withTimeout(
    callModel(chairman, chairmanPrompt),
    timeoutMs,
    "Chairman synthesis timeout"
  );

  return {
    content,
    chairman,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Council実行（メイン関数）
 */
export async function runCouncil(
  query: string,
  config: CouncilConfig & { analysisType?: string }
): Promise<CouncilResult> {
  const totalStartTime = Date.now();
  const analysisType = config.analysisType ?? "comprehensive";

  // バリデーション
  if (config.models.length < 2) {
    throw new Error("Council requires at least 2 models");
  }

  // 議長「自動」の場合、ピアレビュー必須
  const enablePeerReview = config.chairmanMode === "auto" ? true : config.enablePeerReview;

  // Stage 1: 並列クエリ
  console.log("[Council] Stage 1: Collecting responses...");
  const stage1 = await stage1CollectResponses(
    query,
    config.models,
    analysisType,
    config.timeoutMs
  );

  // 有効な回答が2つ未満なら失敗
  const validResponseCount = stage1.responses.filter((r) => !r.error).length;
  if (validResponseCount < 2) {
    throw new Error(`Only ${validResponseCount} model(s) responded successfully. Council requires at least 2.`);
  }

  // Stage 2: ピアレビュー（オプション）
  let stage2: CouncilResult["stage2"] | undefined;
  if (enablePeerReview) {
    console.log("[Council] Stage 2: Collecting peer reviews...");
    stage2 = await stage2CollectRankings(
      query,
      stage1.responses,
      config.models,
      config.timeoutMs
    );
  }

  // 議長決定
  let chairman: CouncilModel;
  if (config.chairmanMode === "auto" && stage2?.aggregateRankings.length) {
    // ランキング1位を議長に
    chairman = stage2.aggregateRankings[0]!.model;
    console.log(`[Council] Auto-selected chairman: ${chairman} (rank 1)`);
  } else {
    // 手動選択 or フォールバック
    chairman = config.manualChairman ?? config.models[0]!;
    console.log(`[Council] Manual chairman: ${chairman}`);
  }

  // Stage 3: 議長統合
  console.log(`[Council] Stage 3: Chairman (${chairman}) synthesizing...`);
  const stage3 = await stage3SynthesizeFinal(
    query,
    stage1.responses,
    stage2?.aggregateRankings,
    chairman,
    config.timeoutMs
  );

  return {
    query,
    config,
    stage1,
    stage2,
    stage3,
    totalDurationMs: Date.now() - totalStartTime,
  };
}

// ============================================================
// 戦略分析用Council実行（新規追加）
// ============================================================

/**
 * Stage 1: 並列クエリで各モデルの回答を収集（戦略分析用）
 */
export async function stage1CollectResponsesForStrategy(
  prompt: string,
  models: CouncilModel[],
  timeoutMs: number
): Promise<{ responses: CouncilResponse[]; durationMs: number }> {
  const startTime = Date.now();
  console.log(`[Council] Stage 1: Querying ${models.length} models...`);

  const promises = models.map(async (model): Promise<CouncilResponse> => {
    const modelStartTime = Date.now();
    try {
      const content = await callAIWithTimeout(model, prompt, timeoutMs);

      return {
        model,
        content,
        timestamp: new Date(),
        durationMs: Date.now() - modelStartTime,
      };
    } catch (error) {
      console.error(`[Council] ${model} error:`, error);
      return {
        model,
        content: "",
        timestamp: new Date(),
        durationMs: Date.now() - modelStartTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  const responses = await Promise.all(promises);
  const durationMs = Date.now() - startTime;
  
  const successCount = responses.filter((r) => !r.error).length;
  console.log(`[Council] Stage 1 complete: ${successCount}/${models.length} succeeded in ${durationMs}ms`);

  return { responses, durationMs };
}

/**
 * Stage 2: 匿名化ピアレビュー（戦略分析用）
 */
export async function stage2CollectRankingsForStrategy(
  originalQuery: string,
  responses: CouncilResponse[],
  models: CouncilModel[],
  timeoutMs: number
): Promise<{
  reviews: PeerReviewResult[];
  labelToModel: Record<string, CouncilModel>;
  aggregateRankings: AggregateRanking[];
  durationMs: number;
}> {
  const startTime = Date.now();
  console.log(`[Council] Stage 2: Collecting peer reviews...`);

  // 成功した回答のみを対象
  const validResponses = responses.filter((r) => !r.error && r.content);

  if (validResponses.length < 2) {
    console.warn(`[Council] Stage 2 skipped: only ${validResponses.length} valid responses`);
    return {
      reviews: [],
      labelToModel: {},
      aggregateRankings: [],
      durationMs: Date.now() - startTime,
    };
  }

  // 匿名化マッピング作成
  const labelToModel: Record<string, CouncilModel> = {};
  validResponses.forEach((r, i) => {
    labelToModel[`Response ${RESPONSE_LABELS[i]}`] = r.model;
  });

  // 匿名化された回答テキスト
  const anonymizedResponses = validResponses
    .map((r, i) => `### Response ${RESPONSE_LABELS[i]}\n${r.content}`)
    .join("\n\n---\n\n");

  // レビュープロンプト作成
  const reviewPrompt = PEER_REVIEW_PROMPT_STRATEGY
    .replace("{{QUERY}}", originalQuery)
    .replace("{{RESPONSES}}", anonymizedResponses);

  // 各モデルにレビューを依頼
  const reviewPromises = models.map(async (reviewer): Promise<PeerReviewResult> => {
    try {
      const result = await callAIWithTimeout(reviewer, reviewPrompt, timeoutMs);
      const rankings = parseRankingFromTextForStrategy(result);

      return { reviewer, rankings };
    } catch (error) {
      console.error(`[Council] ${reviewer} review error:`, error);
      return {
        reviewer,
        rankings: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  const reviews = await Promise.all(reviewPromises);
  const aggregateRankings = calculateAggregateRankings(reviews, labelToModel);
  const durationMs = Date.now() - startTime;

  console.log(`[Council] Stage 2 complete in ${durationMs}ms`);

  return { reviews, labelToModel, aggregateRankings, durationMs };
}

/**
 * ランキングテキストをパース（戦略分析用 - JSON形式対応）
 */
function parseRankingFromTextForStrategy(text: string): PeerReviewRanking[] {
  const rankings: PeerReviewRanking[] = [];

  try {
    // JSON形式を抽出（コードブロック内のJSONを探す）
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;

    // JSONオブジェクトを直接探す
    const jsonObjectMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      const parsed = JSON.parse(jsonObjectMatch[0]);
      if (parsed.evaluations && Array.isArray(parsed.evaluations)) {
        for (const evaluation of parsed.evaluations) {
          if (evaluation.label && typeof evaluation.rank === 'number') {
            rankings.push({
              label: evaluation.label,
              rank: evaluation.rank,
              reasoning: evaluation.reasoning || "",
            });
          }
        }
      }
    }
  } catch (error) {
    console.warn("[Council] JSON parse failed, trying fallback:", error);
  }

  // フォールバック: テキスト形式のパース（後方互換性）
  if (rankings.length === 0) {
    const rankingMatch = text.match(/FINAL RANKING:?\s*([\s\S]*?)(?:$|###|##)/i);
    if (rankingMatch) {
      const rankingSection = rankingMatch[1];
      const lines = rankingSection.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        const match = line.match(/(\d+)\.\s*Response\s+([A-F])\s*[-–:]?\s*(.*)/i);
        if (match) {
          rankings.push({
            label: `Response ${match[2]!.toUpperCase()}`,
            rank: parseInt(match[1]!),
            reasoning: match[3]?.trim() ?? "",
          });
        }
      }
    }
  }

  // 最終フォールバック: 最小限のパターンマッチ
  if (rankings.length === 0) {
    const fallbackMatches = [...text.matchAll(/(\d+)\.\s*Response\s+([A-F])/gi)];
    for (const match of fallbackMatches) {
      rankings.push({
        label: `Response ${match[2]!.toUpperCase()}`,
        rank: parseInt(match[1]!),
        reasoning: "",
      });
    }
  }

  return rankings;
}

/**
 * Stage 3: 議長による最終統合（構造化出力対応）
 */
export async function stage3SynthesizeFinalForStrategy(
  originalQuery: string,
  analysisType: StrategyAnalysisType,
  responses: CouncilResponse[],
  aggregateRankings: AggregateRanking[] | undefined,
  chairman: CouncilModel,
  timeoutMs: number
): Promise<CouncilFinalResponse> {
  const startTime = Date.now();
  console.log(`[Council] Stage 3: Chairman (${chairman}) synthesizing...`);

  // 有効な回答一覧
  const validResponses = responses.filter((r) => !r.error && r.content);
  const responsesText = validResponses
    .map((r) => `### ${r.model.toUpperCase()}の分析\n${r.content}`)
    .join("\n\n---\n\n");

  // ランキング情報（あれば）- JSON形式で渡す
  let rankingInfo = "";
  if (aggregateRankings && aggregateRankings.length > 0) {
    const rankingJson = JSON.stringify(
      aggregateRankings.map((r, i) => ({
        rank: i + 1,
        model: r.model,
        averageRank: r.averageRank,
        votes: r.votes,
      })),
      null,
      2
    );
    rankingInfo = `
各AIは相互にレビューを行い、以下の評価結果が得られました：

\`\`\`json
${rankingJson}
\`\`\`

この評価結果を参考にしてください。`;
  }

  // 分析タイプ別の出力形式
  const outputFormat = getOutputFormatForType(analysisType);

  // 議長プロンプト作成
  const chairmanPrompt = CHAIRMAN_SYNTHESIS_PROMPT_STRATEGY
    .replace("{{QUERY}}", originalQuery)
    .replace("{{RESPONSES}}", responsesText)
    .replace("{{RANKING_INFO}}", rankingInfo)
    .replace("{{OUTPUT_FORMAT}}", outputFormat);

  const content = await callAIWithTimeout(chairman, chairmanPrompt, timeoutMs);
  const durationMs = Date.now() - startTime;

  console.log(`[Council] Stage 3 complete in ${durationMs}ms`);

  return { content, chairman, durationMs };
}

/**
 * 戦略分析用Council実行
 */
export async function runStrategyCouncil(
  prompt: string,
  originalQuery: string,
  analysisType: StrategyAnalysisType,
  config: CouncilConfig
): Promise<CouncilResult> {
  const totalStartTime = Date.now();
  console.log(`[Council] Starting strategy council for: ${analysisType}`);

  // バリデーション
  if (config.models.length < 2) {
    throw new Error("Council requires at least 2 models");
  }

  // 議長「自動」の場合、ピアレビュー必須
  const enablePeerReview =
    config.chairmanMode === "auto" ? true : config.enablePeerReview;

  // Stage 1: 並列クエリ
  const stage1 = await stage1CollectResponsesForStrategy(
    prompt,
    config.models,
    config.timeoutMs
  );

  // 有効な回答が2つ未満なら失敗
  const validResponseCount = stage1.responses.filter((r) => !r.error).length;
  if (validResponseCount < 2) {
    throw new Error(
      `Only ${validResponseCount} model(s) responded. Council requires at least 2.`
    );
  }

  // Stage 2: ピアレビュー（オプション）
  let stage2: CouncilResult["stage2"] | undefined;
  if (enablePeerReview) {
    stage2 = await stage2CollectRankingsForStrategy(
      originalQuery,
      stage1.responses,
      config.models,
      config.timeoutMs
    );
  }

  // 議長決定
  let chairman: CouncilModel;
  if (config.chairmanMode === "auto" && stage2?.aggregateRankings.length) {
    chairman = stage2.aggregateRankings[0]!.model;
    console.log(`[Council] Auto-selected chairman: ${chairman}`);
  } else {
    chairman = config.manualChairman ?? config.models[0]!;
    console.log(`[Council] Manual chairman: ${chairman}`);
  }

  // Stage 3: 議長統合
  const stage3 = await stage3SynthesizeFinalForStrategy(
    originalQuery,
    analysisType,
    stage1.responses,
    stage2?.aggregateRankings,
    chairman,
    config.timeoutMs
  );

  const totalDurationMs = Date.now() - totalStartTime;
  console.log(`[Council] Total duration: ${totalDurationMs}ms`);

  return {
    query: originalQuery,
    config,
    stage1,
    stage2,
    stage3,
    totalDurationMs,
  };
}

