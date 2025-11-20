# API連携状況 詳細ドキュメント

## 目次
1. [概要](#概要)
2. [外部API一覧](#外部api一覧)
3. [内部API（tRPCルーター）一覧](#内部apitrpcルーター一覧)
4. [API連携フロー図](#api連携フロー図)
5. [各APIの詳細仕様](#各apiの詳細仕様)
6. [データフロー](#データフロー)
7. [エラーハンドリング](#エラーハンドリング)
8. [環境変数設定](#環境変数設定)

---

## 概要

本システムは、複数の外部AI APIとWeb検索APIを統合し、美容クリニック向けの経営支援プラットフォームを提供しています。

### システムアーキテクチャ

```
フロントエンド (Next.js/React)
    ↓
tRPC API Layer (Type-safe API)
    ↓
サービス層 (各AIサービス)
    ↓
外部API (OpenAI, Claude, Gemini, Grok, SerpAPI, Google Custom Search)
    ↓
データベース (Prisma/MySQL)
```

---

## 外部API一覧

### 1. OpenAI API

**用途**: ChatGPT（テキスト生成）、DALL·E（画像生成）

**環境変数**: `OPENAI_API_KEY`

**使用サービス**:
- `src/server/services/chatgpt.ts`
- `src/server/services/image-generation.ts`

**主な機能**:
- コンテンツ生成（Instagram LP、ウェブサイト記事、キャンペーンコピー）
- 戦略分析（市場ポジション分析、価格設定提案、キャンペーン提案、新施術提案）
- 画像生成（DALL·E 3）

**使用モデル**:
- GPT-4 Turbo（デフォルト）
- GPT-4
- GPT-3.5 Turbo（フォールバック）

**レート制限**: OpenAIの標準レート制限に準拠

---

### 2. Anthropic Claude API

**用途**: 高品質な戦略分析とコンテンツ生成

**環境変数**: `CLAUDE_API_KEY`

**使用サービス**: `src/server/services/claude.ts`

**主な機能**:
- 戦略分析（市場ポジション分析、価格設定提案、キャンペーン提案、新施術提案）
- Web検索統合（最新情報の取得）

**使用モデル**:
- `claude-opus-4-1`（総合分析・新規導入提案用・最高性能）
- `claude-sonnet-4-5-20250929`（価格設定提案・キャンペーン案用・高性能）
- `claude-3-5-haiku-20241022`（高速・低コスト）

**レート制限**: Anthropicの標準レート制限に準拠

---

### 3. Google Gemini API

**用途**: 市場調査、SNS調査、戦略分析

**環境変数**: `GEMINI_API_KEY`

**使用サービス**: `src/server/services/gemini.ts`

**主な機能**:
- 市場調査（トレンド分析、価格比較、競合分析）
- SNS調査（Instagram、YouTubeトレンド分析）
- 戦略分析（市場ポジション分析、価格設定提案、キャンペーン提案、新施術提案）
- Web検索統合（最新情報の取得）

**使用モデル**:
- `gemini-2.5-pro`（最新・高性能版・2025年5月リリース）
- `gemini-2.5-flash`（最新・高速版・2025年5月リリース）

**レート制限**: Googleの標準レート制限に準拠

---

### 4. xAI Grok API

**用途**: Twitter/Xトレンド分析

**環境変数**: `GROK_API_KEY`, `GROK_API_URL`

**使用サービス**: `src/server/services/grok.ts`

**主な機能**:
- Twitter/Xトレンド分析（ハッシュタグ、インフルエンサー、人気投稿の分析）

**使用モデル**:
- `grok-4`（最新・API経由で利用可能）
- `grok-3`（2025年リリース・安定版）

**レート制限**: xAIの標準レート制限に準拠

---

### 5. SerpAPI

**用途**: Web検索（Google検索結果の取得）

**環境変数**: `SERP_API_KEY`

**使用サービス**: `src/server/services/web-search.ts`

**主な機能**:
- Google検索結果の取得
- トレンド検索、価格検索、競合検索など

**レート制限**: SerpAPIのプランに依存

---

### 6. Google Custom Search API

**用途**: Web検索（SerpAPIの代替）

**環境変数**: `GOOGLE_CUSTOM_SEARCH_API_KEY`, `GOOGLE_CUSTOM_SEARCH_ENGINE_ID`

**使用サービス**: `src/server/services/web-search.ts`

**主な機能**:
- Google Custom Searchによる検索結果の取得
- SerpAPIが利用できない場合のフォールバック

**レート制限**: Google Custom Search APIの無料枠（1日100リクエスト）

---

## 内部API（tRPCルーター）一覧

### 1. Strategy Router (`strategy.ts`)

**エンドポイント**: `/api/trpc/strategy.*`

**主な機能**:
- 市場ポジション分析
- 価格設定提案
- キャンペーン提案
- 新施術提案
- ユーザー設定の更新（AIプロバイダー選択）

**使用する外部API**:
- ChatGPT（デフォルト）
- Claude（ユーザー選択可能）
- Gemini（ユーザー選択可能）

**データフロー**:
```
ユーザー入力
  ↓
商品データ取得（Prisma）
  ↓
市場調査データ取得（Prisma）
  ↓
SNS調査データ取得（Prisma）
  ↓
Web検索実行（SerpAPI/Google Custom Search）
  ↓
AI API呼び出し（ChatGPT/Claude/Gemini）
  ↓
結果をデータベースに保存
  ↓
フロントエンドに返却
```

**主要プロシージャ**:
- `analyzeMarketPosition`: 市場ポジション分析
- `generatePriceRecommendations`: 価格設定提案
- `generateCampaignProposals`: キャンペーン提案
- `suggestNewTreatments`: 新施術提案
- `updateUserSettings`: AIプロバイダー設定更新
- `getCurrentModel`: 現在使用中のモデル情報取得

---

### 2. Market Research Router (`market-research.ts`)

**エンドポイント**: `/api/trpc/marketResearch.*`

**主な機能**:
- トレンド分析
- 価格比較調査
- 競合分析

**使用する外部API**:
- Gemini（固定）

**データフロー**:
```
ユーザー入力（場所、施術、都市）
  ↓
Gemini API呼び出し（Web検索統合）
  ↓
結果をデータベースに保存
  ↓
フロントエンドに返却
```

**主要プロシージャ**:
- `executeTrendAnalysis`: トレンド分析実行
- `executePriceResearch`: 価格比較調査実行
- `executeCompetitorAnalysis`: 競合分析実行
- `getCurrentModel`: 現在使用中のGeminiモデル情報取得

---

### 3. SNS Research Router (`sns-research.ts`)

**エンドポイント**: `/api/trpc/snsResearch.*`

**主な機能**:
- Twitter/Xトレンド分析
- Instagramトレンド分析
- YouTubeトレンド分析

**使用する外部API**:
- Grok（Twitter/X用）
- Gemini（Instagram/YouTube用）

**データフロー**:
```
ユーザー入力（キーワード、時間範囲）
  ↓
AI API呼び出し（Grok/Gemini）
  ↓
結果をデータベースに保存
  ↓
フロントエンドに返却
```

**主要プロシージャ**:
- `analyzeTwitter`: Twitter/Xトレンド分析
- `analyzeInstagram`: Instagramトレンド分析
- `analyzeYouTube`: YouTubeトレンド分析
- `getCurrentModel`: 現在使用中のモデル情報取得

---

### 4. Content Router (`content.ts`)

**エンドポイント**: `/api/trpc/content.*`

**主な機能**:
- Instagram LP生成
- ウェブサイト記事生成
- キャンペーンコピー生成
- Instagram投稿生成（新機能）
- ブログ記事生成（新機能）
- LPテキスト生成（新機能）
- 画像生成（DALL·E 3）

**使用する外部API**:
- ChatGPT（テキスト生成）
- DALL·E 3（画像生成）

**データフロー**:
```
ユーザー入力（キャンペーン情報、ターゲット層など）
  ↓
SNS調査データ取得（Prisma、オプション）
  ↓
ChatGPT API呼び出し（テキスト生成）
  ↓
DALL·E 3 API呼び出し（画像生成、オプション）
  ↓
結果をデータベースに保存
  ↓
フロントエンドに返却
```

**主要プロシージャ**:
- `generateInstagramLP`: Instagram LP生成（旧機能）
- `generateWebsiteArticle`: ウェブサイト記事生成（旧機能）
- `generateCampaignCopy`: キャンペーンコピー生成（旧機能）
- `generateInstagramPostWithImage`: Instagram投稿生成（新機能）
- `generateBlogArticleWithImage`: ブログ記事生成（新機能）
- `generateLpWithImage`: LPテキスト生成（新機能）
- `listContents`: コンテンツ一覧取得
- `getContentDetail`: コンテンツ詳細取得
- `regenerateImageOnly`: 画像のみ再生成

---

### 5. Product Router (`product.ts`)

**エンドポイント**: `/api/trpc/product.*`

**主な機能**:
- 商品管理（CRUD操作）

**使用する外部API**: なし（データベースのみ）

**データフロー**:
```
ユーザー入力
  ↓
Prisma経由でデータベース操作
  ↓
フロントエンドに返却
```

**主要プロシージャ**:
- `create`: 商品作成
- `update`: 商品更新
- `delete`: 商品削除
- `list`: 商品一覧取得
- `getById`: 商品詳細取得

---

### 6. Workflow Router (`workflow.ts`)

**エンドポイント**: `/api/trpc/workflow.*`

**主な機能**:
- ワークフロー管理（CRUD操作）

**使用する外部API**: なし（データベースのみ）

**データフロー**:
```
ユーザー入力
  ↓
Prisma経由でデータベース操作
  ↓
フロントエンドに返却
```

**主要プロシージャ**:
- `create`: ワークフロー作成
- `update`: ワークフロー更新
- `delete`: ワークフロー削除
- `list`: ワークフロー一覧取得
- `getById`: ワークフロー詳細取得

---

### 7. API Key Router (`api-key.ts`)

**エンドポイント**: `/api/trpc/apiKey.*`

**主な機能**:
- APIキー管理（設定、取得）

**使用する外部API**: なし（環境変数の管理のみ）

**データフロー**:
```
ユーザー入力（APIキー）
  ↓
環境変数の検証
  ↓
設定状態を返却
```

**主要プロシージャ**:
- `setApiKey`: APIキー設定
- `getApiKeyStatus`: APIキー状態取得

---

### 8. Prompt Router (`prompt.ts`)

**エンドポイント**: `/api/trpc/prompt.*`

**主な機能**:
- プロンプトテンプレート管理（CRUD操作）

**使用する外部API**: なし（データベースのみ）

**データフロー**:
```
ユーザー入力
  ↓
Prisma経由でデータベース操作
  ↓
フロントエンドに返却
```

**主要プロシージャ**:
- `create`: プロンプト作成
- `update`: プロンプト更新
- `delete`: プロンプト削除
- `list`: プロンプト一覧取得
- `getById`: プロンプト詳細取得

---

### 9. Strategy Management Router (`strategy-management.ts`)

**エンドポイント**: `/api/trpc/strategyManagement.*`

**主な機能**:
- 戦略レコメンデーション管理（CRUD操作）

**使用する外部API**: なし（データベースのみ）

**データフロー**:
```
ユーザー入力
  ↓
Prisma経由でデータベース操作
  ↓
フロントエンドに返却
```

**主要プロシージャ**:
- `create`: 戦略作成
- `update`: 戦略更新
- `delete`: 戦略削除
- `list`: 戦略一覧取得
- `getById`: 戦略詳細取得

---

## API連携フロー図

### 戦略分析フロー

```
[フロントエンド]
    ↓
[tRPC: strategy.analyzeMarketPosition]
    ↓
[データ取得]
    ├─ 商品データ（Prisma）
    ├─ 市場調査データ（Prisma）
    └─ SNS調査データ（Prisma）
    ↓
[Web検索実行]
    ├─ SerpAPI（優先）
    └─ Google Custom Search（フォールバック）
    ↓
[AI API選択]
    ├─ ChatGPT（デフォルト）
    ├─ Claude（ユーザー選択可能）
    └─ Gemini（ユーザー選択可能）
    ↓
[結果保存]
    └─ Prisma（StrategyRecommendationテーブル）
    ↓
[フロントエンドに返却]
```

### 市場調査フロー

```
[フロントエンド]
    ↓
[tRPC: marketResearch.executeTrendAnalysis]
    ↓
[Gemini API呼び出し]
    ├─ Web検索統合
    └─ トレンド分析実行
    ↓
[結果保存]
    └─ Prisma（MarketResearchResultテーブル）
    ↓
[フロントエンドに返却]
```

### SNS調査フロー

```
[フロントエンド]
    ↓
[tRPC: snsResearch.analyzeTwitter]
    ↓
[AI API選択]
    ├─ Grok（Twitter/X用）
    ├─ Gemini（Instagram用）
    └─ Gemini（YouTube用）
    ↓
[結果保存]
    └─ Prisma（SNSResearchResultテーブル）
    ↓
[フロントエンドに返却]
```

### コンテンツ生成フロー

```
[フロントエンド]
    ↓
[tRPC: content.generateInstagramPostWithImage]
    ↓
[SNS調査データ取得（オプション）]
    └─ Prisma（SNSResearchResultテーブル）
    ↓
[ChatGPT API呼び出し]
    └─ テキスト生成
    ↓
[DALL·E 3 API呼び出し（オプション）]
    └─ 画像生成
    ↓
[結果保存]
    ├─ Prisma（GeneratedContentテーブル）
    └─ Prisma（ContentImageテーブル）
    ↓
[フロントエンドに返却]
```

---

## 各APIの詳細仕様

### ChatGPT API

**ベースURL**: `https://api.openai.com/v1`

**認証**: Bearer Token（`OPENAI_API_KEY`）

**主要エンドポイント**:
- `/chat/completions`: チャット完了（テキスト生成）
- `/images/generations`: 画像生成（DALL·E 3）

**使用関数**:
- `callChatGPT()`: 基本的なAPI呼び出し
- `generateInstagramLP()`: Instagram LP生成
- `generateWebsiteArticle()`: ウェブサイト記事生成
- `generateCampaignCopy()`: キャンペーンコピー生成
- `analyzeMarketPosition()`: 市場ポジション分析
- `generatePriceRecommendations()`: 価格設定提案
- `generateCampaignProposals()`: キャンペーン提案
- `suggestNewTreatments()`: 新施術提案

**プロンプト形式**: Claude形式（`<SYS>`, `<DEV>`, `<USER>`タグ）を自動変換

**エラーハンドリング**:
- レート制限エラー: リトライロジック実装
- タイムアウト: 30秒タイムアウト設定
- モデル選択: フォールバックモデル自動選択

---

### Claude API

**ベースURL**: `https://api.anthropic.com/v1`

**認証**: x-api-key（`CLAUDE_API_KEY`）

**主要エンドポイント**:
- `/messages`: メッセージ送信（テキスト生成）

**使用関数**:
- `callClaude()`: 基本的なAPI呼び出し
- `analyzeMarketPosition()`: 市場ポジション分析
- `generatePriceRecommendations()`: 価格設定提案
- `generateCampaignProposals()`: キャンペーン提案
- `suggestNewTreatments()`: 新施術提案

**プロンプト形式**: Claude形式（`<SYS>`, `<DEV>`, `<USER>`タグ）

**エラーハンドリング**:
- レート制限エラー: リトライロジック実装
- タイムアウト: 30秒タイムアウト設定
- モデル選択: 用途別に最適なモデルを自動選択

---

### Gemini API

**ベースURL**: `https://generativelanguage.googleapis.com/v1beta`

**認証**: API Key（`GEMINI_API_KEY`）

**主要エンドポイント**:
- `/models/{model}:generateContent`: コンテンツ生成

**使用関数**:
- `callGemini()`: 基本的なAPI呼び出し
- `researchTrendAnalysis()`: トレンド分析
- `researchPriceComparison()`: 価格比較調査
- `researchCompetitorAnalysis()`: 競合分析
- `analyzeInstagramTrends()`: Instagramトレンド分析
- `analyzeYouTubeTrends()`: YouTubeトレンド分析
- `analyzeMarketPosition()`: 市場ポジション分析
- `generatePriceRecommendations()`: 価格設定提案
- `generateCampaignProposals()`: キャンペーン提案
- `suggestNewTreatments()`: 新施術提案

**プロンプト形式**: プレーンテキスト（構造化データは`<CONSENSUS_JSON>`タグで囲む）

**エラーハンドリング**:
- レート制限エラー: リトライロジック実装
- タイムアウト: 30秒タイムアウト設定
- モデル選択: 最新モデルを自動選択

---

### Grok API

**ベースURL**: `https://api.x.ai/v1`（デフォルト）

**認証**: Bearer Token（`GROK_API_KEY`）

**主要エンドポイント**:
- `/chat/completions`: チャット完了（テキスト生成）

**使用関数**:
- `callGrok()`: 基本的なAPI呼び出し
- `analyzeTwitterTrends()`: Twitter/Xトレンド分析

**プロンプト形式**: プレーンテキスト

**エラーハンドリング**:
- レート制限エラー: リトライロジック実装
- タイムアウト: 30秒タイムアウト設定
- モデル選択: 最新モデルを自動選択

---

### SerpAPI

**ベースURL**: `https://serpapi.com/search.json`

**認証**: API Key（`SERP_API_KEY`）

**主要エンドポイント**:
- `/search.json`: Google検索結果取得

**使用関数**:
- `performWebSearch()`: Web検索実行
- `formatSearchResults()`: 検索結果のフォーマット
- `generateTrendSearchQuery()`: トレンド検索クエリ生成
- `generatePriceSearchQuery()`: 価格検索クエリ生成
- `generateCompetitorSearchQuery()`: 競合検索クエリ生成

**エラーハンドリング**:
- APIキーエラー: Google Custom Search APIにフォールバック
- タイムアウト: 10秒タイムアウト設定

---

### Google Custom Search API

**ベースURL**: `https://www.googleapis.com/customsearch/v1`

**認証**: API Key（`GOOGLE_CUSTOM_SEARCH_API_KEY`）

**主要エンドポイント**:
- `/customsearch/v1`: カスタム検索実行

**使用関数**:
- `performWebSearch()`: Web検索実行（SerpAPIのフォールバック）

**エラーハンドリング**:
- レート制限エラー: エラーメッセージを返却
- タイムアウト: 10秒タイムアウト設定

---

### DALL·E 3 API

**ベースURL**: `https://api.openai.com/v1`

**認証**: Bearer Token（`OPENAI_API_KEY`）

**主要エンドポイント**:
- `/images/generations`: 画像生成

**使用関数**:
- `generateImageWithDalle()`: DALL·E 3による画像生成
- `generateImage()`: 画像生成（プリセット対応）

**画像プリセット**:
- `instagram_square`: 1080x1080px
- `lp_banner`: 1200x630px
- `custom`: カスタムサイズ

**エラーハンドリング**:
- レート制限エラー: エラーメッセージを返却
- タイムアウト: 60秒タイムアウト設定

---

## データフロー

### 戦略分析データフロー

```
1. ユーザーが戦略分析をリクエスト
   ↓
2. tRPCルーター（strategy.ts）がリクエストを受信
   ↓
3. データベースから関連データを取得
   - 商品データ（Productテーブル）
   - 市場調査データ（MarketResearchResultテーブル）
   - SNS調査データ（SNSResearchResultテーブル）
   ↓
4. Web検索を実行（最新情報の取得）
   - SerpAPIまたはGoogle Custom Search API
   ↓
5. プロンプトを準備
   - プロンプトテンプレートを読み込み
   - データをフォーマット（トークン量削減のため最適化）
   - Web検索結果を追加
   ↓
6. AI APIを呼び出し（ユーザー設定に基づいて選択）
   - ChatGPT / Claude / Gemini
   ↓
7. 結果をデータベースに保存
   - StrategyRecommendationテーブル
   ↓
8. フロントエンドに結果を返却
```

### 市場調査データフロー

```
1. ユーザーが市場調査をリクエスト
   ↓
2. tRPCルーター（market-research.ts）がリクエストを受信
   ↓
3. Gemini APIを呼び出し
   - Web検索を統合して最新情報を取得
   - トレンド分析/価格比較/競合分析を実行
   ↓
4. 結果をデータベースに保存
   - MarketResearchResultテーブル
   ↓
5. フロントエンドに結果を返却
```

### SNS調査データフロー

```
1. ユーザーがSNS調査をリクエスト
   ↓
2. tRPCルーター（sns-research.ts）がリクエストを受信
   ↓
3. AI APIを呼び出し（プラットフォームに応じて選択）
   - Twitter/X: Grok API
   - Instagram/YouTube: Gemini API
   ↓
4. 結果をデータベースに保存
   - SNSResearchResultテーブル
   ↓
5. フロントエンドに結果を返却
```

### コンテンツ生成データフロー

```
1. ユーザーがコンテンツ生成をリクエスト
   ↓
2. tRPCルーター（content.ts）がリクエストを受信
   ↓
3. SNS調査データを取得（オプション）
   - SNSResearchResultテーブル
   ↓
4. ChatGPT APIを呼び出し（テキスト生成）
   - プロンプトにSNS調査データを統合
   ↓
5. DALL·E 3 APIを呼び出し（画像生成、オプション）
   - テキストプロンプトから画像を生成
   ↓
6. 結果をデータベースに保存
   - GeneratedContentテーブル（テキスト）
   - ContentImageテーブル（画像）
   ↓
7. フロントエンドに結果を返却
```

---

## エラーハンドリング

### 共通エラーハンドリング

**タイムアウト**:
- ChatGPT/Claude/Gemini: 30秒
- Grok: 30秒
- Web検索: 10秒
- 画像生成: 60秒

**リトライロジック**:
- レート制限エラー: 最大3回リトライ
- ネットワークエラー: 最大3回リトライ
- タイムアウト: 最大2回リトライ

**フォールバック**:
- SerpAPI → Google Custom Search API
- GPT-4 → GPT-3.5 Turbo
- Claude Opus 4.1 → Claude Sonnet 4.5
- Gemini 2.5 Pro → Gemini 2.5 Flash

### エラーログ

**ログ出力先**: コンソール + データベース（ErrorLogテーブル）

**ログ内容**:
- エラー種別
- エラーメッセージ
- スタックトレース
- リクエスト情報
- タイムスタンプ

---

## 環境変数設定

### 必須環境変数

```bash
# OpenAI API
OPENAI_API_KEY=sk-...

# Anthropic Claude API
CLAUDE_API_KEY=sk-ant-...

# Google Gemini API
GEMINI_API_KEY=...

# xAI Grok API
GROK_API_KEY=xai-...
GROK_API_URL=https://api.x.ai/v1/chat/completions  # オプション

# Web検索API（いずれか1つ以上）
SERP_API_KEY=...  # SerpAPI（推奨）
GOOGLE_CUSTOM_SEARCH_API_KEY=...  # Google Custom Search API
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=...  # Google Custom Search Engine ID

# データベース
DATABASE_URL=mysql://...

# その他
NODE_ENV=production
```

### オプション環境変数

```bash
# AIモデル指定（デフォルトモデルを上書き）
OPENAI_MODEL=gpt-4-turbo
CLAUDE_MODEL=claude-opus-4-1
GEMINI_MODEL=gemini-2.5-pro
GROK_MODEL=grok-4

# 戦略分析のデフォルトAIプロバイダー
STRATEGY_AI_PROVIDER=chatgpt  # chatgpt | claude | gemini
```

---

## トークン量最適化

### 実装済みの最適化

1. **データラッパーの削除**
   - `{ text: processedData }` → `processedData`（直接データを渡す）

2. **JSONインデントの削除**
   - `JSON.stringify(data, null, 2)` → `JSON.stringify(data)`

3. **構造化データの優先使用**
   - `consensusJSON`が存在する場合はそれを優先
   - テキスト形式の場合はそのまま使用

4. **冗長メタデータの削除**
   - 「あり」「なし」「unknown」などのメタデータを削除

### 期待される効果

- **ChatGPT/Gemini**: 実際のデータが使用され、冗長なメタデータが削減
- **Claude**: 3-5%のトークン削減（インデント削除）
- **全体的**: データの損失を防止し、トークン使用量を削減

---

## まとめ

本システムは、6つの外部API（OpenAI、Claude、Gemini、Grok、SerpAPI、Google Custom Search）と9つのtRPCルーターを統合し、美容クリニック向けの包括的な経営支援プラットフォームを提供しています。

各APIは適切にエラーハンドリングされ、フォールバック機能により高い可用性を実現しています。また、トークン量の最適化により、コスト効率の良い運用が可能です。

