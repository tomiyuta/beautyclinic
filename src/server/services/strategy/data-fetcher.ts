/**
 * 戦略分析用データ取得
 * DBから事前に保存された市場調査・SNS調査データを取得
 *
 * DBモデル名:
 * - ClinicProduct → db.clinicProduct
 * - MarketResearchResult → db.marketResearchResult
 * - SNSResearchResult → db.sNSResearchResult (Sだけ小文字)
 */

import { db } from "@/server/db";
import type {
  StrategyAnalysisData,
  ProductData,
  MarketResearchData,
  SNSResearchData,
  DataStatus,
} from "@/types/strategy";

// ============================================================
// メイン関数
// ============================================================

/**
 * 戦略分析に必要な全データを取得
 */
export async function fetchStrategyData(
  userId: number
): Promise<StrategyAnalysisData> {
  const [products, marketData, snsData] = await Promise.all([
    fetchProducts(userId),
    fetchLatestMarketResearch(userId),
    fetchLatestSNSResearch(userId),
  ]);

  return {
    products,
    marketData,
    snsData,
    location: marketData?.location,
  };
}

/**
 * データ状態を取得（UI表示用）
 */
export async function fetchDataStatus(userId: number): Promise<DataStatus> {
  const [products, marketData, snsData] = await Promise.all([
    fetchProducts(userId),
    fetchLatestMarketResearch(userId),
    fetchLatestSNSResearch(userId),
  ]);

  return {
    products: {
      count: products.length,
      available: products.length > 0,
    },
    marketData: {
      updatedAt: marketData?.createdAt ?? null,
      available: !!marketData,
    },
    snsData: {
      updatedAt: snsData?.createdAt ?? null,
      available: !!snsData,
    },
  };
}

// ============================================================
// 個別データ取得
// ============================================================

/**
 * 商品データ取得
 * モデル: ClinicProduct → db.clinicProduct
 */
async function fetchProducts(userId: number): Promise<ProductData[]> {
  const products = await db.clinicProduct.findMany({
    where: { 
      userId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      category: true,
      sellingPrice: true,
      description: true,
    },
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name ?? "",
    category: p.category ?? "未分類",
    price: p.sellingPrice ?? 0,
    description: p.description ?? undefined,
  }));
}

/**
 * 最新の市場調査データ取得
 * モデル: MarketResearchResult → db.marketResearchResult
 */
async function fetchLatestMarketResearch(
  userId: number
): Promise<MarketResearchData | undefined> {
  // 複数の調査タイプから最新のデータを取得
  const [trendResearch, priceResearch, competitorResearch] = await Promise.all([
    db.marketResearchResult.findFirst({
      where: { 
        userId,
        researchType: "trend_analysis",
      },
      orderBy: { createdAt: "desc" },
    }),
    db.marketResearchResult.findFirst({
      where: { 
        userId,
        researchType: "price_research",
      },
      orderBy: { createdAt: "desc" },
    }),
    db.marketResearchResult.findFirst({
      where: { 
        userId,
        researchType: "competitor_analysis",
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // 最新のデータを取得（createdAtが最も新しいもの）
  const allResearch = [trendResearch, priceResearch, competitorResearch]
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (allResearch.length === 0) return undefined;

  const latest = allResearch[0]!;

  // processedDataをパースして構造化
  let trends: any = null;
  let priceRanges: any = null;
  let competitors: any = null;

  if (latest.processedData) {
    try {
      const parsed = JSON.parse(latest.processedData);
      if (latest.researchType === "trend_analysis") {
        trends = parsed;
      } else if (latest.researchType === "price_research") {
        priceRanges = parsed;
      } else if (latest.researchType === "competitor_analysis") {
        competitors = parsed;
      }
    } catch {
      // JSONパース失敗時はそのまま使用
      if (latest.researchType === "trend_analysis") {
        trends = latest.processedData;
      } else if (latest.researchType === "price_research") {
        priceRanges = latest.processedData;
      } else if (latest.researchType === "competitor_analysis") {
        competitors = latest.processedData;
      }
    }
  }

  // 他の調査タイプのデータも取得
  if (trendResearch && trendResearch.processedData && trendResearch.id !== latest.id) {
    try {
      trends = JSON.parse(trendResearch.processedData);
    } catch {
      trends = trendResearch.processedData;
    }
  }
  if (priceResearch && priceResearch.processedData && priceResearch.id !== latest.id) {
    try {
      priceRanges = JSON.parse(priceResearch.processedData);
    } catch {
      priceRanges = priceResearch.processedData;
    }
  }
  if (competitorResearch && competitorResearch.processedData && competitorResearch.id !== latest.id) {
    try {
      competitors = JSON.parse(competitorResearch.processedData);
    } catch {
      competitors = competitorResearch.processedData;
    }
  }

  return {
    id: latest.id,
    location: latest.location ?? "",
    competitors,
    priceRanges,
    trends,
    createdAt: latest.createdAt,
  };
}

/**
 * 最新のSNS調査データ取得
 * モデル: SNSResearchResult → db.sNSResearchResult (Sだけ小文字注意)
 */
async function fetchLatestSNSResearch(
  userId: number
): Promise<SNSResearchData | undefined> {
  // 各プラットフォームの最新データを取得
  const [instagram, twitter, tiktok, youtube] = await Promise.all([
    db.sNSResearchResult.findFirst({
      where: { 
        userId,
        platform: "instagram",
      },
      orderBy: { createdAt: "desc" },
    }),
    db.sNSResearchResult.findFirst({
      where: { 
        userId,
        platform: "twitter",
      },
      orderBy: { createdAt: "desc" },
    }),
    db.sNSResearchResult.findFirst({
      where: { 
        userId,
        platform: "tiktok",
      },
      orderBy: { createdAt: "desc" },
    }),
    db.sNSResearchResult.findFirst({
      where: { 
        userId,
        platform: "youtube",
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // 最新のデータを取得
  const allResearch = [instagram, twitter, tiktok, youtube]
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (allResearch.length === 0) return undefined;

  const latest = allResearch[0]!;

  // trendDataをパース
  let trends: any = null;
  let instagramData: any = null;
  let twitterData: any = null;
  let tiktokData: any = null;

  if (latest.trendData) {
    try {
      const parsed = JSON.parse(latest.trendData);
      if (latest.platform === "instagram") {
        instagramData = parsed;
        trends = parsed;
      } else if (latest.platform === "twitter") {
        twitterData = parsed;
        trends = parsed;
      } else if (latest.platform === "tiktok") {
        tiktokData = parsed;
        trends = parsed;
      } else if (latest.platform === "youtube") {
        trends = parsed;
      }
    } catch {
      // JSONパース失敗時はそのまま使用
      if (latest.platform === "instagram") {
        instagramData = latest.trendData;
        trends = latest.trendData;
      } else if (latest.platform === "twitter") {
        twitterData = latest.trendData;
        trends = latest.trendData;
      } else if (latest.platform === "tiktok") {
        tiktokData = latest.trendData;
        trends = latest.trendData;
      } else {
        trends = latest.trendData;
      }
    }
  }

  // 他のプラットフォームのデータも取得
  if (instagram && instagram.trendData && instagram.id !== latest.id) {
    try {
      instagramData = JSON.parse(instagram.trendData);
    } catch {
      instagramData = instagram.trendData;
    }
  }
  if (twitter && twitter.trendData && twitter.id !== latest.id) {
    try {
      twitterData = JSON.parse(twitter.trendData);
    } catch {
      twitterData = twitter.trendData;
    }
  }
  if (tiktok && tiktok.trendData && tiktok.id !== latest.id) {
    try {
      tiktokData = JSON.parse(tiktok.trendData);
    } catch {
      tiktokData = tiktok.trendData;
    }
  }

  // キーワードを集約
  const allKeywords = [instagram, twitter, tiktok, youtube]
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .flatMap((r) => {
      try {
        return JSON.parse(r.keywords);
      } catch {
        return r.keywords.split(",").map((k) => k.trim());
      }
    });

  return {
    id: latest.id,
    keywords: Array.from(new Set(allKeywords)),
    instagramData,
    twitterData,
    tiktokData,
    trends,
    createdAt: latest.createdAt,
  };
}

// ============================================================
// ユーティリティ
// ============================================================

/**
 * 特定の分析タイプに必要なデータのみ取得
 * （将来の最適化用、現在は全データ取得）
 */
export async function fetchDataForAnalysisType(
  userId: number,
  _analysisType: string
): Promise<StrategyAnalysisData> {
  return fetchStrategyData(userId);
}

/**
 * データの鮮度チェック
 * @param date チェックする日付
 * @param daysThreshold 何日以内を「新鮮」とするか
 */
export function isDataFresh(
  date: Date | null | undefined,
  daysThreshold: number = 7
): boolean {
  if (!date) return false;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= daysThreshold;
}

