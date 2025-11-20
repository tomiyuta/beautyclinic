/**
 * AI分析結果からCONSENSUS_JSONを抽出・パースするユーティリティ
 * Gemini/Grokの出力は<CONSENSUS_JSON>と<REPORT_MARKDOWN>の2部構成
 */

/**
 * テキストから<CONSENSUS_JSON>タグ内のJSONを抽出してパース
 */
export function extractConsensusJSON(text: string): Record<string, unknown> | null {
  if (!text || typeof text !== "string") {
    return null;
  }

  try {
    // <CONSENSUS_JSON>タグを探す
    const jsonMatch = text.match(/<CONSENSUS_JSON>\s*([\s\S]*?)<\/CONSENSUS_JSON>/);
    if (!jsonMatch || !jsonMatch[1]) {
      // CONSENSUS_JSONタグがない場合は、全体をJSONとしてパースを試みる
      try {
        return JSON.parse(text.trim());
      } catch {
        return null;
      }
    }

    const jsonText = jsonMatch[1].trim();
    if (!jsonText) {
      return null;
    }

    // JSONをパース
    return JSON.parse(jsonText);
  } catch (error) {
    console.warn("[extractConsensusJSON] Failed to parse JSON:", error);
    return null;
  }
}

/**
 * テキストから<REPORT_MARKDOWN>タグ内のMarkdownを抽出
 */
export function extractReportMarkdown(text: string): string | null {
  if (!text || typeof text !== "string") {
    return null;
  }

  try {
    const markdownMatch = text.match(/<REPORT_MARKDOWN>\s*([\s\S]*?)<\/REPORT_MARKDOWN>/);
    if (markdownMatch && markdownMatch[1]) {
      return markdownMatch[1].trim();
    }
    return null;
  } catch (error) {
    console.warn("[extractReportMarkdown] Failed to extract markdown:", error);
    return null;
  }
}

/**
 * 市場調査結果を構造化データに変換
 */
export function parseMarketResearchResult(
  processedData: string | null,
  researchType: "trend_analysis" | "price_research" | "competitor_analysis",
): {
  consensusJSON: Record<string, unknown> | null;
  reportMarkdown: string | null;
  rawText: string;
} {
  if (!processedData) {
    return {
      consensusJSON: null,
      reportMarkdown: null,
      rawText: "",
    };
  }

  const consensusJSON = extractConsensusJSON(processedData);
  const reportMarkdown = extractReportMarkdown(processedData);

  return {
    consensusJSON,
    reportMarkdown,
    rawText: processedData,
  };
}

/**
 * SNS調査結果を構造化データに変換
 */
export function parseSNSResearchResult(
  trendData: string | null,
): {
  consensusJSON: Record<string, unknown> | null;
  reportMarkdown: string | null;
  rawText: string;
} {
  if (!trendData) {
    return {
      consensusJSON: null,
      reportMarkdown: null,
      rawText: "",
    };
  }

  const consensusJSON = extractConsensusJSON(trendData);
  const reportMarkdown = extractReportMarkdown(trendData);

  return {
    consensusJSON,
    reportMarkdown,
    rawText: trendData,
  };
}

/**
 * 複数の市場調査結果を統合して構造化データを作成
 */
export function aggregateMarketResearchData(
  results: Array<{
    researchType: "trend_analysis" | "price_research" | "competitor_analysis";
    processedData: string | null;
    aiAgent: string;
    createdAt: Date;
  }>,
): {
  trends: {
    consensusJSON: Record<string, unknown> | null;
    reportMarkdown: string | null;
    rawText: string;
    aiAgent: string;
    createdAt: Date;
  } | null;
  pricing: {
    consensusJSON: Record<string, unknown> | null;
    reportMarkdown: string | null;
    rawText: string;
    aiAgent: string;
    createdAt: Date;
  } | null;
  competitors: {
    consensusJSON: Record<string, unknown> | null;
    reportMarkdown: string | null;
    rawText: string;
    aiAgent: string;
    createdAt: Date;
  } | null;
} {
  const trends = results.find((r) => r.researchType === "trend_analysis");
  const pricing = results.find((r) => r.researchType === "price_research");
  const competitors = results.find((r) => r.researchType === "competitor_analysis");

  return {
    trends: trends
      ? {
          ...parseMarketResearchResult(trends.processedData, "trend_analysis"),
          aiAgent: trends.aiAgent,
          createdAt: trends.createdAt,
        }
      : null,
    pricing: pricing
      ? {
          ...parseMarketResearchResult(pricing.processedData, "price_research"),
          aiAgent: pricing.aiAgent,
          createdAt: pricing.createdAt,
        }
      : null,
    competitors: competitors
      ? {
          ...parseMarketResearchResult(competitors.processedData, "competitor_analysis"),
          aiAgent: competitors.aiAgent,
          createdAt: competitors.createdAt,
        }
      : null,
  };
}

/**
 * 複数のSNS調査結果を統合して構造化データを作成
 */
export function aggregateSNSResearchData(
  results: Array<{
    platform: string;
    trendData: string | null;
    aiAgent: string;
    createdAt: Date;
  }>,
): Array<{
  platform: string;
  consensusJSON: Record<string, unknown> | null;
  reportMarkdown: string | null;
  rawText: string;
  aiAgent: string;
  createdAt: Date;
}> {
  return results
    .map((result) => ({
      platform: result.platform,
      ...parseSNSResearchResult(result.trendData),
      aiAgent: result.aiAgent,
      createdAt: result.createdAt,
    }))
    .filter((data) => data.rawText.length > 0);
}

