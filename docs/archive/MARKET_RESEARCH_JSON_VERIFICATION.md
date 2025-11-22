# 市場調査データの戦略分析APIへのJSON形式受け渡しの検証レポート

## 検証日時
2025年1月

## 検証対象
市場調査データ（`marketResearchResult`テーブルの`processedData`フィールド）が戦略分析APIにJSON形式で受け渡しされているかの検証

## 検証結果

### ✅ 正しく実装されていたAPI

#### 1. `analyzeMarketPosition`（総合分析）
**ファイル**: `src/server/api/routers/strategy.ts` (111-149行目)

**実装状況**: ✅ 正しく実装済み

```typescript
marketResults.forEach((result) => {
  if (result.processedData) {
    // データを直接渡す（ラッパーを削除してトークン量を削減）
    // JSON形式の場合はパース、テキスト形式の場合はそのまま
    try {
      const parsed = JSON.parse(result.processedData);
      if (result.researchType === "trend_analysis") {
        marketData.trends = parsed;
      } else if (result.researchType === "price_research") {
        marketData.pricing = parsed;
      } else if (result.researchType === "competitor_analysis") {
        marketData.competitors = parsed;
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
```

**確認事項**:
- ✅ JSON形式の場合は`JSON.parse()`でパース
- ✅ テキスト形式の場合はそのまま使用
- ✅ 調査タイプ（trend_analysis、price_research、competitor_analysis）ごとに分類

#### 2. `generateCampaignProposals`（キャンペーン案生成）
**ファイル**: `src/server/api/routers/strategy.ts` (377-391行目)

**実装状況**: ✅ 正しく実装済み

```typescript
const trends = trendResults
  .map((result) => {
    if (result.processedData) {
      // データを直接渡す（ラッパーを削除してトークン量を削減）
      try {
        // JSON形式の場合はパースして返す
        return JSON.parse(result.processedData);
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
- ✅ JSON形式の場合は`JSON.parse()`でパース
- ✅ テキスト形式の場合はそのまま返す

#### 3. `suggestNewTreatments`（新施術提案）
**ファイル**: `src/server/api/routers/strategy.ts` (517-530行目)

**実装状況**: ✅ 正しく実装済み

```typescript
const marketTrends = trendResults
  .map((result) => {
    if (result.processedData) {
      try {
        // 既存データがJSON形式の場合とテキスト形式の場合の両方に対応
        return JSON.parse(result.processedData);
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
- ✅ JSON形式の場合は`JSON.parse()`でパース
- ✅ テキスト形式の場合は`{ text: result.processedData }`として返す

### ❌ 問題があったAPI（修正済み）

#### 4. `generatePriceRecommendations`（価格設定提案）
**ファイル**: `src/server/api/routers/strategy.ts` (295-303行目)

**問題点**: `processedData`をそのまま型キャストしており、JSON形式でパースしていなかった

**修正前**:
```typescript
const marketPricingArray = priceResults
  .map((result) => {
    if (result.processedData) {
      // データを直接渡す（ラッパーを削除してトークン量を削減）
      return result.processedData as unknown as Record<string, unknown>;
    }
    return null;
  })
  .filter((data): data is Record<string, unknown> => data !== null);
```

**問題**:
- `processedData`は文字列型（`string`）なので、JSON形式の場合はパースする必要がある
- 型キャストのみでは、実際には文字列のまま送信されてしまう可能性がある

**修正後**:
```typescript
const marketPricingArray = priceResults
  .map((result) => {
    if (result.processedData) {
      // データを直接渡す（ラッパーを削除してトークン量を削減）
      // JSON形式の場合はパース、テキスト形式の場合はそのまま
      try {
        // JSON形式の場合はパースして返す
        return JSON.parse(result.processedData) as Record<string, unknown>;
      } catch {
        // テキスト形式の場合はそのまま返す
        return { text: result.processedData } as Record<string, unknown>;
      }
    }
    return null;
  })
  .filter((data): data is Record<string, unknown> => data !== null);
```

**修正内容**:
- ✅ JSON形式の場合は`JSON.parse()`でパース
- ✅ テキスト形式の場合は`{ text: result.processedData }`として返す
- ✅ 他のAPIと同じ処理フローに統一

## 市場調査データの保存形式

**ファイル**: `src/server/api/routers/market-research.ts`

市場調査データは`processedData`フィールドに**文字列形式**で保存されています：

```typescript
// データベースに保存（テキスト形式で保存）
const saved = await db.marketResearchResult.create({
  data: {
    userId: input.userId,
    location: input.location,
    researchType: "trend_analysis",
    aiAgent: "gemini",
    rawData: result,
    processedData: result, // テキスト形式で保存
  },
});
```

**注意**: `processedData`は文字列型なので、JSON形式のデータが保存されている場合は、戦略分析APIで使用する際に`JSON.parse()`でパースする必要があります。

## 修正後の状態

### すべての戦略分析APIで統一された処理

1. **`analyzeMarketPosition`**: ✅ 正しく実装済み
2. **`generatePriceRecommendations`**: ✅ 修正完了
3. **`generateCampaignProposals`**: ✅ 正しく実装済み
4. **`suggestNewTreatments`**: ✅ 正しく実装済み

### 統一された処理フロー

すべての戦略分析APIで、以下の統一された処理フローが実装されています：

1. **JSON形式の場合**:
   - `JSON.parse(result.processedData)`でパース
   - パースされたオブジェクトとして送信

2. **テキスト形式の場合**:
   - そのまま文字列として送信、または
   - `{ text: result.processedData }`として送信（APIによって異なる）

## 確認事項

### ✅ 実装済みの機能

1. **市場調査データの取得**: `marketResearchResult`テーブルから`processedData`を取得
2. **JSON形式の処理**: `JSON.parse()`でパースしてオブジェクトとして送信
3. **テキスト形式の処理**: そのまま文字列として送信、または`{ text: ... }`として送信

### 📋 データフロー

```
市場調査実行
  ↓
データベースに保存（processedData: 文字列形式）
  ↓
戦略分析API呼び出し
  ↓
データベースから取得
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

**修正前**: `generatePriceRecommendations`で、市場調査データがJSON形式でパースされていなかった

**修正後**: すべての戦略分析APIで、市場調査データがJSON形式の場合は正しくパースされて送信されるようになりました

**ステータス**: ✅ すべての戦略分析APIで正しく実装済み

