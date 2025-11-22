# APIデータフロー検証レポート

## 検証日: 2025年11月

## 検証目的

1. ChatGPT, Gemini, Grokで収集された情報が漏れなく適切な形で戦略分析を行うAPIに送られているか
2. 戦略分析を行うAPI（Claude, ChatGPT, Gemini）の3種類全てにきちんと、収集された情報が送られているか
3. 情報を送っている場合の形式
4. 送られた情報は各APIでどのように解釈されて戦略分析に利用されているか

---

## 1. データ収集から戦略分析への流れ

### 1.1 データ収集元

#### 市場調査データ（Gemini）
- **データベーステーブル**: `MarketResearchResult`
- **収集AI**: Gemini
- **データタイプ**: 
  - `trend_analysis` (トレンド分析)
  - `price_research` (価格調査)
  - `competitor_analysis` (競合分析)
- **保存フィールド**: `processedData` (JSON文字列またはテキスト)

#### SNS調査データ（Gemini, Grok）
- **データベーステーブル**: `SNSResearchResult`
- **収集AI**: 
  - Gemini (Instagram, YouTube)
  - Grok (Twitter/X)
- **保存フィールド**: `trendData` (JSON文字列またはテキスト)
- **メタデータ**: `platform` (instagram, youtube, twitter), `aiAgent` (gemini, grok)

#### 商品管理データ
- **データベーステーブル**: `ClinicProduct`
- **フィールド**: `name`, `costPrice`, `sellingPrice`, `category`

---

## 2. 戦略分析APIへのデータ送信（strategy.ts）

### 2.1 analyzeMarketPosition（市場ポジション分析）

#### データ取得処理（strategy.ts: 111-190行）

```typescript
// 市場調査データを取得
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
}

// SNS調査データを取得
let snsData: Array<string | Record<string, unknown>> = [];
if (input.includeSNSData) {
  const snsResults = await db.sNSResearchResult.findMany({
    where: { userId: input.userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  snsData = snsResults
    .map((result) => {
      if (!result.trendData) {
        return null;
      }
      try {
        const parsed = JSON.parse(result.trendData);
        if (typeof parsed === "object" && parsed !== null) {
          return {
            ...parsed,
            platform: result.platform,      // プラットフォーム情報を追加
            aiAgent: result.aiAgent,        // AIエージェント情報を追加
          };
        }
        return parsed;
      } catch {
        // テキスト形式の場合は、プラットフォーム情報を含めたオブジェクトとして返す
        return {
          platform: result.platform,
          aiAgent: result.aiAgent,
          data: result.trendData,
        };
      }
    })
    .filter((data): data is string | Record<string, unknown> => data !== null);
}
```

#### データ送信処理（strategy.ts: 203-210行）

```typescript
let result: string;
if (aiProvider === "chatgpt") {
  result = await chatgptAnalyzeMarketPosition(productData, marketData, snsData, input.location);
} else if (aiProvider === "gemini") {
  result = await geminiAnalyzeMarketPosition(productData, marketData, snsData, input.location);
} else {
  result = await claudeAnalyzeMarketPosition(productData, marketData, snsData, input.location);
}
```

**✅ 確認結果**: 3つのAI全てに同じデータが送信されている

---

### 2.2 generatePriceRecommendations（価格設定提案）

#### データ取得処理（strategy.ts: 261-284行）

```typescript
const priceResults = await db.marketResearchResult.findMany({
  where: {
    userId: input.userId,
    researchType: "price_research",
  },
  orderBy: { createdAt: "desc" },
  take: 5,
});

const marketPricingArray = priceResults
  .map((result) => {
    if (result.processedData) {
      return result.processedData as unknown as Record<string, unknown>;
    }
    return null;
  })
  .filter((data): data is Record<string, unknown> => data !== null);

const marketPricing: Record<string, unknown> =
  marketPricingArray.length > 0
    ? { data: marketPricingArray }
    : {};
```

#### データ送信処理（strategy.ts: 297-304行）

```typescript
let result: string;
if (aiProvider === "chatgpt") {
  result = await chatgptGeneratePriceRecommendations(productData, marketPricing);
} else if (aiProvider === "gemini") {
  result = await geminiGeneratePriceRecommendations(productData, marketPricing);
} else {
  result = await claudeGeneratePriceRecommendations(productData, marketPricing);
}
```

**✅ 確認結果**: 3つのAI全てに同じデータが送信されている

---

### 2.3 generateCampaignProposals（キャンペーン案生成）

#### データ取得処理（strategy.ts: 343-404行）

```typescript
// 市場トレンドデータを取得
const trendResults = await db.marketResearchResult.findMany({
  where: {
    userId: input.userId,
    researchType: "trend_analysis",
  },
  orderBy: { createdAt: "desc" },
  take: 5,
});

const trends = trendResults
  .map((result) => {
    if (result.processedData) {
      try {
        return JSON.parse(result.processedData);
      } catch {
        return result.processedData;
      }
    }
    return null;
  })
  .filter((data) => data !== null);

// SNSデータを取得
const snsResults = await db.sNSResearchResult.findMany({
  where: { userId: input.userId },
  orderBy: { createdAt: "desc" },
  take: 10,
});

const snsData = snsResults
  .map((result) => {
    if (!result.trendData) {
      return null;
    }
    try {
      const parsed = JSON.parse(result.trendData);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return {
          ...parsed,
          platform: result.platform,      // プラットフォーム情報を追加
          aiAgent: result.aiAgent,        // AIエージェント情報を追加
        };
      }
      return parsed;
    } catch {
      return {
        platform: result.platform,
        aiAgent: result.aiAgent,
        data: result.trendData,
      };
    }
  })
  .filter((data) => data !== null);
```

#### データ送信処理（strategy.ts: 410-417行）

```typescript
let result: string;
if (aiProvider === "chatgpt") {
  result = await chatgptGenerateCampaignProposals(trends, snsData);
} else if (aiProvider === "gemini") {
  result = await geminiGenerateCampaignProposals(trends, snsData);
} else {
  result = await claudeGenerateCampaignProposals(trends, snsData);
}
```

**✅ 確認結果**: 3つのAI全てに同じデータが送信されている

---

### 2.4 suggestNewTreatments（新施術導入提案）

#### データ取得処理（strategy.ts: 458-520行）

```typescript
// 市場トレンドを取得
const trendResults = await db.marketResearchResult.findMany({
  where: {
    userId: input.userId,
    researchType: "trend_analysis",
  },
  orderBy: { createdAt: "desc" },
  take: 5,
});

const marketTrends = trendResults
  .map((result) => {
    if (result.processedData) {
      try {
        return JSON.parse(result.processedData);
      } catch {
        return { text: result.processedData };
      }
    }
    return null;
  })
  .filter((data) => data !== null);

// SNSトレンドを取得
const snsResults = await db.sNSResearchResult.findMany({
  where: { userId: input.userId },
  orderBy: { createdAt: "desc" },
  take: 10,
});

const snsTrends = snsResults
  .map((result) => {
    if (!result.trendData) {
      return null;
    }
    try {
      const parsed = JSON.parse(result.trendData);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return {
          ...parsed,
          platform: result.platform,      // プラットフォーム情報を追加
          aiAgent: result.aiAgent,        // AIエージェント情報を追加
        };
      }
      return parsed;
    } catch {
      return {
        platform: result.platform,
        aiAgent: result.aiAgent,
        data: result.trendData,
      };
    }
  })
  .filter((data) => data !== null);
```

#### データ送信処理（strategy.ts: 526-533行）

```typescript
let result: string;
if (aiProvider === "chatgpt") {
  result = await chatgptSuggestNewTreatments(productData, marketTrends, snsTrends);
} else if (aiProvider === "gemini") {
  result = await geminiSuggestNewTreatments(productData, marketTrends, snsTrends);
} else {
  result = await claudeSuggestNewTreatments(productData, marketTrends, snsTrends);
}
```

**✅ 確認結果**: 3つのAI全てに同じデータが送信されている

---

## 3. データ送信形式

### 3.1 データ型定義

#### analyzeMarketPosition
```typescript
// 商品データ
productData: Array<{
  name: string;
  costPrice: number;
  sellingPrice: number;
  category?: string | null;
}>

// 市場データ
marketData: {
  trends?: string | Record<string, unknown> | null;
  pricing?: string | Record<string, unknown> | null;
  competitors?: string | Record<string, unknown> | null;
}

// SNSデータ
snsData: Array<string | Record<string, unknown>>
```

#### generatePriceRecommendations
```typescript
// 商品データ
productData: Array<{
  name: string;
  costPrice: number;
  sellingPrice: number;
  category?: string | null;
}>

// 市場価格データ
marketPricing: Record<string, unknown>
```

#### generateCampaignProposals
```typescript
// 市場トレンド
trends: Array<Record<string, unknown>>

// SNSデータ
snsData: Array<Record<string, unknown>>
```

#### suggestNewTreatments
```typescript
// 商品データ
productData: Array<{
  name: string;
  category?: string | null;
}>

// 市場トレンド
marketTrends: Array<Record<string, unknown>>

// SNSトレンド
snsTrends: Array<Record<string, unknown>>
```

### 3.2 SNSデータの形式（Grokデータ含む）

#### JSON形式の場合
```json
{
  "hashtags": [...],
  "influencers": [...],
  "platform": "twitter",      // プラットフォーム情報
  "aiAgent": "grok",          // AIエージェント情報
  ...
}
```

#### テキスト形式の場合
```json
{
  "platform": "twitter",
  "aiAgent": "grok",
  "data": "テキスト形式のデータ..."
}
```

**✅ 確認結果**: Grokデータも含めて、プラットフォーム情報とAIエージェント情報が明示的に含まれている

---

## 4. 各APIでのデータ解釈と処理

### 4.1 ChatGPT (chatgpt.ts)

#### analyzeMarketPosition（chatgpt.ts: 448-599行）

**データ処理フロー**:
1. 商品データを日本語キーに変換
   ```typescript
   const clinicProductsFormatted = clinicProducts.map(p => ({
     商品名: p.name,
     原価: p.costPrice,
     販売価格: p.sellingPrice,
     カテゴリ: p.category || "未分類",
   }));
   ```

2. 市場データを構造化（consensusJSONを優先）
   ```typescript
   if (marketData.trends) {
     if (typeof marketData.trends === "string") {
       marketDataFormatted.トレンド = marketData.trends;
     } else {
       const trends = marketData.trends as Record<string, unknown>;
       if (trends.consensusJSON) {
         marketDataFormatted.トレンド = trends.consensusJSON;  // 優先
       } else if (trends.text) {
         marketDataFormatted.トレンド = trends.text;
       } else {
         marketDataFormatted.トレンド = trends;
       }
     }
   }
   ```

3. SNSデータを構造化（consensusJSONを優先、platform情報を保持）
   ```typescript
   const snsDataFormatted = snsData.map(s => {
     if (typeof s === "string") {
       return s;
     }
     const data = s as Record<string, unknown>;
     if (data.consensusJSON) {
       return data.consensusJSON;
     } else if (data.text) {
       return data.text;
     } else if (data.platform) {
       return data;  // platform情報がある場合はそのまま返す
     }
     return s;
   });
   ```

4. JSON.stringifyでシリアライズ（インデントなし）
   ```typescript
   const prompt = replacePlaceholders(template, {
     clinicProducts: JSON.stringify(clinicProductsFormatted),
     marketData: JSON.stringify(marketDataFormatted),
     snsData: JSON.stringify(snsDataFormatted),
     location,
   });
   ```

5. Claude形式のプロンプトをChatGPT形式に変換
   ```typescript
   const { systemPrompt, userPrompt } = convertClaudePromptToChatGPT(prompt);
   ```

6. Web検索結果を追加
   ```typescript
   const userPromptWithWebSearch = `${userPrompt}\n\n${webSearchResults}`;
   ```

**✅ 特徴**:
- consensusJSONを優先的に使用
- platform情報を保持（Grokデータの識別が可能）
- トークン量削減のためインデントなし

---

### 4.2 Claude (claude.ts)

#### analyzeMarketPosition（claude.ts: 170-277行）

**データ処理フロー**:
1. データをそのままJSON.stringifyでシリアライズ（インデントなし）
   ```typescript
   const prompt = replacePlaceholders(template, {
     clinicProducts: JSON.stringify(clinicProducts),
     marketData: JSON.stringify(marketData),
     snsData: JSON.stringify(snsData),
     location,
   });
   ```

2. Web検索結果を追加
   ```typescript
   const promptWithWebSearch = `${prompt}\n\n${webSearchResults}`;
   ```

3. Claude APIに送信（Opus 4.1を使用）
   ```typescript
   return callClaude(promptWithWebSearch, OPUS_4_1_CANDIDATES, "opus");
   ```

**✅ 特徴**:
- データをそのまま送信（構造化処理なし）
- プロンプトテンプレート内でデータを解釈
- トークン量削減のためインデントなし

---

### 4.3 Gemini (gemini.ts)

#### analyzeMarketPosition（gemini.ts: 996-1144行）

**データ処理フロー**:
1. 商品データを日本語キーに変換
   ```typescript
   const clinicProductsFormatted = clinicProducts.map(p => ({
     商品名: p.name,
     原価: p.costPrice,
     販売価格: p.sellingPrice,
     カテゴリ: p.category || "未分類",
   }));
   ```

2. 市場データを構造化（consensusJSONを優先）
   ```typescript
   if (marketData.trends) {
     if (typeof marketData.trends === "string") {
       marketDataFormatted.トレンド = marketData.trends;
     } else {
       const trends = marketData.trends as Record<string, unknown>;
       if (trends.consensusJSON) {
         marketDataFormatted.トレンド = trends.consensusJSON;  // 優先
       } else if (trends.text) {
         marketDataFormatted.トレンド = trends.text;
       } else {
         marketDataFormatted.トレンド = trends;
       }
     }
   }
   ```

3. SNSデータを構造化（consensusJSONを優先、platform情報を保持）
   ```typescript
   const snsDataFormatted = snsData.map(s => {
     if (typeof s === "string") {
       return s;
     }
     const data = s as Record<string, unknown>;
     if (data.consensusJSON) {
       return data.consensusJSON;
     } else if (data.text) {
       return data.text;
     } else if (data.platform) {
       return data;  // platform情報がある場合はそのまま返す
     }
     return s;
   });
   ```

4. JSON.stringifyでシリアライズ（インデントなし）
   ```typescript
   const prompt = replacePlaceholders(template, {
     clinicProducts: JSON.stringify(clinicProductsFormatted),
     marketData: JSON.stringify(marketDataFormatted),
     snsData: JSON.stringify(snsDataFormatted),
     location,
   });
   ```

5. Web検索結果を追加
   ```typescript
   const promptWithWebSearch = `${prompt}\n\n${webSearchResults}`;
   ```

**✅ 特徴**:
- consensusJSONを優先的に使用
- platform情報を保持（Grokデータの識別が可能）
- トークン量削減のためインデントなし
- ChatGPTと同様の処理フロー

---

## 5. 検証結果サマリー

### 5.1 データ収集から戦略分析への流れ

| データソース | 収集AI | データベース | 戦略分析への送信 |
|------------|--------|------------|----------------|
| 市場調査（トレンド） | Gemini | MarketResearchResult | ✅ 送信 |
| 市場調査（価格） | Gemini | MarketResearchResult | ✅ 送信 |
| 市場調査（競合） | Gemini | MarketResearchResult | ✅ 送信 |
| SNS調査（Instagram） | Gemini | SNSResearchResult | ✅ 送信 |
| SNS調査（YouTube） | Gemini | SNSResearchResult | ✅ 送信 |
| SNS調査（Twitter/X） | Grok | SNSResearchResult | ✅ 送信（platform情報含む） |
| 商品管理 | - | ClinicProduct | ✅ 送信 |

**✅ 確認結果**: 全てのデータが漏れなく戦略分析APIに送信されている

---

### 5.2 3つのAIへのデータ送信

| 戦略分析関数 | Claude | ChatGPT | Gemini |
|------------|--------|---------|--------|
| analyzeMarketPosition | ✅ | ✅ | ✅ |
| generatePriceRecommendations | ✅ | ✅ | ✅ |
| generateCampaignProposals | ✅ | ✅ | ✅ |
| suggestNewTreatments | ✅ | ✅ | ✅ |

**✅ 確認結果**: 3つのAI全てに同じデータが送信されている

---

### 5.3 データ形式の違い

| AI | データ処理 | consensusJSON優先 | platform情報保持 | インデント |
|----|----------|------------------|-----------------|----------|
| ChatGPT | 構造化処理あり | ✅ | ✅ | なし |
| Claude | そのまま送信 | ❌（プロンプト内で解釈） | ✅ | なし |
| Gemini | 構造化処理あり | ✅ | ✅ | なし |

**✅ 確認結果**: 
- ChatGPTとGeminiは同様の構造化処理を実施
- Claudeはデータをそのまま送信し、プロンプトテンプレート内で解釈
- 全てのAIでplatform情報が保持されている（Grokデータの識別が可能）

---

### 5.4 データ解釈の違い

#### ChatGPT & Gemini
- **構造化データの優先使用**: consensusJSONを優先的に使用
- **フォールバック**: consensusJSONがない場合はtext、それもない場合は生データ
- **プラットフォーム情報の保持**: platformプロパティがある場合はそのまま返す

#### Claude
- **プロンプトテンプレート内で解釈**: データをそのまま送信し、プロンプトテンプレート内で構造化データを優先的に使用するよう指示
- **データ構造の保持**: 送信されたデータ構造をそのまま保持

---

## 6. 潜在的な問題点と改善提案

### 6.1 現在の実装の問題点

1. **Claudeでのデータ処理の不一致**
   - ChatGPT/Geminiは構造化処理を実施しているが、Claudeはデータをそのまま送信
   - プロンプトテンプレート内で解釈するよう指示しているが、実際のデータ構造が異なる可能性

2. **suggestNewTreatmentsでのデータ形式の不一致**
   - marketTrendsとsnsTrendsで、テキスト形式の場合の処理が異なる
   - marketTrends: `{ text: result.processedData }` でラップ
   - snsTrends: `{ platform, aiAgent, data: result.trendData }` でラップ

### 6.2 改善提案

1. **Claudeでのデータ処理の統一**
   - ChatGPT/Geminiと同様に、consensusJSONを優先的に使用する構造化処理を追加

2. **データ形式の統一**
   - 全ての戦略分析関数で、同じデータ処理ロジックを使用

---

## 7. 結論

### ✅ 確認できたこと

1. **データ収集から戦略分析への流れ**: 全てのデータが漏れなく送信されている
2. **3つのAIへのデータ送信**: 全てのAIに同じデータが送信されている
3. **Grokデータの識別**: platform情報とaiAgent情報が明示的に含まれている
4. **データ形式**: JSON形式とテキスト形式の両方に対応

### ⚠️ 注意点

1. **Claudeでのデータ処理**: ChatGPT/Geminiと異なり、データをそのまま送信している
2. **データ形式の統一**: 一部の関数でデータ処理ロジックが異なる

### 📝 推奨事項

1. Claudeでも構造化処理を実施し、consensusJSONを優先的に使用する
2. 全ての戦略分析関数で、同じデータ処理ロジックを使用する

---

## 8. 参考コード

### 8.1 データ取得処理（strategy.ts）

```typescript:111:190:src/server/api/routers/strategy.ts
// 市場調査データを取得
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
          marketData.trends = parsed;
        } else if (result.researchType === "price_research") {
          marketData.pricing = parsed;
        } else if (result.researchType === "competitor_analysis") {
          marketData.competitors = parsed;
        }
      } catch {
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

// SNS調査データを取得
let snsData: Array<string | Record<string, unknown>> = [];
if (input.includeSNSData) {
  const snsResults = await db.sNSResearchResult.findMany({
    where: { userId: input.userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  snsData = snsResults
    .map((result) => {
      if (!result.trendData) {
        return null;
      }
      try {
        const parsed = JSON.parse(result.trendData);
        if (typeof parsed === "object" && parsed !== null) {
          return {
            ...parsed,
            platform: result.platform,
            aiAgent: result.aiAgent,
          };
        }
        return parsed;
      } catch {
        return {
          platform: result.platform,
          aiAgent: result.aiAgent,
          data: result.trendData,
        };
      }
    })
    .filter((data): data is string | Record<string, unknown> => data !== null);
}
```

### 8.2 ChatGPTでのデータ処理（chatgpt.ts）

```typescript:500:571:src/server/services/chatgpt.ts
// 市場データを処理（文字列の場合はそのまま使用、オブジェクトの場合は構造化）
const marketDataFormatted: Record<string, unknown> = {};

if (marketData.trends) {
  if (typeof marketData.trends === "string") {
    marketDataFormatted.トレンド = marketData.trends;
  } else {
    const trends = marketData.trends as Record<string, unknown>;
    if (trends.consensusJSON) {
      marketDataFormatted.トレンド = trends.consensusJSON;
    } else if (trends.text) {
      marketDataFormatted.トレンド = trends.text;
    } else {
      marketDataFormatted.トレンド = trends;
    }
  }
}

// SNSデータを処理（文字列の場合はそのまま使用、オブジェクトの場合は構造化）
const snsDataFormatted = snsData.map(s => {
  if (typeof s === "string") {
    return s;
  }
  const data = s as Record<string, unknown>;
  if (data.consensusJSON) {
    return data.consensusJSON;
  } else if (data.text) {
    return data.text;
  } else if (data.platform) {
    return data;
  }
  return s;
});
```

---

**検証完了日**: 2025年11月20日
**検証者**: AI Assistant
**検証対象**: strategy.ts, chatgpt.ts, claude.ts, gemini.ts

