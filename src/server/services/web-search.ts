import axios from "axios";

const SERP_API_KEY = process.env.SERP_API_KEY;
const GOOGLE_CUSTOM_SEARCH_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const GOOGLE_CUSTOM_SEARCH_ENGINE_ID = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
}

/**
 * SerpAPIを使用してWeb検索を実行
 */
async function searchWithSerpAPI(query: string, numResults: number = 10): Promise<SearchResult[]> {
  if (!SERP_API_KEY) {
    throw new Error("SERP_API_KEYが設定されていません");
  }

  try {
    const response = await axios.get("https://serpapi.com/search.json", {
      params: {
        api_key: SERP_API_KEY,
        q: query,
        engine: "google",
        num: numResults,
        hl: "ja",
        gl: "jp",
      },
      timeout: 10000,
    });

    const results: SearchResult[] = [];
    if (response.data.organic_results) {
      for (const result of response.data.organic_results) {
        results.push({
          title: result.title || "",
          link: result.link || "",
          snippet: result.snippet || "",
          date: result.date || undefined,
        });
      }
    }

    return results;
  } catch (error) {
    console.error("SerpAPI search error:", error);
    throw new Error(`Web検索に失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Google Custom Search APIを使用してWeb検索を実行
 */
async function searchWithGoogleCustomSearch(
  query: string,
  numResults: number = 10,
): Promise<SearchResult[]> {
  if (!GOOGLE_CUSTOM_SEARCH_API_KEY || !GOOGLE_CUSTOM_SEARCH_ENGINE_ID) {
    throw new Error("Google Custom Search APIキーまたはエンジンIDが設定されていません");
  }

  try {
    const response = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: {
        key: GOOGLE_CUSTOM_SEARCH_API_KEY,
        cx: GOOGLE_CUSTOM_SEARCH_ENGINE_ID,
        q: query,
        num: Math.min(numResults, 10), // Google Custom Search APIは最大10件
        lr: "lang_ja",
      },
      timeout: 10000,
    });

    const results: SearchResult[] = [];
    if (response.data.items) {
      for (const item of response.data.items) {
        results.push({
          title: item.title || "",
          link: item.link || "",
          snippet: item.snippet || "",
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Google Custom Search API error:", error);
    throw new Error(`Web検索に失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Web検索を実行（利用可能なAPIを自動選択）
 */
export async function performWebSearch(query: string, numResults: number = 10): Promise<SearchResult[]> {
  // SerpAPIが設定されている場合は優先
  if (SERP_API_KEY) {
    try {
      return await searchWithSerpAPI(query, numResults);
    } catch (error) {
      console.warn("SerpAPI failed, trying Google Custom Search:", error);
    }
  }

  // Google Custom Search APIを試行
  if (GOOGLE_CUSTOM_SEARCH_API_KEY && GOOGLE_CUSTOM_SEARCH_ENGINE_ID) {
    try {
      return await searchWithGoogleCustomSearch(query, numResults);
    } catch (error) {
      console.warn("Google Custom Search API failed:", error);
    }
  }

  throw new Error("Web検索APIが設定されていません。SERP_API_KEYまたはGOOGLE_CUSTOM_SEARCH_API_KEYを設定してください。");
}

/**
 * 検索結果をテキスト形式にフォーマット
 */
export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return "検索結果が見つかりませんでした。";
  }

  let formatted = "【Web検索結果】\n\n";
  results.forEach((result, index) => {
    formatted += `${index + 1}. ${result.title}\n`;
    formatted += `   URL: ${result.link}\n`;
    if (result.date) {
      formatted += `   日付: ${result.date}\n`;
    }
    formatted += `   概要: ${result.snippet}\n\n`;
  });

  return formatted;
}

/**
 * トレンド分析用のWeb検索クエリを生成
 */
export function generateTrendSearchQuery(location: string, currentYear: number, currentMonth: number): string {
  return `${location} 美容皮膚科 トレンド ${currentYear}年${currentMonth}月`;
}

/**
 * 価格調査用のWeb検索クエリを生成
 */
export function generatePriceSearchQuery(
  treatments: string[],
  cities: string[],
  currentYear: number,
  currentMonth: number,
): string {
  const treatmentStr = treatments.join(" ");
  const cityStr = cities.join(" ");
  return `${cityStr} 美容クリニック ${treatmentStr} 価格 ${currentYear}年${currentMonth}月`;
}

/**
 * Instagramトレンド分析用のWeb検索クエリを生成
 */
export function generateInstagramTrendSearchQuery(
  keywords: string[],
  currentYear: number,
  currentMonth: number,
): string {
  const keywordStr = keywords.join(" ");
  return `Instagram ${keywordStr} トレンド ${currentYear}年${currentMonth}月 美容`;
}

/**
 * YouTubeトレンド分析用のWeb検索クエリを生成
 */
export function generateYouTubeTrendSearchQuery(
  keywords: string[],
  currentYear: number,
  currentMonth: number,
): string {
  const keywordStr = keywords.join(" ");
  return `YouTube ${keywordStr} トレンド ${currentYear}年${currentMonth}月 美容`;
}

/**
 * TikTokトレンド分析用のWeb検索クエリを生成
 */
export function generateTikTokTrendSearchQuery(
  keywords: string[],
  currentYear: number,
  currentMonth: number,
): string {
  const keywordStr = keywords.join(" ");
  return `TikTok ${keywordStr} トレンド ${currentYear}年${currentMonth}月 美容`;
}

/**
 * 競合分析用のWeb検索クエリを生成
 */
export function generateCompetitorSearchQuery(
  location: string,
  radius: number,
  currentYear: number,
  currentMonth: number,
): string {
  return `${location} 美容皮膚科 クリニック ${radius}km ${currentYear}年${currentMonth}月 競合`;
}

/**
 * Instagram LP生成用のWeb検索クエリを生成
 */
export function generateInstagramLPSearchQuery(
  campaignTitle: string,
  currentYear: number,
  currentMonth: number,
): string {
  return `Instagram 美容 キャンペーン ${campaignTitle} ${currentYear}年${currentMonth}月 トレンド`;
}

/**
 * HP記事生成用のWeb検索クエリを生成
 */
export function generateWebsiteArticleSearchQuery(
  campaignTitle: string,
  keywords: string[],
  currentYear: number,
  currentMonth: number,
): string {
  const keywordStr = keywords.length > 0 ? keywords.join(" ") : "美容 美容皮膚科";
  return `${campaignTitle} ${keywordStr} ${currentYear}年${currentMonth}月 トレンド SEO`;
}

/**
 * キャンペーンコピー生成用のWeb検索クエリを生成
 */
export function generateCampaignCopySearchQuery(
  campaignTitle: string,
  currentYear: number,
  currentMonth: number,
): string {
  return `美容 キャンペーン ${campaignTitle} ${currentYear}年${currentMonth}月 トレンド コピー`;
}

