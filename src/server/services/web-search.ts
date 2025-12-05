import axios from "axios";

const SERP_API_KEY = process.env.SERP_API_KEY;
const GOOGLE_CUSTOM_SEARCH_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const GOOGLE_CUSTOM_SEARCH_ENGINE_ID = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
}

interface CompetitorPlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingsTotal?: number;
  placeId: string;
  businessStatus?: string;
  types?: string[];
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
 * コンテンツ生成など、フォールバックが必要な場合に使用
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
 * Web検索を実行（SerpAPIのみ、フォールバックなし）
 * リサーチ&戦略提案部分で使用。SerpAPIが設定されていない、または失敗した場合はエラーを投げる
 */
export async function performWebSearchWithSerpAPIOnly(query: string, numResults: number = 10): Promise<SearchResult[]> {
  if (!SERP_API_KEY) {
    throw new Error("リサーチ&戦略提案ではSerpAPIが必須です。SERP_API_KEYが設定されていません。");
  }

  try {
    return await searchWithSerpAPI(query, numResults);
  } catch (error) {
    console.error("SerpAPI search failed:", error);
    throw new Error(`SerpAPIによるWeb検索に失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
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

/**
 * Google Maps Geocoding API を使ってlocation文字列から緯度経度を取得
 */
async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("GOOGLE_MAPS_API_KEYが設定されていないため、Google Mapsによるジオコーディングはスキップされます。");
    return null;
  }

  try {
    const response = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
      params: {
        address: location,
        key: GOOGLE_MAPS_API_KEY,
        language: "ja",
        region: "jp",
      },
      timeout: 10000,
    });

    if (response.data.status !== "OK" || !response.data.results?.length) {
      console.warn("Geocoding結果が見つかりませんでした:", response.data.status, response.data.error_message);
      return null;
    }

    const result = response.data.results[0];
    const loc = result.geometry?.location;
    if (!loc) return null;

    return {
      lat: loc.lat,
      lng: loc.lng,
    };
  } catch (error) {
    console.error("Geocoding API error:", error);
    return null;
  }
}

/**
 * Google Maps Places API（Nearby Search）を使って周辺の競合クリニックを検索
 */
async function searchCompetitorsWithGooglePlacesInternal(
  lat: number,
  lng: number,
  radiusKm: number,
  maxResults: number = 20,
): Promise<CompetitorPlace[]> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("GOOGLE_MAPS_API_KEYが設定されていないため、Google Maps Places検索はスキップされます。");
    return [];
  }

  const radiusMeters = Math.max(500, Math.min(radiusKm * 1000, 20000)); // 0.5km〜20kmの範囲に制限

  try {
    const response = await axios.get("https://maps.googleapis.com/maps/api/place/nearbysearch/json", {
      params: {
        key: GOOGLE_MAPS_API_KEY,
        location: `${lat},${lng}`,
        radius: radiusMeters,
        keyword: "美容皮膚科 美容クリニック",
        type: "doctor",
        language: "ja",
      },
      timeout: 10000,
    });

    if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
      console.warn("Places API status:", response.data.status, response.data.error_message);
      return [];
    }

    const results: CompetitorPlace[] = [];
    if (response.data.results?.length) {
      for (const place of response.data.results.slice(0, maxResults)) {
        results.push({
          name: place.name || "",
          address: place.vicinity || place.formatted_address || "",
          lat: place.geometry?.location?.lat ?? 0,
          lng: place.geometry?.location?.lng ?? 0,
          rating: place.rating,
          userRatingsTotal: place.user_ratings_total,
          placeId: place.place_id,
          businessStatus: place.business_status,
          types: place.types || [],
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Places API error:", error);
    return [];
  }
}

/**
 * 競合分析用にlocationとradiusからGoogle Maps Placesを使って競合一覧を取得
 */
export async function searchCompetitorsWithGooglePlaces(
  location: string,
  radiusKm: number,
  maxResults: number = 20,
): Promise<CompetitorPlace[]> {
  if (!GOOGLE_MAPS_API_KEY) {
    // 環境変数がない場合は静かに空配列を返す（フォールバックは呼び出し元でSerpAPIが担う）
    return [];
  }

  const geo = await geocodeLocation(location);
  if (!geo) {
    return [];
  }

  return searchCompetitorsWithGooglePlacesInternal(geo.lat, geo.lng, radiusKm, maxResults);
}

/**
 * Google Maps Placesから取得した競合リストをLLM用のテキストにフォーマット
 */
export function formatCompetitorPlacesForPrompt(places: CompetitorPlace[]): string {
  if (!places.length) {
    return "【Google Maps競合一覧】\n\nGoogle Mapsから取得できる競合クリニック情報は見つかりませんでした。\n";
  }

  let formatted = "【Google Maps競合一覧】\n\n";
  places.forEach((place, index) => {
    formatted += `${index + 1}. ${place.name}\n`;
    if (place.address) {
      formatted += `   住所: ${place.address}\n`;
    }
    if (typeof place.rating === "number") {
      formatted += `   評価: ${place.rating} (${place.userRatingsTotal ?? 0}件の口コミ)\n`;
    }
    formatted += `   Map Place ID: ${place.placeId}\n\n`;
  });

  return formatted;
}

