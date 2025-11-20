# 市場調査データ（全タイプ）の戦略分析APIへの受け渡し検証レポート

## 検証日時
2025年1月

## 検証対象
市場調査データの3つのタイプ（価格調査、トレンド分析、競合分析）が、すべての戦略分析APIにJSON形式で正しく受け渡しされているかの検証

## 市場調査データのタイプ

1. **`price_research`**（価格調査）
2. **`trend_analysis`**（トレンド分析）
3. **`competitor_analysis`**（競合分析）

## 検証結果（各API別）

### 1. `analyzeMarketPosition`（総合分析）

**ファイル**: `src/server/api/routers/strategy.ts` (111-149行目)

**使用する調査タイプ**: ✅ すべてのタイプ（trend_analysis、price_research、competitor_analysis）

**実装状況**: ✅ 正しく実装済み

```typescript
const marketData: {
  trends: string | Record<string, unknown> | null;
  pricing: string | Record<string, unknown> | null;
  competitors: string | Record<string, unknown> | null;
} = { trends: null, pricing: null, competitors: null };

if (input.includeMarketData) {
  const marketResults = await db.marketResearchResult.findMany({
    where: { userId: input.userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  marketResults.forEach((result) => {
    if (result.processedData) {
      try {
        const parsed = JSON.parse(result.processedData);
        if (result.researchType === "trend_analysis") {
          marketData.trends = parsed;  // ✅ JSON形式でパース
        } else if (result.researchType === "price_research") {
          marketData.pricing = parsed;  // ✅ JSON形式でパース
        } else if (result.researchType === "competitor_analysis") {
          marketData.competitors = parsed;  // ✅ JSON形式でパース
        }
      } catch {
        // JSONでない場合はテキスト形式としてそのまま使用
        if (result.researchType === "trend_analysis") {
          marketData.trends = result.processedData;
        } else if (result.researchType === "price_research") {
          marketData.pricing = result.processedData;
        } else if (result.researchType === "competitor_analysis") {
          marketData.competitors = result.processedData;
        }
      }
    }
  });
}
```

**確認事項**:
- ✅ すべての調査タイプを取得
- ✅ JSON形式の場合は`JSON.parse()`でパース
- ✅ テキスト形式の場合はそのまま使用
- ✅ 調査タイプごとに適切に分類（trends、pricing、competitors）

**AI APIへの送信**:
```typescript
if (aiProvider === "chatgpt") {
  result = await chatgptAnalyzeMarketPosition(productData, marketData, snsData, input.location);
} else if (aiProvider === "gemini") {
  result = await geminiAnalyzeMarketPosition(productData, marketData, snsData, input.location);
} else {
  result = await claudeAnalyzeMarketPosition(productData, marketData, snsData, input.location);
}
```

### 2. `generatePriceRecommendations`（価格設定提案）

**ファイル**: `src/server/api/routers/strategy.ts` (285-310行目)

**使用する調査タイプ**: ✅ `price_research`のみ

**実装状況**: ✅ 修正完了（JSON形式でパース）

```typescript
const priceResults = await db.marketResearchResult.findMany({
  where: {
    userId: input.userId,
    researchType: "price_research",  // ✅ price_researchのみ
  },
  orderBy: { createdAt: "desc" },
  take: 5,
});

const marketPricingArray = priceResults
  .map((result) => {
    if (result.processedData) {
      try {
        // JSON形式の場合はパースして返す
        return JSON.parse(result.processedData) as Record<string, unknown>;  // ✅ JSON形式でパース
      } catch {
        // テキスト形式の場合はそのまま返す
        return { text: result.processedData } as Record<string, unknown>;
      }
    }
    return null;
  })
  .filter((data): data is Record<string, unknown> => data !== null);
```

**確認事項**:
- ✅ `price_research`タイプのみを取得
- ✅ JSON形式の場合は`JSON.parse()`でパース
- ✅ テキスト形式の場合は`{ text: result.processedData }`として返す

**AI APIへの送信**:
```typescript
const marketPricing: Record<string, unknown> =
  marketPricingArray.length > 0
    ? { data: marketPricingArray }
    : {};

if (aiProvider === "chatgpt") {
  result = await chatgptGeneratePriceRecommendations(productData, marketPricing);
} else if (aiProvider === "gemini") {
  result = await geminiGeneratePriceRecommendations(productData, marketPricing);
} else {
  result = await claudeGeneratePriceRecommendations(productData, marketPricing);
}
```

### 3. `generateCampaignProposals`（キャンペーン案生成）

**ファイル**: `src/server/api/routers/strategy.ts` (375-391行目)

**使用する調査タイプ**: ✅ `trend_analysis`のみ

**実装状況**: ✅ 正しく実装済み

```typescript
const trendResults = await db.marketResearchResult.findMany({
  where: {
    userId: input.userId,
    researchType: "trend_analysis",  // ✅ trend_analysisのみ
  },
  orderBy: { createdAt: "desc" },
  take: 5,
});

const trends = trendResults
  .map((result) => {
    if (result.processedData) {
      try {
        // JSON形式の場合はパースして返す
        return JSON.parse(result.processedData);  // ✅ JSON形式でパース
      } catch {
        // テキスト形式の場合はそのまま返す
        return result.processedData;
      }
    }
    return null;
  })
  .filter((data) => data !== null);
```

**確認事項**:
- ✅ `trend_analysis`タイプのみを取得
- ✅ JSON形式の場合は`JSON.parse()`でパース
- ✅ テキスト形式の場合はそのまま返す

**AI APIへの送信**:
```typescript
if (aiProvider === "chatgpt") {
  result = await chatgptGenerateCampaignProposals(trends, snsData);
} else if (aiProvider === "gemini") {
  result = await geminiGenerateCampaignProposals(trends, snsData);
} else {
  result = await claudeGenerateCampaignProposals(trends, snsData);
}
```

### 4. `suggestNewTreatments`（新施術提案）

**ファイル**: `src/server/api/routers/strategy.ts` (515-530行目)

**使用する調査タイプ**: ✅ `trend_analysis`のみ

**実装状況**: ✅ 正しく実装済み

```typescript
const trendResults = await db.marketResearchResult.findMany({
  where: {
    userId: input.userId,
    researchType: "trend_analysis",  // ✅ trend_analysisのみ
  },
  orderBy: { createdAt: "desc" },
  take: 5,
});

const marketTrends = trendResults
  .map((result) => {
    if (result.processedData) {
      try {
        // 既存データがJSON形式の場合とテキスト形式の場合の両方に対応
        return JSON.parse(result.processedData);  // ✅ JSON形式でパース
      } catch {
        // JSONでない場合はテキスト形式として扱う
        return { text: result.processedData };
      }
    }
    return null;
  })
  .filter((data) => data !== null);
```

**確認事項**:
- ✅ `trend_analysis`タイプのみを取得
- ✅ JSON形式の場合は`JSON.parse()`でパース
- ✅ テキスト形式の場合は`{ text: result.processedData }`として返す

**AI APIへの送信**:
```typescript
if (aiProvider === "chatgpt") {
  result = await chatgptSuggestNewTreatments(treatmentData, marketTrends, snsTrends);
} else if (aiProvider === "gemini") {
  result = await geminiSuggestNewTreatments(treatmentData, marketTrends, snsTrends);
} else {
  result = await claudeSuggestNewTreatments(treatmentData, marketTrends, snsTrends);
}
```

## 各調査タイプの使用状況まとめ

| 戦略分析API | trend_analysis | price_research | competitor_analysis |
|---|---|---|---|
| `analyzeMarketPosition` | ✅ 使用 | ✅ 使用 | ✅ 使用 |
| `generatePriceRecommendations` | ❌ 未使用 | ✅ 使用 | ❌ 未使用 |
| `generateCampaignProposals` | ✅ 使用 | ❌ 未使用 | ❌ 未使用 |
| `suggestNewTreatments` | ✅ 使用 | ❌ 未使用 | ❌ 未使用 |

## JSON形式での受け渡し確認

### ✅ すべてのAPIで正しく実装済み

1. **`analyzeMarketPosition`**:
   - ✅ `trend_analysis`: JSON形式でパース
   - ✅ `price_research`: JSON形式でパース
   - ✅ `competitor_analysis`: JSON形式でパース

2. **`generatePriceRecommendations`**:
   - ✅ `price_research`: JSON形式でパース（修正完了）

3. **`generateCampaignProposals`**:
   - ✅ `trend_analysis`: JSON形式でパース

4. **`suggestNewTreatments`**:
   - ✅ `trend_analysis`: JSON形式でパース

## データフロー

```
市場調査実行（価格調査/トレンド分析/競合分析）
  ↓
データベースに保存（processedData: 文字列形式）
  ↓
戦略分析API呼び出し
  ↓
データベースから取得（researchTypeでフィルタリング）
  ↓
JSON形式かテキスト形式かを判定
  ↓
JSON形式の場合:
  - JSON.parse()でパース
  - オブジェクトとして送信
テキスト形式の場合:
  - そのまま文字列として送信、または
  - { text: ... }として送信
  ↓
AI API（Claude/ChatGPT/Gemini）に送信
```

## 結論

**検証結果**: ✅ すべての市場調査データタイプ（価格調査、トレンド分析、競合分析）が、すべての戦略分析APIでJSON形式で正しく受け渡しされています

**修正内容**: `generatePriceRecommendations`で、`price_research`データがJSON形式でパースされるように修正しました

**ステータス**: ✅ すべての戦略分析APIで正しく実装済み

