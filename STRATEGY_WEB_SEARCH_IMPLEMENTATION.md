# 戦略分析APIのWeb検索実装詳細

## 概要

戦略分析APIでは、市場調査やSNS調査のデータに加えて、Web検索を実行して最新情報を取得しています。この文書では、Web検索で何を検索しているか、そして市場調査やSNS調査のデータがない場合の動作について説明します。

## Web検索で追加で検索している内容

### 1. 総合分析（`analyzeMarketPosition`）

**検索クエリ**:
```typescript
generateTrendSearchQuery(location, currentYear, currentMonth)
// 例: "東京都 美容皮膚科 トレンド 2025年11月"
```

**検索内容**:
- 指定された地域の美容皮膚科の最新トレンド情報
- 現在の年月時点での最新情報を取得

**検索結果の使用**:
- Web検索結果はプロンプトの最後に追加される
- 市場調査データやSNS調査データと併用して分析に使用される

### 2. 価格設定提案（`generatePriceRecommendations`）

**検索クエリ**:
```typescript
generatePriceSearchQuery(productNames, cities, currentYear, currentMonth)
// 例: "東京都 大阪府 美容クリニック ボトックス ヒアルロン酸 価格 2025年11月"
```

**検索内容**:
- 指定された都市の美容クリニックでの施術価格情報
- 複数の施術名と都市を組み合わせた検索

**検索結果の使用**:
- 価格調査データと併用して、最新の市場価格を分析

### 3. キャンペーン案生成（`generateCampaignProposals`）

**検索クエリ**:
```typescript
// Instagramトレンド検索
generateInstagramTrendSearchQuery(keywords, currentYear, currentMonth)
// 例: "Instagram ボトックス ヒアルロン酸 トレンド 2025年11月 美容"

// YouTubeトレンド検索
generateYouTubeTrendSearchQuery(keywords, currentYear, currentMonth)
// 例: "YouTube ボトックス ヒアルロン酸 トレンド 2025年11月 美容"
```

**検索内容**:
- InstagramやYouTubeでの最新トレンド情報
- 指定されたキーワードに関連するSNSトレンド

**検索結果の使用**:
- SNS調査データと併用して、最新のSNSトレンドを分析

### 4. 新施術提案（`suggestNewTreatments`）

**検索クエリ**:
```typescript
generateTrendSearchQuery(location, currentYear, currentMonth)
// 例: "東京都 美容皮膚科 トレンド 2025年11月"
```

**検索内容**:
- 指定された地域の美容皮膚科の最新トレンド情報
- 新たな施術の需要やトレンドを把握

**検索結果の使用**:
- 市場トレンドデータとSNSトレンドデータと併用して、新施術の需要を分析

## 市場調査やSNS調査のデータがない場合の動作

### データがない場合の処理

#### 1. 市場調査データがない場合

**コード実装**:
```typescript
const marketData: {
  trends: string | Record<string, unknown> | null;
  pricing: string | Record<string, unknown> | null;
  competitors: string | Record<string, unknown> | null;
} = { trends: null, pricing: null, competitors: null };

if (input.includeMarketData) {
  // データベースから取得
  // データがない場合は null のまま
}
```

**プロンプトへの影響**:
- 市場調査データが`null`の場合、プロンプトの「市場調査データ」セクションは空になる
- Web検索結果のみを使用して分析が行われる
- AIは「市場調査データが提供されていないため、Web検索結果を基に分析します」という旨のメッセージを含める可能性がある

#### 2. SNS調査データがない場合

**コード実装**:
```typescript
let snsData: Array<string | Record<string, unknown>> = [];

if (input.includeSNSData) {
  // データベースから取得
  // データがない場合は空配列のまま
}
```

**プロンプトへの影響**:
- SNS調査データが空配列の場合、プロンプトの「SNS調査データ」セクションは空になる
- Web検索結果のみを使用して分析が行われる
- AIは「SNS調査データが提供されていないため、Web検索結果を基に分析します」という旨のメッセージを含める可能性がある

### Web検索の実行

**重要なポイント**:
- Web検索は**常に実行される**（市場調査やSNS調査のデータの有無に関係なく）
- Web検索が失敗した場合でも、警告のみで処理は続行される

**コード実装**:
```typescript
// Web検索を実行して最新情報を取得
let webSearchResults = "";
try {
  const searchQuery = generateTrendSearchQuery(location, currentYear, currentMonth);
  console.log(`[ChatGPT analyzeMarketPosition] Web検索実行: ${searchQuery}`);
  const searchResults = await performWebSearch(searchQuery, 10);
  webSearchResults = formatSearchResults(searchResults);
  console.log(`[ChatGPT analyzeMarketPosition] Web検索結果: ${searchResults.length}件取得`);
} catch (error) {
  console.warn("[ChatGPT analyzeMarketPosition] Web検索に失敗しましたが、続行します:", error);
  webSearchResults = `【注意】Web検索APIが設定されていないため、最新情報の取得に制限があります。\n${error instanceof Error ? error.message : "Unknown error"}\n`;
}
```

### 出力への影響

#### データがある場合とない場合の違い

**1. データがある場合**:
- 市場調査データ、SNS調査データ、Web検索結果の3つを統合して分析
- より詳細で正確な分析が可能
- データの整合性を確認しながら分析

**2. データがない場合**:
- Web検索結果のみを使用して分析
- 最新情報に基づいた分析が可能だが、過去のデータとの比較ができない
- AIは「データが提供されていないため、Web検索結果を基に分析します」という旨のメッセージを含める可能性がある

#### 具体的な出力の違い

**市場調査データがある場合**:
```
【市場ポジション分析】
- 強み: [市場調査データとWeb検索結果を統合した分析]
- 弱み: [市場調査データとWeb検索結果を統合した分析]
- 機会: [市場調査データとWeb検索結果を統合した分析]
- 脅威: [市場調査データとWeb検索結果を統合した分析]
```

**市場調査データがない場合**:
```
【市場ポジション分析】
- 強み: [Web検索結果のみを基にした分析]
- 弱み: [Web検索結果のみを基にした分析]
- 機会: [Web検索結果のみを基にした分析]
- 脅威: [Web検索結果のみを基にした分析]

※市場調査データが提供されていないため、Web検索結果を基に分析しています。
```

## Web検索結果のフォーマット

**検索結果の形式**:
```
【Web検索結果】

1. [タイトル]
   URL: [リンク]
   日付: [日付]（あれば）
   概要: [スニペット]

2. [タイトル]
   URL: [リンク]
   日付: [日付]（あれば）
   概要: [スニペット]

...
```

**プロンプトへの追加方法**:
- Web検索結果はプロンプトの最後に追加される
- 市場調査データやSNS調査データの後に配置される
- AIは「Web検索結果を基に最新情報を考慮してください」という指示を含む

## まとめ

### Web検索で追加で検索している内容

1. **総合分析**: 地域の美容皮膚科の最新トレンド
2. **価格設定提案**: 地域の施術価格情報
3. **キャンペーン案生成**: Instagram/YouTubeの最新トレンド
4. **新施術提案**: 地域の最新トレンド

### 市場調査やSNS調査のデータがない場合の動作

1. **Web検索は常に実行される**: データの有無に関係なく実行
2. **データがない場合はWeb検索結果のみを使用**: 最新情報に基づいた分析が可能
3. **出力に違いがある**: データがある場合とない場合で分析の詳細度が異なる
4. **AIがデータの有無を認識**: データがない場合はその旨を出力に含める可能性がある

### 推奨事項

- **市場調査やSNS調査のデータがある場合**: より詳細で正確な分析が可能
- **データがない場合**: Web検索結果のみを使用するため、最新情報に基づいた分析は可能だが、過去のデータとの比較ができない
- **両方ある場合が最適**: 市場調査データ、SNS調査データ、Web検索結果の3つを統合することで、最も詳細で正確な分析が可能

