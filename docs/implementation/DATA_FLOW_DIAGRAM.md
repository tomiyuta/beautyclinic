# 調査結果から戦略分析APIへのデータフロー図表

## データフロー概要図

```
┌─────────────────────────────────────────────────────────────────┐
│                     データベース（保存形式）                      │
├─────────────────────────────────────────────────────────────────┤
│ 市場調査結果 (marketResearchResult)                              │
│   - processedData: string (JSON文字列 or テキスト)              │
│   - researchType: "trend_analysis" | "price_research" |         │
│                    "competitor_analysis"                         │
│                                                                  │
│ SNS調査結果 (sNSResearchResult)                                 │
│   - trendData: string (JSON文字列 or テキスト or                 │
│                 <CONSENSUS_JSON>...</CONSENSUS_JSON>形式)        │
│   - platform: "twitter" | "youtube" | "instagram" | "tiktok"    │
│   - aiAgent: "grok" | "gemini"                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              データ処理（strategy.ts）                           │
├─────────────────────────────────────────────────────────────────┤
│ 1. 市場調査データの処理                                          │
│    - JSON.parse() でパース（成功時）                           │
│    - 失敗時はテキスト形式としてそのまま使用                      │
│                                                                  │
│ 2. SNS調査データの処理                                          │
│    - TikTok/YouTube/Instagram:                                  │
│      <CONSENSUS_JSON>セクションを抽出 → JSON.parse()            │
│    - Twitter:                                                    │
│      JSON.parse() を試行、失敗時はテキスト形式                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│           各戦略分析APIへの送信形式                              │
└─────────────────────────────────────────────────────────────────┘
```

## 詳細データフロー表

### 1. 総合分析（analyzeMarketPosition）

| 調査タイプ | データベース形式 | 処理方法 | 送信形式 | 送信先パラメータ |
|---|---|---|---|---|
| **トレンド分析** | `processedData: string` | `JSON.parse()` 成功時 | `Record<string, unknown>` | `marketData.trends` |
| | | `JSON.parse()` 失敗時 | `string` | `marketData.trends` |
| **価格調査** | `processedData: string` | `JSON.parse()` 成功時 | `Record<string, unknown>` | `marketData.pricing` |
| | | `JSON.parse()` 失敗時 | `string` | `marketData.pricing` |
| **競合分析** | `processedData: string` | `JSON.parse()` 成功時 | `Record<string, unknown>` | `marketData.competitors` |
| | | `JSON.parse()` 失敗時 | `string` | `marketData.competitors` |
| **Twitter** | `trendData: string` | `JSON.parse()` 成功時 | `Record<string, unknown>` + `{platform, aiAgent}` | `snsData[]` |
| | | `JSON.parse()` 失敗時 | `{platform, aiAgent, data: string}` | `snsData[]` |
| **YouTube** | `trendData: string`<br>`<CONSENSUS_JSON>...</CONSENSUS_JSON>` | `<CONSENSUS_JSON>`抽出 → `JSON.parse()` | `Record<string, unknown>` + `{platform, aiAgent}` | `snsData[]` |
| | | `<CONSENSUS_JSON>`なし → `JSON.parse()` | `Record<string, unknown>` + `{platform, aiAgent}` | `snsData[]` |
| | | パース失敗時 | `{platform, aiAgent, data: string}` | `snsData[]` |
| **Instagram** | `trendData: string`<br>`<CONSENSUS_JSON>...</CONSENSUS_JSON>` | `<CONSENSUS_JSON>`抽出 → `JSON.parse()` | `Record<string, unknown>` + `{platform, aiAgent}` | `snsData[]` |
| | | `<CONSENSUS_JSON>`なし → `JSON.parse()` | `Record<string, unknown>` + `{platform, aiAgent}` | `snsData[]` |
| | | パース失敗時 | `{platform, aiAgent, data: string}` | `snsData[]` |
| **TikTok** | `trendData: string`<br>`<CONSENSUS_JSON>...</CONSENSUS_JSON>` | `<CONSENSUS_JSON>`抽出 → `JSON.parse()` | `Record<string, unknown>` + `{platform, aiAgent}` | `snsData[]` |
| | | `<CONSENSUS_JSON>`なし → `JSON.parse()` | `Record<string, unknown>` + `{platform, aiAgent}` | `snsData[]` |
| | | パース失敗時 | `{platform, aiAgent, data: string}` | `snsData[]` |

**送信先AI API**: Claude / ChatGPT / Gemini
**送信パラメータ**:
```typescript
{
  clinicProducts: Array<{name, costPrice, sellingPrice, category}>,
  marketData: {
    trends: string | Record<string, unknown> | null,
    pricing: string | Record<string, unknown> | null,
    competitors: string | Record<string, unknown> | null
  },
  snsData: Array<string | Record<string, unknown>>,
  location: string
}
```

---

### 2. 価格設定提案（generatePriceRecommendations）

| 調査タイプ | データベース形式 | 処理方法 | 送信形式 | 送信先パラメータ |
|---|---|---|---|---|
| **価格調査** | `processedData: string` | `JSON.parse()` 成功時 | `Record<string, unknown>` | `marketPricing.data[]` |
| | | `JSON.parse()` 失敗時 | `{text: string}` | `marketPricing.data[]` |

**送信先AI API**: Claude / ChatGPT / Gemini
**送信パラメータ**:
```typescript
{
  products: Array<{name, costPrice, sellingPrice, category}>,
  marketPricing: {
    data: Array<Record<string, unknown>>
  }
}
```

**注意**: トレンド分析、競合分析、SNS調査データは使用されません

---

### 3. キャンペーン案提案（generateCampaignProposals）

| 調査タイプ | データベース形式 | 処理方法 | 送信形式 | 送信先パラメータ |
|---|---|---|---|---|
| **トレンド分析** | `processedData: string` | `JSON.parse()` 成功時 | `Record<string, unknown>` | `trends[]` |
| | | `JSON.parse()` 失敗時 | `string` | `trends[]` |
| **Twitter** | `trendData: string` | `JSON.parse()` 成功時 | `Record<string, unknown>` + `{platform, aiAgent}` | `snsData[]` |
| | | `JSON.parse()` 失敗時 | `{platform, aiAgent, data: string}` | `snsData[]` |
| **YouTube** | `trendData: string`<br>`<CONSENSUS_JSON>...</CONSENSUS_JSON>` | `<CONSENSUS_JSON>`抽出 → `JSON.parse()` | `Record<string, unknown>` + `{platform, aiAgent}` | `snsData[]` |
| | | `<CONSENSUS_JSON>`なし → `JSON.parse()` | `Record<string, unknown>` + `{platform, aiAgent}` | `snsData[]` |
| | | パース失敗時 | `{platform, aiAgent, data: string}` | `snsData[]` |
| **Instagram** | `trendData: string`<br>`<CONSENSUS_JSON>...</CONSENSUS_JSON>` | `<CONSENSUS_JSON>`抽出 → `JSON.parse()` | `Record<string, unknown>` + `{platform, aiAgent}` | `snsData[]` |
| | | `<CONSENSUS_JSON>`なし → `JSON.parse()` | `Record<string, unknown>` + `{platform, aiAgent}` | `snsData[]` |
| | | パース失敗時 | `{platform, aiAgent, data: string}` | `snsData[]` |
| **TikTok** | `trendData: string`<br>`<CONSENSUS_JSON>...</CONSENSUS_JSON>` | `<CONSENSUS_JSON>`抽出 → `JSON.parse()` | `Record<string, unknown>` + `{platform, aiAgent}` | `snsData[]` |
| | | `<CONSENSUS_JSON>`なし → `JSON.parse()` | `Record<string, unknown>` + `{platform, aiAgent}` | `snsData[]` |
| | | パース失敗時 | `{platform, aiAgent, data: string}` | `snsData[]` |

**送信先AI API**: Claude / ChatGPT / Gemini
**送信パラメータ**:
```typescript
{
  trends: Array<Record<string, unknown>>,
  snsData: Array<Record<string, unknown>>
}
```

**注意**: 価格調査、競合分析データは使用されません

---

### 4. 新施術導入提案（suggestNewTreatments）

| 調査タイプ | データベース形式 | 処理方法 | 送信形式 | 送信先パラメータ |
|---|---|---|---|---|
| **トレンド分析** | `processedData: string` | `JSON.parse()` 成功時 | `Record<string, unknown>` | `marketTrends[]` |
| | | `JSON.parse()` 失敗時 | `{text: string}` | `marketTrends[]` |
| **Twitter** | `trendData: string` | `JSON.parse()` 成功時 | `Record<string, unknown>` + `{platform, aiAgent}` | `snsTrends[]` |
| | | `JSON.parse()` 失敗時 | `{platform, aiAgent, data: string}` | `snsTrends[]` |
| **YouTube** | `trendData: string`<br>`<CONSENSUS_JSON>...</CONSENSUS_JSON>` | `<CONSENSUS_JSON>`抽出 → `JSON.parse()` | `Record<string, unknown>` + `{platform, aiAgent}` | `snsTrends[]` |
| | | `<CONSENSUS_JSON>`なし → `JSON.parse()` | `Record<string, unknown>` + `{platform, aiAgent}` | `snsTrends[]` |
| | | パース失敗時 | `{platform, aiAgent, data: string}` | `snsTrends[]` |
| **Instagram** | `trendData: string`<br>`<CONSENSUS_JSON>...</CONSENSUS_JSON>` | `<CONSENSUS_JSON>`抽出 → `JSON.parse()` | `Record<string, unknown>` + `{platform, aiAgent}` | `snsTrends[]` |
| | | `<CONSENSUS_JSON>`なし → `JSON.parse()` | `Record<string, unknown>` + `{platform, aiAgent}` | `snsTrends[]` |
| | | パース失敗時 | `{platform, aiAgent, data: string}` | `snsTrends[]` |
| **TikTok** | `trendData: string`<br>`<CONSENSUS_JSON>...</CONSENSUS_JSON>` | `<CONSENSUS_JSON>`抽出 → `JSON.parse()` | `Record<string, unknown>` + `{platform, aiAgent}` | `snsTrends[]` |
| | | `<CONSENSUS_JSON>`なし → `JSON.parse()` | `Record<string, unknown>` + `{platform, aiAgent}` | `snsTrends[]` |
| | | パース失敗時 | `{platform, aiAgent, data: string}` | `snsTrends[]` |

**送信先AI API**: Claude / ChatGPT / Gemini
**送信パラメータ**:
```typescript
{
  currentTreatments: Array<{name, category}>,
  marketTrends: Array<Record<string, unknown>>,
  snsTrends: Array<Record<string, unknown>>
}
```

**注意**: 価格調査、競合分析データは使用されません

---

## データ処理の詳細フロー

### 市場調査データの処理フロー

```
marketResearchResult.processedData (string)
    ↓
JSON.parse() を試行
    ├─ 成功 → Record<string, unknown> として送信
    └─ 失敗 → string として送信（または {text: string} として送信）
```

### SNS調査データの処理フロー（TikTok/YouTube/Instagram）

```
sNSResearchResult.trendData (string)
    ↓
<CONSENSUS_JSON>...</CONSENSUS_JSON> の存在確認
    ├─ 存在する
    │   ↓
    │   <CONSENSUS_JSON>セクションを抽出
    │   ↓
    │   JSON.parse() を試行
    │   ├─ 成功 → Record<string, unknown> + {platform, aiAgent} として送信
    │   └─ 失敗 → {platform, aiAgent, data: string} として送信
    │
    └─ 存在しない
        ↓
        JSON.parse() を試行（全体をパース）
        ├─ 成功 → Record<string, unknown> + {platform, aiAgent} として送信
        └─ 失敗 → {platform, aiAgent, data: string} として送信
```

### SNS調査データの処理フロー（Twitter）

```
sNSResearchResult.trendData (string)
    ↓
JSON.parse() を試行（全体をパース）
    ├─ 成功 → Record<string, unknown> + {platform, aiAgent} として送信
    └─ 失敗 → {platform, aiAgent, data: string} として送信
```

---

## AI API側でのデータ処理

### Claude / ChatGPT / Gemini 共通の処理

各AI APIサービスでは、受け取ったデータを以下のように処理します：

1. **市場調査データ**:
   - `consensusJSON` プロパティがあれば優先的に使用
   - なければ `text` プロパティを使用
   - どちらもなければ、データ全体を使用

2. **SNS調査データ**:
   - `consensusJSON` プロパティがあれば優先的に使用
   - なければ `text` プロパティを使用
   - どちらもなければ、データ全体を使用

3. **トークン量最適化**:
   - `JSON.stringify()` のインデントを削除（`null, 2` を使用しない）
   - 不要なラッパーオブジェクトを削除
   - 日本語キーを使用してデータを構造化

---

## 使用状況マトリックス

| 戦略分析API | トレンド分析 | 価格調査 | 競合分析 | Twitter | YouTube | Instagram | TikTok |
|---|---|---|---|---|---|---|---|
| **総合分析** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **価格設定提案** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **キャンペーン案提案** | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **新施術導入提案** | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |

---

## 実装コードの参照箇所

### データ取得と処理
- `src/server/api/routers/strategy.ts`:
  - `analyzeMarketPosition`: 111-210行目
  - `generatePriceRecommendations`: 285-316行目
  - `generateCampaignProposals`: 375-450行目
  - `suggestNewTreatments`: 515-580行目

### AI APIサービス
- `src/server/services/claude.ts`:
  - `analyzeMarketPosition`: 170行目～
  - `generatePriceRecommendations`: 363行目～
  - `generateCampaignProposals`: 496行目～
  - `suggestNewTreatments`: 629行目～

- `src/server/services/chatgpt.ts`:
  - `analyzeMarketPosition`: 448行目～
  - `generatePriceRecommendations`: 604行目～
  - `generateCampaignProposals`: 729行目～
  - `suggestNewTreatments`: 849行目～

- `src/server/services/gemini.ts`:
  - `analyzeMarketPosition`: 2254行目～
  - `generatePriceRecommendations`: 2407行目～
  - `generateCampaignProposals`: 2529行目～
  - `suggestNewTreatments`: 2646行目～

---

## まとめ

1. **市場調査データ**は、すべてJSON形式でパースを試み、成功時はオブジェクトとして、失敗時は文字列として送信されます。

2. **SNS調査データ**（TikTok/YouTube/Instagram）は、`<CONSENSUS_JSON>`セクションを優先的に抽出してJSON形式で送信されます。

3. **SNS調査データ**（Twitter）は、全体をJSON形式でパースを試みます。

4. すべてのデータは、プラットフォーム情報（`platform`）とAIエージェント情報（`aiAgent`）を含めて送信されます。

5. 各戦略分析APIは、必要な調査タイプのみを使用します。

