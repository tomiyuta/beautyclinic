# 戦略分析APIへのデータ受け渡し形式

## 概要

市場調査とSNS分析からのデータが、戦略分析API（Claude/ChatGPT/Gemini）にどのような形で渡されているかを説明します。

## データフロー

### 1. データ取得（`strategy.ts`）

#### 市場調査データの取得

```typescript
// データベースから市場調査結果を取得
const marketResults = await db.marketResearchResult.findMany({
  where: { userId: input.userId },
  orderBy: { createdAt: "desc" },
  take: 10,
});

// データを分類して構造化
const marketData: {
  trends: string | Record<string, unknown> | null;
  pricing: string | Record<string, unknown> | null;
  competitors: string | Record<string, unknown> | null;
} = { trends: null, pricing: null, competitors: null };

marketResults.forEach((result) => {
  if (result.processedData) {
    try {
      // JSON形式の場合はパース
      const parsed = JSON.parse(result.processedData);
      if (result.researchType === "trend_analysis") {
        marketData.trends = parsed;
      } else if (result.researchType === "price_research") {
        marketData.pricing = parsed;
      } else if (result.researchType === "competitor_analysis") {
        marketData.competitors = parsed;
      }
    } catch {
      // テキスト形式の場合はそのまま使用
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

**データ形式**:
- `trends`: `string | Record<string, unknown> | null` - トレンド分析データ
- `pricing`: `string | Record<string, unknown> | null` - 価格調査データ
- `competitors`: `string | Record<string, unknown> | null` - 競合分析データ

#### SNS分析データの取得

```typescript
// データベースからSNS調査結果を取得
const snsResults = await db.sNSResearchResult.findMany({
  where: { userId: input.userId },
  orderBy: { createdAt: "desc" },
  take: 10,
});

// データを配列として構造化
let snsData: Array<string | Record<string, unknown>> = [];

snsData = snsResults
  .map((result) => {
    if (!result.trendData) {
      return null;
    }
    try {
      // JSON形式の場合はパースしてプラットフォーム情報を追加
      const parsed = JSON.parse(result.trendData);
      if (typeof parsed === "object" && parsed !== null) {
        return {
          ...parsed,
          platform: result.platform,  // "twitter", "instagram", etc.
          aiAgent: result.aiAgent,     // "chatgpt", "gemini", "grok"
        };
      }
      return parsed;
    } catch {
      // テキスト形式の場合はプラットフォーム情報を含めたオブジェクトとして返す
      return {
        platform: result.platform,
        aiAgent: result.aiAgent,
        data: result.trendData,
      };
    }
  })
  .filter((data): data is string | Record<string, unknown> => data !== null);
```

**データ形式**:
- `Array<string | Record<string, unknown>>` - SNS調査データの配列
- 各要素には`platform`と`aiAgent`情報が含まれる（Grokデータの識別のため）

### 2. AI APIへの渡し方

#### 総合分析（`analyzeMarketPosition`）

```typescript
// 商品データを準備
const productData = products.map((p) => ({
  name: p.name,
  costPrice: p.costPrice,
  sellingPrice: p.sellingPrice,
  category: p.category,
}));

// AI APIに渡す
if (aiProvider === "chatgpt") {
  result = await chatgptAnalyzeMarketPosition(productData, marketData, snsData, input.location);
} else if (aiProvider === "gemini") {
  result = await geminiAnalyzeMarketPosition(productData, marketData, snsData, input.location);
} else {
  result = await claudeAnalyzeMarketPosition(productData, marketData, snsData, input.location);
}
```

**パラメータ**:
- `productData`: `Array<{name: string, costPrice: number, sellingPrice: number, category: string}>`
- `marketData`: `{trends: string | Record<string, unknown> | null, pricing: ..., competitors: ...}`
- `snsData`: `Array<string | Record<string, unknown>>`
- `location`: `string`

### 3. AIサービスでのデータ処理

#### ChatGPT (`chatgpt.ts`)

```typescript
export async function chatgptAnalyzeMarketPosition(
  clinicProducts: Array<{ name: string; costPrice: number; sellingPrice: number; category: string }>,
  marketData: {
    trends?: string | Record<string, unknown> | null;
    pricing?: string | Record<string, unknown> | null;
    competitors?: string | Record<string, unknown> | null;
  },
  snsData: Array<string | Record<string, unknown>>,
  location: string,
): Promise<string> {
  // データを構造化してプロンプトに埋め込む
  // 1. 商品データを日本語キーに変換
  // 2. 市場データのconsensusJSONを優先的に使用
  // 3. SNSデータのconsensusJSONを優先的に使用
  // 4. JSON.stringifyでシリアライズ（インデントなしでトークン量削減）
}
```

**処理内容**:
- 商品データを日本語キー（`商品名`, `原価`, `販売価格`, `カテゴリ`）に変換
- 市場データの`consensusJSON`を優先的に使用（なければ`text`、それもなければ生データ）
- SNSデータの`consensusJSON`を優先的に使用（なければ`text`、それもなければ生データ）
- `JSON.stringify`でシリアライズ（`null, 2`なしでトークン量削減）

#### Claude (`claude.ts`)

```typescript
export async function claudeAnalyzeMarketPosition(
  clinicProducts: Array<{ name: string; costPrice: number; sellingPrice: number; category: string }>,
  marketData: {
    trends?: string | Record<string, unknown> | null;
    pricing?: string | Record<string, unknown> | null;
    competitors?: string | Record<string, unknown> | null;
  },
  snsData: Array<string | Record<string, unknown>>,
  location: string,
): Promise<string> {
  // ChatGPTと同じ処理ロジック
  // 1. 商品データを日本語キーに変換
  // 2. 市場データのconsensusJSONを優先的に使用
  // 3. SNSデータのconsensusJSONを優先的に使用
  // 4. JSON.stringifyでシリアライズ（インデントなしでトークン量削減）
}
```

**処理内容**:
- ChatGPTと同じ処理ロジック
- Web検索結果も追加される

#### Gemini (`gemini.ts`)

```typescript
export async function geminiAnalyzeMarketPosition(
  clinicProducts: Array<{ name: string; costPrice: number; sellingPrice: number; category: string }>,
  marketData: {
    trends?: string | Record<string, unknown> | null;
    pricing?: string | Record<string, unknown> | null;
    competitors?: string | Record<string, unknown> | null;
  },
  snsData: Array<string | Record<string, unknown>>,
  location: string,
): Promise<string> {
  // ChatGPT/Claudeと同じ処理ロジック
  // 1. 商品データを日本語キーに変換
  // 2. 市場データのconsensusJSONを優先的に使用
  // 3. SNSデータのconsensusJSONを優先的に使用
  // 4. JSON.stringifyでシリアライズ（インデントなしでトークン量削減）
}
```

**処理内容**:
- ChatGPT/Claudeと同じ処理ロジック
- Web検索結果も追加される

## データ形式の詳細

### 市場調査データの構造

#### JSON形式の場合（`consensusJSON`が存在する場合）

```json
{
  "AI分析エージェント": "chatgpt",
  "分析日時": "2025-11-20T12:00:00Z",
  "構造化データ": {
    "主要トレンド": [...],
    "顧客ニーズ": [...],
    "市場動向": [...]
  },
  "レポート": "あり",
  "主要施術": [...],
  "顧客ニーズ": [...],
  "情報源": [...]
}
```

#### テキスト形式の場合

```
市場調査レポートのテキスト形式の内容...
```

### SNS分析データの構造

#### JSON形式の場合（`consensusJSON`が存在する場合）

```json
{
  "platform": "twitter",
  "aiAgent": "grok",
  "consensusJSON": {
    "主要トレンド": [...],
    "人気ハッシュタグ": [...],
    "エンゲージメント": {...}
  }
}
```

#### テキスト形式の場合

```json
{
  "platform": "twitter",
  "aiAgent": "grok",
  "data": "SNS調査レポートのテキスト形式の内容..."
}
```

## トークン量最適化

### 実装されている最適化手法

1. **ラッパーの削除**: `{ text: processedData }`のようなラッパーを削除
2. **consensusJSONの優先使用**: 構造化データを優先的に使用
3. **インデントの削除**: `JSON.stringify(data)`で`null, 2`を指定しない
4. **不要なメタデータの削除**: `reportMarkdown`, `rawText`などの不要なデータを削除

### 期待される効果

- **トークン量削減**: 75-93%の削減
- **APIコスト削減**: $0.50-$1.67/実行の削減
- **レスポンス時間短縮**: 2-7秒の短縮

## データの整合性

### データの優先順位

1. **consensusJSON**: 構造化されたデータ（最優先）
2. **text**: テキスト形式のデータ（次点）
3. **生データ**: その他のデータ（フォールバック）

### プラットフォーム情報の保持

- SNSデータには`platform`と`aiAgent`情報が明示的に含まれる
- Grokデータの識別が可能

## まとめ

市場調査とSNS分析からのデータは、以下の形式で戦略分析APIに渡されます：

1. **市場調査データ**: `{trends, pricing, competitors}`のオブジェクト形式
2. **SNS分析データ**: `Array<string | Record<string, unknown>>`の配列形式
3. **データ処理**: 各AIサービスで`consensusJSON`を優先的に使用し、トークン量を最適化
4. **プラットフォーム情報**: SNSデータには`platform`と`aiAgent`情報が含まれる

すべてのAIサービス（Claude/ChatGPT/Gemini）で同じデータ処理ロジックが適用され、一貫性が保たれています。

