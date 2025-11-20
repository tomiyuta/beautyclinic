# 美容クリニックAI協調プラットフォーム

## 目次

1. [システムの基本コンセプト](#システムの基本コンセプト)
2. [システムアーキテクチャ](#システムアーキテクチャ)
3. [技術スタック](#技術スタック)
4. [データベーススキーマ](#データベーススキーマ)
5. [主要機能の詳細](#主要機能の詳細)
6. [AIエージェントの役割分担](#aiエージェントの役割分担)
7. [各AIのプロンプト詳細](#各aiのプロンプト詳細)
8. [API設計](#api設計)
9. [フロントエンド構成](#フロントエンド構成)
10. [セットアップ手順](#セットアップ手順)
11. [使用方法](#使用方法)
12. [開発ガイド](#開発ガイド)

---

## システムの基本コンセプト

### 概要

本システムは、複数のAIエージェント（Gemini、Grok、Claude、ChatGPT）を協調させて、美容クリニックの経営戦略立案からコンテンツ生成までを支援する統合プラットフォームです。

### コアコンセプト

1. **複数AI協業アーキテクチャ**
   - 各AIエージェントが専門分野を担当し、結果を統合して総合的な戦略を提案
   - Gemini: 市場調査・SNS調査（Instagram/YouTube）
   - Grok: SNS調査（X/Twitter）
   - Claude/ChatGPT: 戦略統合・コンテンツ生成

2. **構造化データの活用**
   - 各AIの出力を`<CONSENSUS_JSON>`（機械処理用）と`<REPORT_MARKDOWN>`（人間可読）の2部構成で統一
   - 構造化データを優先的に使用し、数値やURLなどの根拠を活用

3. **小規模クリニック最適化**
   - 人的・予算・在庫（予約枠）の制約を考慮した実現可能な戦略提案
   - 「翌週から動かせる計画」を重視

4. **医療広告ガイドライン対応**
   - 誇大・断定・比較優良誤認表現の自動チェック・修正
   - 禁止ワードリストによる自動フィルタリング
   - 注意書きの自動付与

5. **最新情報の統合**
   - Web検索機能（SerpAPI/Google Custom Search）による最新トレンド情報の取得
   - 各AI分析に最新データを反映

---

## システムアーキテクチャ

### 全体構成

```
┌─────────────────────────────────────────────────────────────┐
│                    フロントエンド層                           │
│  Next.js 13 (App Router) + React 18 + TypeScript            │
│  Atlassian Design System                                    │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    API層 (tRPC)                              │
│  - content.ts: コンテンツ生成API                             │
│  - market-research.ts: 市場調査API                          │
│  - sns-research.ts: SNS調査API                              │
│  - strategy.ts: 戦略分析API                                 │
│  - product.ts: 商品管理API                                  │
│  - prompt.ts: プロンプト管理API                             │
│  - workflow.ts: ワークフロー管理API                         │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   サービス層                                 │
│  - chatgpt.ts: ChatGPT統合                                  │
│  - claude.ts: Claude統合                                    │
│  - gemini.ts: Gemini統合                                    │
│  - grok.ts: Grok統合                                        │
│  - content-generation.ts: コンテンツ生成ロジック            │
│  - image-generation.ts: 画像生成（DALL·E 3）                │
│  - web-search.ts: Web検索統合                                │
│  - prompt-helper.ts: プロンプト管理                          │
│  - workflow-orchestrator.ts: ワークフロー実行               │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   ユーティリティ層                           │
│  - advertising-guidelines.ts: 医療広告ガイドライン対応      │
│  - parse-ai-results.ts: AI結果の構造化データ抽出            │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   データ層 (Prisma + MySQL)                  │
│  - ClinicProduct: 商品管理                                   │
│  - MarketResearchResult: 市場調査結果                        │
│  - SNSResearchResult: SNS調査結果                            │
│  - StrategyRecommendation: 戦略提案                          │
│  - GeneratedContent: 生成コンテンツ                          │
│  - ContentImage: コンテンツ画像                              │
│  - PromptTemplate: プロンプトテンプレート                    │
│  - UserSettings: ユーザー設定                                │
│  - WorkflowExecution: ワークフロー実行履歴                   │
│  - ErrorLog: エラーログ                                     │
└─────────────────────────────────────────────────────────────┘
```

### データフロー

1. **市場調査・SNS調査の流れ**
   ```
   ユーザー入力 → Gemini/Grok API → 構造化データ抽出 → DB保存 → 戦略分析に活用
   ```

2. **戦略分析の流れ**
   ```
   市場データ + SNSデータ → Claude/ChatGPT統合分析 → 戦略提案 → DB保存
   ```

3. **コンテンツ生成の流れ**
   ```
   キャンペーン情報 + SNS調査結果 → ChatGPT生成 → 画像生成（DALL·E） → DB保存
   ```

---

## 技術スタック

### フロントエンド

- **Next.js 13.5.6**: App Routerを使用したReactフレームワーク
- **React 18.2.0**: UIライブラリ
- **TypeScript 5**: 型安全性
- **Atlassian Design System**: UIコンポーネントライブラリ
  - Button, TextField, Textarea, Select, Banner, Badge, Tag, Spinner, EmptyState, Checkbox, Table, Form等
- **@tanstack/react-query**: データフェッチング・キャッシュ管理
- **@trpc/react-query**: tRPCクライアント

### バックエンド

- **tRPC 11.7.1**: 型安全なAPI層
- **Prisma 6.18.0**: ORM（MySQL）
- **Zod 4.1.12**: スキーマバリデーション
- **superjson 2.2.5**: JSONシリアライゼーション

### AI統合

- **OpenAI SDK 6.7.0**: ChatGPT (GPT-4o) + DALL·E 3
- **@anthropic-ai/sdk 0.68.0**: Claude (Claude 3.5 Sonnet)
- **@google/generative-ai 0.24.1**: Gemini (Gemini 2.5 Flash/Pro)
- **axios 1.13.1**: Grok API統合

### その他

- **html2canvas 1.4.1**: フロントエンド画像エクスポート
- **jspdf 3.0.3**: PDF生成
- **exceljs 4.4.0**: Excelエクスポート
- **dotenv 17.2.3**: 環境変数管理

### データベース

- **MySQL**: リレーショナルデータベース
- **Prisma Client**: 型安全なデータベースアクセス

---

## データベーススキーマ

### 主要モデル

#### ClinicProduct（商品管理）

```prisma
model ClinicProduct {
  id           Int      @id @default(autoincrement())
  userId       Int
  name         String   @db.VarChar(255)
  category     String?  @db.VarChar(100)
  costPrice    Int
  sellingPrice Int
  description  String?  @db.Text
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

#### MarketResearchResult（市場調査結果）

```prisma
model MarketResearchResult {
  id            Int          @id @default(autoincrement())
  userId        Int
  location      String       @db.VarChar(100)
  researchType  ResearchType // trend_analysis | competitor_analysis | price_research
  aiAgent       AiAgent     // gemini | grok | claude | chatgpt
  rawData       String       @db.Text
  processedData String?      @db.Text // <CONSENSUS_JSON> + <REPORT_MARKDOWN>
  createdAt     DateTime     @default(now())
}
```

#### SNSResearchResult（SNS調査結果）

```prisma
model SNSResearchResult {
  id        Int         @id @default(autoincrement())
  userId    Int
  platform  SNSPlatform // twitter | instagram | youtube
  keywords  String      @db.Text
  aiAgent   AiAgent
  trendData String      @db.Text // <CONSENSUS_JSON> + <REPORT_MARKDOWN>
  createdAt DateTime    @default(now())
}
```

#### StrategyRecommendation（戦略提案）

```prisma
model StrategyRecommendation {
  id                      Int                  @id @default(autoincrement())
  userId                  Int
  analysisDate            DateTime             @default(now())
  priceRecommendations    String?              @db.Text
  campaignProposals       String?              @db.Text
  newTreatmentSuggestions String?              @db.Text
  marketingStrategy       String?              @db.Text
  userFeedback            String?              @db.Text
  implementationStatus    ImplementationStatus @default(pending)
  createdAt               DateTime             @default(now())
  updatedAt               DateTime             @updatedAt
}
```

#### GeneratedContent（生成コンテンツ）

```prisma
model GeneratedContent {
  id                   Int           @id @default(autoincrement())
  userId               Int
  strategyId           Int           @default(0)
  contentType          ContentType   // instagram | blog | lp | instagram_lp | website_article | campaign_copy
  title                String        @db.VarChar(255)
  content              String        @db.Text
  bodyMarkdown         String?       @db.Text
  rawJson              Json?         // 構造化JSONデータ
  metadata             String?       @db.Text
  brandTone            String?       @db.VarChar(100)
  targetAudience       String?       @db.VarChar(255)
  relatedTreatmentIds  String?       @db.Text // JSON配列
  snsResearchIds       String?       @db.Text // JSON配列
  aiAgent              AiAgent
  status               ContentStatus @default(draft)
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt
  images               ContentImage[]
}
```

#### ContentImage（コンテンツ画像）

```prisma
model ContentImage {
  id         Int            @id @default(autoincrement())
  content    GeneratedContent @relation(fields: [contentId], references: [id], onDelete: Cascade)
  contentId  Int
  url        String         @db.VarChar(500)
  width      Int
  height     Int
  preset     String         @db.VarChar(50) // instagram_square | lp_banner | custom
  theme      String         @db.VarChar(100)
  createdAt  DateTime       @default(now())
}
```

#### PromptTemplate（プロンプトテンプレート）

```prisma
model PromptTemplate {
  id          Int       @id @default(autoincrement())
  promptType  PromptType @unique
  aiAgent     AiAgent
  name        String    @db.VarChar(255)
  description String?   @db.Text
  prompt       String    @db.Text
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

#### UserSettings（ユーザー設定）

```prisma
model UserSettings {
  id                  Int      @id @default(autoincrement())
  userId              Int      @unique
  strategyAIProvider  String   @default("chatgpt") @db.VarChar(20) // claude | chatgpt
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
}
```

### Enum定義

```prisma
enum ResearchType {
  trend_analysis
  competitor_analysis
  price_research
}

enum AiAgent {
  gemini
  grok
  claude
  chatgpt
}

enum SNSPlatform {
  twitter
  instagram
  youtube
}

enum ContentType {
  instagram_lp
  website_article
  campaign_copy
  instagram
  blog
  lp
}

enum ContentStatus {
  draft
  approved
  published
}

enum ImplementationStatus {
  pending
  in_progress
  completed
}

enum PromptType {
  // Claude
  claude_analyze_market_position
  claude_generate_price_recommendations
  claude_generate_campaign_proposals
  claude_suggest_new_treatments
  // Gemini
  gemini_research_trend_analysis
  gemini_research_price_comparison
  gemini_analyze_instagram_trends
  gemini_analyze_youtube_trends
  gemini_research_competitor_analysis
  // Grok
  grok_analyze_twitter_trends
  // ChatGPT
  chatgpt_system_prompt
  chatgpt_generate_instagram_lp
  chatgpt_generate_website_article
  chatgpt_generate_campaign_copy
}
```

---

## 主要機能の詳細

### 1. 商品管理 (`/`)

**機能概要**
- クリニックの施術・商品情報の管理
- 価格設定、説明文の編集
- 商品の追加・削除・更新
- 商品の有効/無効切り替え

**データモデル**
- `ClinicProduct`: 商品情報を管理
- 原価・販売価格・カテゴリ・説明文を保存

**API**
- `product.list`: 商品一覧取得
- `product.create`: 商品作成
- `product.update`: 商品更新
- `product.delete`: 商品削除

---

### 2. 市場調査 (`/market-research`)

**機能概要**
美容施術の市場トレンド、価格相場、競合情報を調査・分析します。

#### 2.1 トレンド分析

**パラメータ**
- `location`（必須）: 調査地域（例: "東京"、"大阪"）
- `period`（オプション）: 調査期間（デフォルト: "last 90 days"）

**処理フロー**
1. Gemini APIを呼び出し、最新のトレンド情報を取得
2. Web検索を実行して最新情報を補完
3. 構造化データ（`<CONSENSUS_JSON>`）とレポート（`<REPORT_MARKDOWN>`）を生成
4. データベースに保存

**出力形式**
- **CONSENSUS_JSON**: 機械処理用の構造化データ
  - `treatments[]`: 施術情報（人気度、価格、根拠URL）
  - `customerNeeds[]`: 顧客ニーズ
  - `sources[]`: 情報源
- **REPORT_MARKDOWN**: 人間可読のレポート

**AIエージェント**: Gemini

#### 2.2 価格調査

**パラメータ**
- `treatments`（必須）: 調査対象の施術リスト（例: ["ダーマペン", "ボトックス", "ヒアルロン酸"]）
- `cities`（必須）: 調査対象の都市リスト（例: ["東京", "大阪", "福岡"]）
- `period`（オプション）: 調査期間（デフォルト: "last 90 days"）

**処理フロー**
1. 各都市×各施術の価格を収集
2. 標準化単位で正規化（例: ボトックス=per_unit_10U、HA=per_ml_1）
3. 統計情報（中央値、p25、p75、サンプル数）を算出
4. 構造化データとレポートを生成
5. データベースに保存

**出力形式**
- **CONSENSUS_JSON**:
  - `price_table[]`: 都市別×施術別の価格統計
  - `methodology`: 正規化ルール、外れ値処理方針
- **REPORT_MARKDOWN**: 価格比較レポート

**AIエージェント**: Gemini

#### 2.3 競合調査

**パラメータ**
- `location`（必須）: 中心地（例: "渋谷駅"、"大阪市北区"）
- `radius`（オプション）: 調査半径（デフォルト: 5km）

**処理フロー**
1. Google Maps APIで周辺の競合クリニックを抽出
2. 各クリニックの施術カタログ・価格・特徴を収集
3. 正規化単位で価格を統一
4. 差別化要因を分析
5. 構造化データとレポートを生成
6. データベースに保存

**出力形式**
- **CONSENSUS_JSON**:
  - `competitors[]`: 競合クリニック情報（プロフィール、カタログ、価格、特徴）
  - `area_summary`: エリア全体の相場統計
- **REPORT_MARKDOWN**: 競合分析レポート

**AIエージェント**: Gemini

---

### 3. SNS調査 (`/sns-research`)

**機能概要**
Twitter/X、Instagram、YouTubeのトレンドを分析し、集患・ブランド運用に活用します。

#### 3.1 Twitter/X調査

**パラメータ**
- `keywords`（必須）: 調査キーワード（例: ["ダーマペン", "ピコレーザー"]）
- `timeRange`（オプション）: 期間（デフォルト: "last_month"）
- `location`（オプション）: 地域（デフォルト: "unknown"）

**処理フロー**
1. Grok APIを呼び出し、X上のトレンドを分析
2. ハッシュタグ、影響力アカウント、エンゲージメント傾向を抽出
3. 構造化データとレポートを生成
4. データベースに保存

**出力形式**
- **CONSENSUS_JSON**:
  - `hashtags[]`: 人気ハッシュタグ（使用量、増加率、ER、リスクフラグ）
  - `influencers[]`: 影響力アカウント（フォロワー、ER、投稿頻度）
  - `top_posts[]`: 人気投稿（エンゲージメント、リスクフラグ）
  - `content_stats`: 投稿タイプ別の統計
  - `engagement_trends`: エンゲージメント傾向
- **REPORT_MARKDOWN**: SNSトレンドレポート

**AIエージェント**: Grok

#### 3.2 Instagram調査

**パラメータ**
- `keywords`（必須）: 調査キーワード
- `timeRange`（オプション）: 期間（デフォルト: "last_month"）
- `location`（オプション）: 地域（デフォルト: "unknown"）

**処理フロー**
1. Gemini APIを呼び出し、Instagramのトレンドを分析
2. ハッシュタグ、インフルエンサー、投稿タイプ、ビジュアルトレンドを抽出
3. 構造化データとレポートを生成
4. データベースに保存

**出力形式**
- **CONSENSUS_JSON**:
  - `hashtags[]`: ハッシュタグ情報
  - `influencers[]`: インフルエンサー情報
  - `content_type_stats`: 投稿タイプ別統計（リール/カルーセル/写真）
  - `visual_trends`: ビジュアルトレンド
  - `audience_signals`: ユーザー動向
- **REPORT_MARKDOWN**: Instagramトレンドレポート

**AIエージェント**: Gemini

#### 3.3 YouTube調査

**パラメータ**
- `keywords`（必須）: 調査キーワード
- `timeRange`（オプション）: 期間（デフォルト: "last_month"）
- `location`（オプション）: 地域（デフォルト: "unknown"）

**処理フロー**
1. Gemini APIを呼び出し、YouTubeのトレンドを分析
2. 動画タイトル/キーワード、チャンネル、フォーマット（Shorts/長尺）、エンゲージメントを抽出
3. 構造化データとレポートを生成
4. データベースに保存

**出力形式**
- **CONSENSUS_JSON**:
  - `trending_keywords[]`: トレンドキーワード
  - `top_videos[]`: 人気動画情報
  - `top_creators[]`: 影響力チャンネル
  - `format_stats`: フォーマット別統計
  - `length_trends`: 動画の長さトレンド
- **REPORT_MARKDOWN**: YouTubeトレンドレポート

**AIエージェント**: Gemini

---

### 4. 戦略分析 (`/strategy-analysis`)

**機能概要**
市場データとSNSデータを統合し、総合的な戦略提案を行います。

#### 4.1 総合分析

**パラメータ**
- `location`（必須）: 所在地
- `productIds`（オプション）: 分析対象の商品IDリスト
- `includeMarketData`（オプション）: 市場データを含めるか（デフォルト: true）
- `includeSNSData`（オプション）: SNSデータを含めるか（デフォルト: true）

**処理フロー**
1. 商品データを取得
2. 市場調査結果を取得（トレンド分析、価格調査、競合分析）
3. SNS調査結果を取得（Twitter、Instagram、YouTube）
4. 各AIの分析結果から`<CONSENSUS_JSON>`を抽出
5. 構造化データを統合してClaude/ChatGPTに渡す
6. 総合的な戦略提案を生成
7. データベースに保存

**出力内容**
- SWOT分析
- 市場ポジション分析
- 競合地図
- 価格調整の提案
- キャンペーン案
- 新施術提案
- マーケティング戦略（GOST+タイムライン）
- 7日間の実行チェックリスト
- 30/60/90日ロードマップ

**AIエージェント**: Claude/ChatGPT（統合AI）、Gemini/Grok（データ提供）

**AI選択機能**
- 戦略分析ページのヘッダーで、ClaudeまたはChatGPTを選択可能
- 選択したAIプロバイダーはユーザー設定として保存され、次回以降も使用されます
- 環境変数`STRATEGY_AI_PROVIDER`でデフォルトプロバイダーを設定可能（`claude`または`chatgpt`）

**レイアウト**
- 各機能（総合分析、価格設定提案、キャンペーン案生成、新施術導入提案）は独立したカードレイアウトで表示
- 各機能の履歴は「提案履歴」セクションで一括確認可能

#### 4.2 価格設定提案

**パラメータ**
- `userId`（必須）: ユーザーID

**処理フロー**
1. 自院商品データを取得
2. 市場価格データを取得
3. 選択されたAIプロバイダー（Claude/ChatGPT）に価格提案を依頼
4. 粗利下限を守りつつ相場と需給に整合した推奨価格を算出
5. 心理価格を考慮（端数ルール：¥x,800 / ¥x,980 / ¥x,500）
6. 優先度付き（高/中/低）で提示
7. データベースに保存（`StrategyRecommendation.priceRecommendations`）

**AIエージェント**: Claude（Sonnet 4.5）またはChatGPT（選択可能）

#### 4.3 キャンペーン案生成

**パラメータ**
- `userId`（必須）: ユーザーID

**処理フロー**
1. 市場トレンドデータとSNSデータを取得
2. 選択されたAIプロバイダー（Claude/ChatGPT）にキャンペーン案を依頼
3. 最少2件以上のキャンペーン案を優先度順に提示
4. 実行容易性×効果の高い順に並べ替え
5. データベースに保存（`StrategyRecommendation.campaignProposals`）

**AIエージェント**: Claude（Sonnet 4.5）またはChatGPT（選択可能）

#### 4.4 新施術導入提案

**パラメータ**
- `userId`（必須）: ユーザーID

**処理フロー**
1. 商品データ、市場トレンドデータ、SNSトレンドデータを取得
2. 選択されたAIプロバイダー（Claude/ChatGPT）に新施術提案を依頼
3. 既存施術を除外し、未導入の有望施術のみを提案
4. 投資対効果（Payback試算）を含む
5. データベースに保存（`StrategyRecommendation.newTreatmentSuggestions`）

**AIエージェント**: Claude（Opus 4.1）またはChatGPT（選択可能）

**注意**: ChatGPTを使用する場合、Claude形式のプロンプトが自動的にChatGPT形式に変換されます。

---

### 5. 戦略管理 (`/strategy-management`)

**機能概要**
- 戦略提案の履歴管理
- フィードバックの記録
- 実装ステータスの管理（pending / in_progress / completed）
- 戦略書のエクスポート（JSON、テキスト、PDF、Excel形式）

**API**
- `strategy.list`: 戦略提案履歴取得
- `strategy.update`: 実装ステータス更新
- `strategy.export`: エクスポート

---

### 6. コンテンツ生成 (`/content` / `/content/generator`)

**機能概要**
Instagram投稿、ブログ記事、LPテキストを自動生成し、画像も同時に生成します。

#### 6.1 既存機能（`/content`）

- Instagram用LP案の生成
- SEO最適化されたHP記事の生成
- キャンペーンコピーの生成
- プレビュー機能と画像エクスポート機能

#### 6.2 新機能（`/content/generator`）

##### Instagram投稿生成

**入力パラメータ**
- `campaignTitle`（必須）: キャンペーン名
- `campaignDescription`（必須）: キャンペーン説明
- `targetAudience`（オプション）: ターゲット層
- `tone`（デフォルト: "上品で誠実"）: ブランドトーン
- `relatedTreatmentIds`（オプション）: 関連施術ID配列
- `snsResearchIds`（オプション）: SNS調査結果ID配列
- `hashtagsPreference`（オプション）: ハッシュタグ設定
- `callToActionType`（デフォルト: "予約"）: CTAタイプ
- `imagePreset`（デフォルト: "instagram_square"）: 画像プリセット
- `imageTheme`（デフォルト: "before_after"）: 画像テーマ
- `generateImage`（デフォルト: true）: 画像生成フラグ

**出力形式**
- **構造化JSON** (`InstagramContentJson`):
  ```typescript
  {
    caption: string;
    hook: string;
    body: string;
    caution: string;
    callToAction: string;
    hashtags: string[];
  }
  ```
- **Markdown**: 整形されたテキスト
- **画像**: Instagram正方形（1080x1080）

**AIエージェント**: ChatGPT（テキスト）、DALL·E 3（画像）

##### ブログ記事生成

**入力パラメータ**
- `campaignTitle`（必須）: キャンペーン名
- `campaignDescription`（必須）: キャンペーン説明
- `targetAudience`（オプション）: ターゲット層
- `tone`（デフォルト: "上品で誠実"）: ブランドトーン
- `relatedTreatmentIds`（オプション）: 関連施術ID配列
- `snsResearchIds`（オプション）: SNS調査結果ID配列
- `seoKeywords`（デフォルト: []）: SEOキーワード配列
- `desiredLength`（デフォルト: "medium"）: 記事の長さ（short/medium/long）
- `imagePreset`（デフォルト: "lp_banner"）: 画像プリセット
- `imageTheme`（デフォルト: "clinic_interior"）: 画像テーマ
- `generateImage`（デフォルト: true）: 画像生成フラグ

**出力形式**
- **構造化JSON** (`BlogArticleJson`):
  ```typescript
  {
    title: string;
    outline: { heading: string; content: string }[];
    faq: { question: string; answer: string }[];
    seoKeywords: string[];
  }
  ```
- **Markdown**: SEO最適化された記事本文
- **画像**: LPバナー（1200x630）

**AIエージェント**: ChatGPT（テキスト）、DALL·E 3（画像）

##### LPテキスト生成

**入力パラメータ**
- `campaignTitle`（必須）: キャンペーン名
- `campaignDescription`（必須）: キャンペーン説明
- `targetAudience`（オプション）: ターゲット層
- `tone`（デフォルト: "上品で誠実"）: ブランドトーン
- `relatedTreatmentIds`（オプション）: 関連施術ID配列
- `snsResearchIds`（オプション）: SNS調査結果ID配列
- `primaryGoal`（デフォルト: "新規予約"）: 主な目的（新規予約/LINE登録/キャンペーン認知）
- `priceInfo`（オプション）: 価格情報
- `imagePreset`（デフォルト: "lp_banner"）: 画像プリセット
- `imageTheme`（デフォルト: "clinic_interior"）: 画像テーマ
- `generateImage`（デフォルト: true）: 画像生成フラグ

**出力形式**
- **構造化JSON** (`LpContentJson`):
  ```typescript
  {
    hero: {
      catchCopy: string;
      subCopy: string;
      primaryCta: string;
    };
    sections: {
      id: string;
      title: string;
      bodyMarkdown: string;
    }[];
    priceSection?: {
      normalPrice?: string;
      campaignPrice?: string;
      notes?: string;
    };
  }
  ```
- **Markdown**: LPセクション構成
- **画像**: LPバナー（1200x630）

**AIエージェント**: ChatGPT（テキスト）、DALL·E 3（画像）

#### 6.3 画像生成機能

**画像プリセット**
- `instagram_square`: 1080x1080（Instagram正方形）
- `lp_banner`: 1200x630（LPバナー、16:9）
- `custom`: カスタムサイズ（256x256〜2048x2048）

**画像テーマ**
- `before_after`: ビフォーアフター比較
- `season_event`: 季節・イベント
- `clinic_interior`: クリニック内装
- `texture_skin`: 肌の質感

**画像生成プロバイダー**
- DALL·E 3（デフォルト）
- 将来的にStable Diffusion等への切り替えも可能

**API**
- `content.generateInstagramLP`: Instagram用LP案の生成
- `content.generateWebsiteArticle`: HP記事の生成
- `content.generateCampaignCopy`: キャンペーンコピーの生成
- `content.list`: 生成コンテンツ一覧取得
- `content.getById`: コンテンツ詳細取得
- `content.updateStatus`: コンテンツステータス更新
- `content.getCurrentModel`: 現在使用中のAIモデル情報取得

---

### 7. ワークフロー管理 (`/workflow`)

**機能概要**
- AIエージェント間の協調動作管理
- 統合分析ワークフローの実行
- AIエージェントのヘルスチェック
- ワークフロー実行履歴の確認

**API**
- `workflow.execute`: ワークフロー実行
- `workflow.list`: 実行履歴取得
- `workflow.healthCheck`: AIエージェントのヘルスチェック

---

### 8. APIキー設定 (`/api-key`)

**機能概要**
- Gemini、Grok、Claude、OpenAIのAPIキー設定
- Web検索APIキー設定（SerpAPIまたはGoogle Custom Search API）
- APIキーの設定状態確認
- API接続確認機能

**環境変数**
- `GEMINI_API_KEY`: Gemini APIキー
- `GROK_API_KEY`: Grok APIキー
- `CLAUDE_API_KEY`: Claude APIキー
- `OPENAI_API_KEY`: OpenAI APIキー
- `SERP_API_KEY`: SerpAPIキー（オプション）
- `GOOGLE_CUSTOM_SEARCH_API_KEY`: Google Custom Search APIキー（オプション）
- `GOOGLE_CUSTOM_SEARCH_ENGINE_ID`: Google Custom Search エンジンID（オプション）

---

### 9. プロンプト管理 (`/prompt`)

**機能概要**
- 各AIエージェント用のプロンプトテンプレート管理
- プロンプトの編集・有効/無効切り替え
- デフォルトプロンプトのフォールバック機能

**API**
- `prompt.list`: プロンプト一覧取得
- `prompt.get`: プロンプト取得
- `prompt.create`: プロンプト作成
- `prompt.update`: プロンプト更新

---

## AIエージェントの役割分担

### Gemini（Google）

**担当分野**
- 市場調査（トレンド分析、価格調査、競合分析）
- SNS調査（Instagram、YouTube）

**使用モデル**（最新版を優先）
- Gemini 2.5 Pro（最新・高性能版・2025年5月リリース・デフォルト）
- Gemini 2.5 Flash（最新・高速版・2025年5月リリース）
- 旧プレビュー版（フォールバック用）

**出力形式**
- `<CONSENSUS_JSON>`: 構造化データ（機械処理用）
- `<REPORT_MARKDOWN>`: 人間可読レポート
- **出力の冒頭に使用モデル情報を自動記載**: `【使用AIモデル: Gemini {モデル名}】`

**特徴**
- Web検索統合による最新情報の取得
- 構造化データの生成に優れる
- 市場データの収集・分析に特化

---

### Grok（xAI）

**担当分野**
- SNS調査（X/Twitter）

**使用モデル**（最新版を優先）
- Grok-4（最新・API経由で利用可能・確認済み・デフォルト）
- Grok-3（2025年リリース・安定版）

**出力形式**
- `<CONSENSUS_JSON>`: 構造化データ（機械処理用）
- `<REPORT_MARKDOWN>`: 人間可読レポート
- **出力の冒頭に使用モデル情報を自動記載**: `【使用AIモデル: Grok {モデル名}】`

**特徴**
- X/Twitterのリアルタイムトレンド分析に特化
- ハッシュタグ、影響力アカウント、エンゲージメント傾向の抽出

---

### Claude（Anthropic）

**担当分野**
- 戦略統合分析（市場データ + SNSデータの統合）
- 価格設定提案
- キャンペーン案生成
- 新施術導入提案

**AI選択機能**
- 戦略分析では、ClaudeまたはChatGPTを選択可能
- デフォルトは環境変数`STRATEGY_AI_PROVIDER`で設定可能（`claude`または`chatgpt`）

**使用モデル**（用途別に最適化）
- **総合分析・新規導入提案**: Claude Opus 4.1（最新・2025年8月リリース・最高性能・確認済み・優先使用）
- **価格設定提案・キャンペーン案**: Claude Sonnet 4.5 20250929（2025年9月リリース・高性能・確認済み・優先使用）
- フォールバック候補:
  - Claude 3.5 Sonnet 20241022（2024年10月リリース・高性能）
  - Claude 3.5 Haiku 20241022（2024年10月リリース・高速・低コスト・確認済み）
  - Claude 3.5 Sonnet（互換性重視）
  - Claude 3.5 Haiku（互換性重視）
  - Claude 3 Opus 20240229（高性能版・非推奨・2026年1月5日終了予定・確認済み）
  - Claude 3 Sonnet（標準版）
  - Claude 3 Haiku（旧版・高速・低コスト）

**出力形式**
- Markdown形式の戦略提案
- 構造化された推奨事項（表形式）
- **出力の冒頭に使用モデル情報を自動記載**: `【使用AIモデル: Claude {モデル名}】`

**特徴**
- 複数のAI分析結果を統合して総合的な戦略を提案
- 小規模クリニック向けの実現可能な計画を作成
- 医療広告ガイドラインに配慮した表現
- 用途別に最適なモデルを自動選択（総合分析はOpus 4.1、価格・キャンペーン案はSonnet 4.5）

---

### ChatGPT（OpenAI）

**担当分野**
- コンテンツ生成（Instagram投稿、ブログ記事、LPテキスト）
- 戦略統合分析（Claudeの代替として使用可能）
  - 総合分析
  - 価格設定提案
  - キャンペーン案生成
  - 新施術導入提案
- 画像生成（DALL·E 3）

**戦略分析での使用**
- Claude形式のプロンプトを自動的にChatGPT形式に変換
- Claudeと同様の機能を提供（総合分析、価格設定提案、キャンペーン案生成、新施術導入提案）

**使用モデル**（最新版を優先）
- GPT-5.1（最新・2025年11月リリース・API経由で利用可能・確認済み）
- GPT-5（最新・API経由で利用可能・確認済み）
- GPT-4o（2024年5月リリース・安定版）
- GPT-4o-mini（軽量版）
- DALL·E 3（画像生成）

**出力形式**
- 構造化JSON + Markdown
- 画像URL（DALL·E 3）
- **出力の冒頭に使用モデル情報を自動記載**: `【使用AIモデル: ChatGPT {モデル名}】`

**特徴**
- コンテンツ生成に特化
- Web検索統合による最新トレンドの反映
- 画像生成機能（DALL·E 3）

---

## 各AIのプロンプト詳細

### Geminiプロンプト

#### トレンド分析プロンプト (`gemini_research_trend_analysis`)

**構造**
- `<SYS>`: システムプロンプト（役割定義、ルール）
- `<DEV>`: 開発者向け指示（目的、出力フォーマット）
- `<USER>`: ユーザー入力（調査地域、期間）

**主要ルール**
- 2部構成（`<CONSENSUS_JSON>` + `<REPORT_MARKDOWN>`）
- 根拠URLと取得日時の必須記載
- 誇大・断定表現の禁止
- 医療広告ガイドライン配慮

**出力スキーマ（CONSENSUS_JSON）**
```json
{
  "meta": {
    "location": "string",
    "period": "string",
    "currency": "JPY",
    "generatedAt": "ISO8601"
  },
  "methodology": {
    "popularityWeights": { "search": 0.4, "sns": 0.35, "reviews": 0.25 },
    "queries": ["string"],
    "notes": "string"
  },
  "treatments": [
    {
      "name": "string",
      "aliases": ["string"],
      "popularity": {
        "score": 0-100,
        "basis": { "search": number, "sns": number, "reviews": number }
      },
      "price": {
        "median": number,
        "p25": number,
        "p75": number,
        "n": number,
        "tax": "incl"|"excl"
      },
      "summary": "string",
      "emerging": boolean,
      "evidence": [
        { "url": "string", "snippet": "string", "fetchedAt": "ISO8601", "low_confidence": boolean }
      ]
    }
  ],
  "customerNeeds": [
    { "theme": "string", "signals": ["string"] }
  ],
  "sources": [{ "domain": "string", "count": number }],
  "gaps": ["string"]
}
```

#### 価格調査プロンプト (`gemini_research_price_comparison`)

**主要ルール**
- 標準化単位での価格正規化
- 統計情報（中央値、p25、p75、サンプル数）を含む
- 根拠URLと取得日時の必須記載

**出力スキーマ（CONSENSUS_JSON）**
```json
{
  "meta": {
    "cities": ["string"],
    "treatments": ["string"],
    "period": "string",
    "currency": "JPY",
    "generatedAt": "ISO8601"
  },
  "methodology": {
    "normalization_rules": {
      "botulinum": "per_area_forehead を優先",
      "ha_filler": "per_ml_1",
      "laser_hifu": "per_session_1"
    },
    "outlier_policy": "Winsorize p10–p90",
    "tax_policy": "incl/excl を保持"
  },
  "price_table": [
    {
      "city": "string",
      "treatment": "string",
      "normalized_unit": "string",
      "stats": {
        "median": number,
        "p25": number,
        "p75": number,
        "mean": number,
        "n": number
      },
      "band_text": "string",
      "samples": [
        {
          "clinic": "string",
          "url": "string",
          "listed_price": number,
          "listed_unit": "string",
          "tax": "incl"|"excl",
          "fetchedAt": "ISO8601",
          "low_confidence": boolean
        }
      ]
    }
  ],
  "sources": [{ "domain": "string", "count": number }],
  "gaps": ["string"]
}
```

#### Instagram調査プロンプト (`gemini_analyze_instagram_trends`)

**出力スキーマ（CONSENSUS_JSON）**
```json
{
  "meta": {
    "keywords": ["string"],
    "timeRange": "string",
    "location": "string",
    "generatedAt": "ISO8601"
  },
  "hashtags": [
    {
      "tag": "string",
      "volume_est": number,
      "growth_rate_pct": number,
      "median_er_pct": number,
      "co_tags": ["string"],
      "risk_flags": ["ad_like", "before_after", "medical_claims"],
      "evidence": [{ "url": "string", "caption_snippet": "string", "fetchedAt": "ISO8601" }]
    }
  ],
  "influencers": [
    {
      "handle": "@string",
      "display_name": "string",
      "category": "clinic|doctor|influencer|device_brand|media",
      "followers": number,
      "median_er_pct": number,
      "post_freq_per_week": number,
      "top_content_types": ["reel", "carousel"],
      "representative_posts": [{ "url": "string", "content_type": "string", "fetchedAt": "ISO8601" }]
    }
  ],
  "content_type_stats": {
    "distribution_pct": { "reel": number, "carousel": number, "photo": number },
    "median_er_pct_by_type": { "reel": number, "carousel": number, "photo": number },
    "recommended_type": "reel|carousel|photo"
  },
  "engagement_trends": {
    "best_posting_hours_local": ["HH:00-HH:00"],
    "best_weekdays": ["Mon", "Tue", ...],
    "caption_length_chars_median": number,
    "cta_patterns": ["string"]
  },
  "visual_trends": {
    "palette_keywords": ["string"],
    "layout_styles": ["string"],
    "motion_notes": "string"
  },
  "audience_signals": [
    { "theme": "string", "example_comments": ["string"] }
  ]
}
```

#### YouTube調査プロンプト (`gemini_analyze_youtube_trends`)

**出力スキーマ（CONSENSUS_JSON）**
```json
{
  "meta": {
    "keywords": ["string"],
    "timeRange": "string",
    "location": "string",
    "generatedAt": "ISO8601"
  },
  "trending_keywords": [
    {
      "term": "string",
      "type": "keyword|hashtag|question",
      "volume_est": number,
      "growth_rate_pct": number,
      "co_terms": ["string"]
    }
  ],
  "top_videos": [
    {
      "title": "string",
      "url": "string",
      "channel_title": "string",
      "channel_url": "string",
      "subscribers": number,
      "publishAt": "ISO8601",
      "duration_sec": number,
      "isShort": boolean,
      "views": number,
      "likes": number,
      "comments": number,
      "view_velocity_per_day": number,
      "engagement_rate_pct": number,
      "keywords_extracted": ["string"],
      "outline_detected": ["string"],
      "thumbnail_features": {
        "has_text_overlay": boolean,
        "face_closeup": boolean,
        "clinical_image_flag": boolean,
        "before_after_flag": boolean
      },
      "risk_flags": ["medical_claims", "before_after", "giveaway", "clickbait"]
    }
  ],
  "top_creators": [
    {
      "channel_title": "string",
      "channel_url": "string",
      "category": "clinic|doctor|influencer|device_brand|media",
      "subscribers": number,
      "median_views_30d": number,
      "post_freq_per_week": number,
      "format_mix_pct": { "short": number, "long": number },
      "representative_videos": [{ "url": "string", "isShort": boolean }]
    }
  ],
  "format_stats": {
    "distribution_pct": { "short": number, "long": number },
    "median_views_by_format": { "short": number, "long": number },
    "median_er_pct_by_format": { "short": number, "long": number },
    "recommended_format": "short|long"
  },
  "length_trends": {
    "median_length_sec_by_format": { "short": number, "long": number },
    "performance_by_length_bins": [
      { "bin": "<60s", "median_views": number, "median_er_pct": number },
      { "bin": "1-3m", "median_views": number, "median_er_pct": number },
      ...
    ],
    "recommended_length_sec": number
  },
  "engagement_trends": {
    "title_patterns": ["string"],
    "cta_patterns": ["string"],
    "best_posting_hours_local": ["HH:00-HH:00"],
    "best_weekdays": ["Mon", "Tue", ...]
  },
  "audience_signals": [
    { "theme": "string", "example_comments": ["string"] }
  ]
}
```

#### 競合調査プロンプト (`gemini_research_competitor_analysis`)

**出力スキーマ（CONSENSUS_JSON）**
```json
{
  "meta": {
    "center_location": "string",
    "radius_km": number,
    "generatedAt": "ISO8601",
    "currency": "JPY"
  },
  "competitors": [
    {
      "profile": {
        "name": "string",
        "branch_name": "string|null",
        "group_id": "string|null",
        "address": "string",
        "lat": number,
        "lng": number,
        "distance_km": number,
        "gmaps_url": "string",
        "official_url": "string",
        "phone": "string|null",
        "hours_note": "string|null"
      },
      "catalog": [
        {
          "treatment": "string",
          "normalized_unit": "string",
          "brand_or_device": "string|null",
          "stats": {
            "median": number,
            "p25": number,
            "p75": number,
            "mean": number,
            "n": number
          },
          "samples": [
            {
              "listed_price": number,
              "listed_unit": "string",
              "tax": "incl"|"excl",
              "url": "string",
              "fetchedAt": "ISO8601",
              "low_confidence": boolean
            }
          ],
          "notes": "string|null"
        }
      ],
      "features": {
        "specialties": ["string"],
        "devices": ["string"],
        "languages": ["ja", "en", ...],
        "payment": ["cashless", "installment", ...],
        "booking": ["web", "line", "phone"],
        "night_holiday_service": boolean,
        "first_visit_flow": "string|null"
      },
      "differentiators": ["string"],
      "evidence": [{ "url": "string", "snippet": "string", "fetchedAt": "ISO8601" }]
    }
  ],
  "area_summary": {
    "coverage": {
      "discovered_total": number,
      "deduped_total": number
    },
    "common_catalog": [
      {
        "treatment": "string",
        "normalized_unit": "string",
        "area_stats": {
          "median": number,
          "p25": number,
          "p75": number,
          "n": number
        }
      }
    ],
    "notable_gaps": ["string"]
  },
  "sources": [{ "domain_or_profile": "string", "count": number }]
}
```

---

### Grokプロンプト

#### Twitter/X調査プロンプト (`grok_analyze_twitter_trends`)

**出力スキーマ（CONSENSUS_JSON）**
```json
{
  "meta": {
    "keywords": ["string"],
    "timeRange": "string",
    "location": "string",
    "generatedAt": "ISO8601"
  },
  "hashtags": [
    {
      "tag": "string",
      "volume_est": number,
      "growth_rate_pct": number,
      "median_er_per_views_pct": number,
      "co_tags": ["string"],
      "risk_flags": ["before_after", "medical_claims", "giveaway", "affiliate"],
      "evidence": [{ "url": "string", "text_snippet": "string", "fetchedAt": "ISO8601" }]
    }
  ],
  "influencers": [
    {
      "handle": "@string",
      "display_name": "string",
      "category": "clinic|doctor|influencer|device_brand|media",
      "verified": boolean,
      "followers": number,
      "median_er_per_followers_pct": number,
      "post_freq_per_week": number,
      "top_post_types": ["video", "image"],
      "representative_posts": [{ "url": "string", "post_type": "string", "fetchedAt": "ISO8601" }]
    }
  ],
  "top_posts": [
    {
      "url": "string",
      "author_handle": "@string",
      "author_category": "string",
      "postedAt": "ISO8601",
      "post_type": "text|image|video|link|thread|space|poll",
      "has_before_after_flag": boolean,
      "text_snippet": "string",
      "media_notes": "string|null",
      "likes": number,
      "reposts": number,
      "replies": number,
      "impressions": number,
      "er_per_views_pct": number,
      "risk_flags": ["medical_claims", "before_after", "giveaway", "affiliate", "clickbait"]
    }
  ],
  "content_stats": {
    "distribution_pct_by_type": { "text": number, "image": number, "video": number, ... },
    "median_er_per_views_pct_by_type": { "text": number, "image": number, "video": number, ... },
    "recommended_type": "video|image|text|link|thread"
  },
  "engagement_trends": {
    "best_posting_hours_local": ["HH:00-HH:00"],
    "best_weekdays": ["Mon", "Tue", ...],
    "cta_patterns": ["string"],
    "sentiment_summary": "string"
  },
  "treatments_discussed": [
    {
      "name": "string",
      "context": ["string"],
      "trend_signal": { "volume_est": number, "growth_rate_pct": number },
      "price_mentions": ["string"]
    }
  ],
  "audience_signals": [
    { "theme": "string", "example_posts": ["string"] }
  ]
}
```

---

### Claudeプロンプト

#### 市場ポジション分析プロンプト (`claude_analyze_market_position`)

**構造**
- `<SYS>`: システムプロンプト（役割定義、厳格ルール）
- `<DEV>`: 開発者向け指示（入力、出力フォーマット、思考指針）
- `<USER>`: ユーザー入力（商品情報、市場データ、SNSデータ、所在地）

**主要ルール**
- 複数AIの協業についての説明を追加
- データの優先順位（構造化データ > レポート > 生データ）を明示
- 各AIの役割を明確化（Gemini:市場調査、Grok:SNS調査、Claude/ChatGPT:戦略統合）
- 小規模クリニック向け最適化
- 医療広告ガイドライン配慮

**出力フォーマット**
1. 要約（3行）
2. 市場ポジション分析（SWOT）
3. 価格調整の提案（優先度つき）
4. キャンペーン案（実行容易×即効）
5. 新施術提案（導入しやすい順）
6. マーケティング戦略（GOST+タイムライン）
7. 分析総括（重要メッセージ3つ）
8. 付録A. 前提・データギャップ
9. 付録B. 7日間の実行チェックリスト

#### 価格設定提案プロンプト (`claude_generate_price_recommendations`)

**主要ルール**
- 標準化単位に正規化して比較
- 心理価格を考慮（端数ルール：¥x,800 / ¥x,980 / ¥x,500）
- 粗利下限を守る
- 優先度付き（高/中/低）で提示

**計算規則**
1. 基準価格: areaMedianJPY（なければ (p25+p75)/2）
2. 位置づけ補正（ブランド/デバイス、低侵襲、エントリー）
3. 需給補正（capacityUtilizationPctに基づく）
4. 粗利下限チェック
5. 端数処理
6. 優先度判定

**出力フォーマット**
1. 要約（3行）
2. 推奨価格テーブル（重要商品のみ、最大20行）
3. 個別解説（主要3〜5商品）
4. 価格運用の方針（小規模最適）
5. 価格戦略の総括と全体推奨
6. 前提・データギャップ

#### キャンペーン案生成プロンプト (`claude_generate_campaign_proposals`)

**主要ルール**
- 最少2件以上のキャンペーン案を優先度順に提示
- 実行容易性×効果の高い順に並べ替え
- 根拠（入力データのURL/数値）を明示

**優先度スコア**
```
priority_score = 0.45*Demand + 0.25*Feasibility + 0.20*UnitEconomics + 0.10*ComplianceSafety
```

**出力フォーマット**
1. 要約（3行）
2. キャンペーン提案（優先度順に2件以上）
   - 案A、案B、案C（必要なら）
   - 各案に含まれる項目：
     - キャンペーン説明
     - ターゲット層
     - 実施期間
     - プロモーション内容
     - 実施チャンネル
     - SNS戦略
     - 期待される効果
     - 予算の目安
     - 優先度
     - 根拠
     - リスク要因と緩和策
     - オペレーション
3. クリエイティブ・ブリーフ（共通）
4. KPI・測定・停止基準
5. 実行タイムライン（30日プラン）
6. 総括と推奨実施時期
7. 付録：根拠リンク一覧

#### 新施術導入提案プロンプト (`claude_suggest_new_treatments`)

**主要ルール**
- 既に導入済みの施術は候補から除外
- 価格・コストは標準化単位で比較
- 投資対効果（Payback試算）を含む

**優先度スコア**
```
PriorityScore(0–100) = 0.40*Demand + 0.25*UnitEconomics + 0.20*Feasibility + 0.10*Differentiation + 0.05*ComplianceSafety
```

**出力フォーマット**
1. 要約（3行）
2. 年代別ニーズと人気施術（マトリクス）
3. 未導入候補の全体一覧
4. 新施術提案（上位3–5件、各見出しで詳述）
5. 投資・採算サマリー（上位候補）
6. 実装チェックリスト（7日で着手）
7. 新施術導入戦略の総括と推奨導入タイムライン
8. 付録：前提・データギャップ・参考URL

---

### ChatGPTプロンプト

#### システムプロンプト (`chatgpt_system_prompt`)

```
あなたは美容クリニックのマーケティングコンテンツ作成の専門家です。魅力的で効果的なマーケティング素材を作成してください。
```

#### Instagram LP生成プロンプト (`chatgpt_generate_instagram_lp`)

**入力パラメータ**
- `${campaignTitle}`: キャンペーン名
- `${campaignDescription}`: キャンペーン説明
- `${targetAudience}`: ターゲット層
- `${promotion}`: プロモーション内容
- `${approachText}`: デザインアプローチ（minimal/bold/elegant/trendy）

**出力内容**
- LPのタイトル
- メインヘッドライン
- 説明文（3-4文程度）
- 主要ポイント（3つ程度）
- メリット（2つ程度）
- 行動喚起文
- 推奨ハッシュタグ（3つ程度）
- デザイン要素の詳細な指示
- 推奨カラースキーム
- トーン

#### HP記事生成プロンプト (`chatgpt_generate_website_article`)

**入力パラメータ**
- `${campaignTitle}`: キャンペーン名
- `${campaignDescription}`: キャンペーン説明
- `${targetAudience}`: ターゲット層
- `${keywords}`: SEOキーワード

**出力内容**
- 記事タイトル
- メタディスクリプション（150文字以内）
- 主要キーワード
- 記事本文（HTML形式、800-1200文字程度）
- 記事の要約（2-3文）

**要件**
- 見出しタグ（h1, h2, h3）を適切に使用
- SEOキーワードを自然に含める
- 読みやすく、情報価値の高い内容

#### キャンペーンコピー生成プロンプト (`chatgpt_generate_campaign_copy`)

**入力パラメータ**
- `${campaignTitle}`: キャンペーン名
- `${campaignDescription}`: キャンペーン説明
- `${targetAudience}`: ターゲット層
- `${promotion}`: プロモーション内容
- `${toneText}`: トーン（上品で誠実/カジュアルで親しみやすい等）

**出力内容**
- メインキャッチコピー
- サブキャッチコピー
- 本文（3-4段落）
- 行動喚起文
- キャッチフレーズ
- 主要メッセージ（3つ程度）

#### コンテンツ生成プロンプト（新機能）

**Instagram投稿生成**
- SNS調査結果を統合
- 構造化JSON形式で出力（`InstagramContentJson`）
- 医療広告ガイドライン対応

**ブログ記事生成**
- SEOキーワードを自然に含める
- 構造化JSON形式で出力（`BlogArticleJson`）
- 記事の長さ選択（短い/中程度/長い）

**LPテキスト生成**
- セクション構成を明確化
- 構造化JSON形式で出力（`LpContentJson`）
- 主な目的に応じたCTA設定

---

## API設計

### tRPCルーター構成

#### content.ts（コンテンツ生成）

**既存エンドポイント**
- `generateInstagramLP`: Instagram用LP案生成
- `generateWebsiteArticle`: SEO最適化されたHP記事生成
- `generateCampaignCopy`: キャンペーンコピー生成

**エンドポイント**

##### `generateInstagramLP`

**入力スキーマ**
```typescript
{
  userId: number;
  strategyId?: number;
  campaignTitle: string;
  campaignDescription: string;
  targetAudience?: string;
  promotion?: string;
  designApproach?: "minimal" | "bold" | "elegant" | "trendy"; // デフォルト: "trendy"
  count?: number; // デフォルト: 3, 最大: 5
}
```

**出力**
```typescript
{
  results: Array<{
    id: number;
    approach: string;
    result: string;
  }>;
  message: string;
}
```

##### `generateWebsiteArticle`

**入力スキーマ**
```typescript
{
  userId: number;
  strategyId?: number;
  campaignTitle: string;
  campaignDescription: string;
  targetAudience?: string;
  seoKeywords?: string[];
}
```

**出力**
```typescript
{
  id: number;
  result: string;
  message: string;
}
```

##### `generateCampaignCopy`

**入力スキーマ**
```typescript
{
  userId: number;
  strategyId?: number;
  campaignTitle: string;
  campaignDescription: string;
  targetAudience?: string;
  promotion?: string;
  tone?: "professional" | "friendly" | "trendy"; // デフォルト: "friendly"
}
```

**出力**
```typescript
{
  id: number;
  result: string;
  message: string;
}
```

##### `list`

**入力スキーマ**
```typescript
{
  userId: number;
  contentType?: "instagram_lp" | "website_article" | "campaign_copy";
}
```

**出力**
```typescript
GeneratedContent[]
```

##### `getById`

**入力スキーマ**
```typescript
{
  id: number;
  userId: number;
}
```

**出力**
```typescript
GeneratedContent & {
  metadata: unknown;
}
```

##### `updateStatus`

**入力スキーマ**
```typescript
{
  id: number;
  userId: number;
  status: "draft" | "approved" | "published";
}
```

**出力**
```typescript
GeneratedContent
```

##### `getCurrentModel`

**出力**
```typescript
{
  aiAgent: "chatgpt";
  model: string;
}
```

#### market-research.ts（市場調査）

**エンドポイント**
- `researchTrend`: トレンド分析
- `researchPriceComparison`: 価格調査
- `researchCompetitorAnalysis`: 競合調査
- `listResults`: 調査結果履歴取得

#### sns-research.ts（SNS調査）

**エンドポイント**
- `analyzeTwitterTrends`: Twitter/X調査
- `analyzeInstagramTrends`: Instagram調査
- `analyzeYouTubeTrends`: YouTube調査
- `listResults`: 調査結果履歴取得

#### strategy.ts（戦略分析）

**エンドポイント**
- `analyzeMarketPosition`: 総合分析
- `generatePriceRecommendations`: 価格設定提案
- `generateCampaignProposals`: キャンペーン案生成
- `suggestNewTreatments`: 新施術導入提案
- `list`: 戦略提案履歴取得

#### product.ts（商品管理）

**エンドポイント**
- `list`: 商品一覧取得
- `create`: 商品作成
- `update`: 商品更新
- `delete`: 商品削除

#### prompt.ts（プロンプト管理）

**エンドポイント**
- `list`: プロンプト一覧取得
- `get`: プロンプト取得
- `create`: プロンプト作成
- `update`: プロンプト更新

#### workflow.ts（ワークフロー管理）

**エンドポイント**
- `execute`: ワークフロー実行
- `list`: 実行履歴取得
- `healthCheck`: AIエージェントのヘルスチェック

---

## フロントエンド構成

### ページ構成

#### `/`（商品管理）
- `src/app/page.tsx`: メインページ
- `src/features/products/product-management.tsx`: 商品管理UI

#### `/market-research`（市場調査）
- `src/app/market-research/page.tsx`
- `src/features/market-research/market-research.tsx`

#### `/sns-research`（SNS調査）
- `src/app/sns-research/page.tsx`
- `src/features/sns-research/sns-research.tsx`

#### `/strategy-analysis`（戦略分析）
- `src/app/strategy-analysis/page.tsx`
- `src/features/strategy/strategy-analysis.tsx`

#### `/strategy-management`（戦略管理）
- `src/app/strategy-management/page.tsx`
- `src/features/strategy/strategy-management.tsx`

#### `/content`（コンテンツ生成・既存）
- `src/app/content/page.tsx`
- `src/features/content/content-generation.tsx`

#### `/content/generator`（コンテンツ生成・新機能）
- `src/app/content/generator/page.tsx`
- `src/features/content/content-generator.tsx`

#### `/workflow`（ワークフロー管理）
- `src/app/workflow/page.tsx`
- `src/features/workflow/workflow-management.tsx`

#### `/api-key`（APIキー設定）
- `src/app/api-key/page.tsx`
- `src/features/api-key/api-key-management.tsx`

#### `/prompt`（プロンプト管理）
- `src/app/prompt/page.tsx`
- `src/features/prompt/prompt-management.tsx`

### 共通コンポーネント

#### `src/components/Navigation.tsx`
- 共通ナビゲーションバー
- 現在のページをハイライト表示

#### `src/components/AtlassianProvider.tsx`
- Atlassian Design Systemのプロバイダー

#### `src/components/ErrorBoundary.tsx`
- エラーバウンダリー

### UIライブラリ

**Atlassian Design System**
- Button, TextField, Textarea, Select, Banner, Badge, Tag, Spinner, EmptyState, Checkbox, Table, Form等を使用

---

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/tomiyuta/beautyclinic.git
cd beautyclinic
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env`ファイルを作成し、以下の環境変数を設定：

```env
# データベース
DATABASE_URL="mysql://user:password@localhost:3306/beautyclinic"

# AI APIキー
GEMINI_API_KEY="your_gemini_api_key"
GROK_API_KEY="your_grok_api_key"
CLAUDE_API_KEY="your_claude_api_key"
OPENAI_API_KEY="your_openai_api_key"

# Web検索API（オプション）
SERP_API_KEY="your_serp_api_key"
GOOGLE_CUSTOM_SEARCH_API_KEY="your_google_custom_search_api_key"
GOOGLE_CUSTOM_SEARCH_ENGINE_ID="your_engine_id"

# AIモデル設定（オプション）
# 注意: モデルを指定しない場合、最新版が自動的に優先されます
GEMINI_MODEL="gemini-2.5-pro"                    # 最新: Gemini 2.5 Pro（2025年5月リリース）
CLAUDE_MODEL="claude-opus-4-1"                   # 最新: Claude Opus 4.1（2025年8月リリース・最高性能・確認済み）
OPENAI_MODEL="gpt-5.1"                           # デフォルト: GPT-5.1（2025年11月リリース・API経由で利用可能・確認済み）
                                                  # 注意: GPT-5.1/5.0はmax_completion_tokensパラメータを使用します（自動対応済み）
GROK_MODEL="grok-4"                              # デフォルト: Grok-4（最新・API経由で利用可能・確認済み）
                                                  # 注意: grok-4.1は現在利用できません（404エラー）
IMAGE_GENERATION_PROVIDER="dalle"
```

### 4. データベースのセットアップ

```bash
# Prismaクライアントの生成
npx prisma generate

# データベースマイグレーション
npx prisma db push

# または、マイグレーションファイルを作成
npx prisma migrate dev --name init
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセス

### 6. ビルド

```bash
npm run build
npm start
```

---

## 使用方法

### 1. APIキーの設定

1. `/api-key`ページにアクセス
2. 各AIサービスのAPIキーを入力
3. 「APIキーを設定」ボタンをクリック
4. 「接続を確認」ボタンで接続をテスト
5. サーバーを再起動して変更を反映

### 1.5. AIモデル情報の表示

各機能ページ（市場調査、SNS調査、戦略分析、コンテンツ生成）のヘッダーに、現在使用中のAIモデル情報が表示されます。

- **表示形式**: `使用AI: {AI名} ({モデル名})`
- **例**: `使用AI: GEMINI (gemini-2.5-pro)`, `使用AI: CLAUDE (claude-opus-4-1)`

また、各AIサービスが生成する全ての文書の冒頭に、使用モデル情報が自動的に記載されます：

```
【使用AIモデル: Gemini gemini-2.5-pro】

（実際の出力内容）
```

**Claudeの用途別モデル設定**:
- **総合分析・新規導入提案**: Claude Opus 4.1（最高性能モデル）
- **価格設定提案・キャンペーン案**: Claude Sonnet 4.5（高性能・コスト効率重視）

### 2. 商品管理

1. `/`ページにアクセス
2. 「商品を追加」ボタンで商品を登録
3. 原価・販売価格・説明文を入力
4. 商品の編集・削除・有効/無効切り替えが可能

### 3. 市場調査の実行

#### トレンド分析

1. `/market-research`ページにアクセス
2. 「トレンド分析」タブを選択
3. 調査地域を入力（例: "東京"）
4. 期間を選択（オプション、デフォルト: "last 90 days"）
5. 「調査を開始」ボタンをクリック
6. 結果は「調査結果履歴」セクションに表示

#### 価格調査

1. 「価格調査」タブを選択
2. 調査対象の施術を入力（例: ["ダーマペン", "ボトックス", "ヒアルロン酸"]）
3. 調査対象の都市を入力（例: ["東京", "大阪", "福岡"]）
4. 期間を選択（オプション）
5. 「調査を開始」ボタンをクリック

#### 競合調査

1. 「競合調査」タブを選択
2. 中心地を入力（例: "渋谷駅"）
3. 半径を入力（オプション、デフォルト: 5km）
4. 「調査を開始」ボタンをクリック

### 4. SNS調査の実行

#### Twitter/X調査

1. `/sns-research`ページにアクセス
2. 「Twitter/X」タブを選択
3. キーワードを入力（例: ["ダーマペン", "ピコレーザー"]）
4. 期間を選択（オプション、デフォルト: "last_month"）
5. 地域を入力（オプション、デフォルト: "unknown"）
6. 「調査を開始」ボタンをクリック

#### Instagram調査

1. 「Instagram」タブを選択
2. キーワード、期間、地域を入力
3. 「調査を開始」ボタンをクリック

#### YouTube調査

1. 「YouTube」タブを選択
2. キーワード、期間、地域を入力
3. 「調査を開始」ボタンをクリック

### 5. 戦略分析の実行

#### AIプロバイダーの選択

1. `/strategy-analysis`ページにアクセス
2. ページヘッダーの「AI」ドロップダウンから、ClaudeまたはChatGPTを選択
3. 選択したAIプロバイダーは自動的に保存され、次回以降も使用されます

#### 総合分析

1. 「総合分析」セクションで：
   - 所在地を入力
   - 分析対象の商品を選択（複数可）
   - 市場データ/SNSデータを含めるか選択
2. 「総合分析を実行」ボタンをクリック
3. 結果は自動的にデータベースに保存され、以下の場所で確認可能：
   - 「提案履歴」セクションの「総合分析履歴」
   - `/strategy-management`ページ

#### 価格設定提案

1. 「価格設定提案」セクションで「価格設定提案を生成」ボタンをクリック
2. 市場価格データが必要です
3. 結果は自動的にデータベースに保存され、「提案履歴」セクションの「価格設定提案履歴」で確認可能

#### キャンペーン案生成

1. 「キャンペーン案生成」セクションで「キャンペーン案を生成」ボタンをクリック
2. 市場トレンドデータとSNSデータが必要です
3. 結果は自動的にデータベースに保存され、「提案履歴」セクションの「キャンペーン案履歴」で確認可能

#### 新施術導入提案

1. 「新施術導入提案」セクションで「新施術提案を生成」ボタンをクリック
2. 商品データ、市場トレンドデータ、SNSトレンドデータが必要です
3. 結果は自動的にデータベースに保存され、「提案履歴」セクションの「新施術提案履歴」で確認可能

#### 提案履歴の確認

「提案履歴」セクションでは、以下の履歴を一括確認できます：
- **総合分析履歴**: 過去の総合分析結果
- **価格設定提案履歴**: 過去の価格設定提案
- **キャンペーン案履歴**: 過去のキャンペーン案
- **新施術提案履歴**: 過去の新施術導入提案

各履歴エントリには、作成日時、実装ステータス、詳細内容が表示されます。

### 6. コンテンツ生成

#### 既存機能（`/content`）

1. `/content`ページにアクセス
2. コンテンツタイプを選択（Instagram LP、HP記事、キャンペーンコピー）
3. キャンペーン情報を入力
4. 「コンテンツを生成」ボタンをクリック
5. プレビューで結果を確認し、必要に応じて画像としてエクスポート

#### 新機能（`/content/generator`）

1. `/content/generator`ページにアクセス
2. コンテンツタイプを選択（Instagram投稿、ブログ記事、LP）
3. キャンペーン情報を入力：
   - キャンペーン名、説明、ターゲット層、ブランドトーン
   - 関連施術の選択（複数可）
   - SNS調査結果の選択（任意）
4. コンテンツタイプ別のオプション設定：
   - **Instagram投稿**: ハッシュタグ数、行動喚起タイプ
   - **ブログ記事**: 記事の長さ、SEOキーワード
   - **LP**: 主な目的、価格情報
5. 画像生成設定（オプション）：
   - 画像を生成するか選択
   - 画像プリセット選択（Instagram正方形、LPバナー、カスタム）
   - 画像テーマ選択
   - カスタムサイズ指定（必要に応じて）
6. 「コンテンツを生成」ボタンをクリック
7. プレビューで結果を確認（テキスト + 画像）
8. 履歴から過去のコンテンツを確認・再利用

---

## 開発ガイド

### プロジェクト構造

```
beauty project/
├── prisma/
│   └── schema.prisma          # データベーススキーマ
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/trpc/          # tRPC APIルート
│   │   ├── content/            # コンテンツ生成ページ
│   │   ├── market-research/   # 市場調査ページ
│   │   ├── sns-research/      # SNS調査ページ
│   │   ├── strategy-analysis/ # 戦略分析ページ
│   │   └── ...
│   ├── components/             # 共通コンポーネント
│   ├── features/               # 機能別コンポーネント
│   ├── generated/prisma/      # Prismaクライアント（自動生成）
│   ├── server/
│   │   ├── api/routers/       # tRPCルーター
│   │   ├── services/          # ビジネスロジック
│   │   └── utils/             # ユーティリティ
│   └── trpc/                   # tRPC設定
└── package.json
```

### コードスタイル

- **TypeScript**: 厳格な型チェックを有効化
- **ESLint**: Next.jsのデフォルト設定を使用
- **Prettier**: コードフォーマット（設定ファイルがあれば）

### データベースマイグレーション

```bash
# 開発環境
npx prisma migrate dev --name migration_name

# 本番環境
npx prisma migrate deploy

# Prismaクライアントの再生成
npx prisma generate
```

### エラーハンドリング

- **tRPC**: `TRPCError`を使用してエラーを返す
- **フロントエンド**: `@tanstack/react-query`のエラーハンドリングを使用
- **ログ**: `console.error`でサーバー側エラーを記録
- **エラーログ**: `ErrorLog`モデルにエラーを保存（将来実装）

### テスト

現在テストフレームワークは未導入。将来的にJest/Vitest等を導入予定。

---

## 医療広告ガイドライン対応

### 禁止表現リスト

以下の表現は自動的に検出・修正されます：

- 断定表現: "完全に治る"、"必ず治る"、"絶対に治る"、"100%治る"
- 比較優良誤認: "No.1"、"一番"、"最高"、"最強"、"唯一"、"他にない"
- 誇大表現: "革命的な"、"驚異的な"、"奇跡的な"、"魔法のような"
- 即効性の強調: "即効性"、"即座に"、"すぐに治る"、"たった1回で"
- 副作用・リスクの否定: "副作用なし"、"リスクなし"、"痛みなし"、"ダウンタイムなし"

### 自動修正機能

禁止表現は自動的に適切な表現に置換されます：

- "完全に治る" → "改善が期待できます"
- "No.1" → "高い評価"
- "副作用なし" → "安全性に配慮"
- など

### 注意書きの自動付与

以下の注意書きが自動的に付与されます：

- "※効果には個人差があります"
- "※施術内容により、効果の程度や持続期間は異なります"
- "※事前のカウンセリングで、ご希望やご予算に合わせた最適なプランをご提案いたします"
- "※施術前には必ず医師による診察・説明を受けていただきます"

### 実装ファイル

- `src/server/utils/advertising-guidelines.ts`: 禁止表現チェック・修正ロジック
- `src/server/services/content-generation.ts`: コンテンツ生成時に自動適用

---

## Web検索統合

### 対応API

1. **SerpAPI**（優先）
   - 環境変数: `SERP_API_KEY`
   - 最大10件の検索結果を取得

2. **Google Custom Search API**（フォールバック）
   - 環境変数: `GOOGLE_CUSTOM_SEARCH_API_KEY`, `GOOGLE_CUSTOM_SEARCH_ENGINE_ID`
   - 最大10件の検索結果を取得

### 自動フォールバック

SerpAPIが利用できない場合、自動的にGoogle Custom Search APIにフォールバックします。

### 統合箇所

- **Gemini**: トレンド分析、価格調査、競合分析、Instagram/YouTube調査
- **ChatGPT**: コンテンツ生成（Instagram LP、HP記事、キャンペーンコピー）

### 実装ファイル

- `src/server/services/web-search.ts`: Web検索ロジック
- `src/server/services/prompt-helper.ts`: プロンプトにWeb検索指示を追加

---

## 構造化データの処理

### CONSENSUS_JSON抽出

各AI（Gemini/Grok）の出力から`<CONSENSUS_JSON>`タグを抽出し、構造化データとして使用します。

**実装ファイル**: `src/server/utils/parse-ai-results.ts`

**主要関数**
- `extractConsensusJSON(text: string)`: JSONを抽出・パース
- `extractReportMarkdown(text: string)`: Markdownを抽出
- `parseMarketResearchResult(...)`: 市場調査結果を構造化
- `parseSNSResearchResult(...)`: SNS調査結果を構造化

### データの優先順位

1. **構造化データ（CONSENSUS_JSON）**: 最優先
2. **レポート（REPORT_MARKDOWN）**: 構造化データがない場合
3. **生データ（rawText）**: 最後の手段

---

## 画像生成機能

### DALL·E 3統合

**実装ファイル**: `src/server/services/image-generation.ts`

**主要関数**
- `generateImageWithDalle(options, contentText)`: DALL·E 3で画像生成
- `generateImage(options, contentText)`: 画像生成（プロバイダー選択）

**画像プリセット**
- `instagram_square`: 1080x1080（Instagram正方形）
- `lp_banner`: 1200x630（LPバナー、16:9）
- `custom`: カスタムサイズ（256x256〜2048x2048）

**画像テーマ**
- `before_after`: ビフォーアフター比較
- `season_event`: 季節・イベント
- `clinic_interior`: クリニック内装
- `texture_skin`: 肌の質感

**DALL·E 3のサイズ制限**
- 1024x1024（正方形）
- 1792x1024（横長）
- 1024x1792（縦長）

システムは自動的に最適なサイズを選択します。

---

## トラブルシューティング

### ビルドエラーが発生する場合

```bash
# .nextフォルダを削除して再ビルド
rm -rf .next
npm run build
```

### API接続エラーが発生する場合

1. `/api-key`ページでAPIキーが正しく設定されているか確認
2. 「接続を確認」ボタンで接続をテスト
3. サーバーを再起動して環境変数を再読み込み

### Prismaクエリエンジンが見つからないエラー（Apple Silicon）

`prisma/schema.prisma`の`generator`セクションに`binaryTargets`を追加：

```prisma
generator client {
  provider      = "prisma-client"
  output        = "../src/generated/prisma"
  binaryTargets = ["native", "darwin-arm64"]
}
```

その後、`npx prisma generate`を実行。

### モジュールが見つからないエラー

```bash
# 依存関係を再インストール
rm -rf node_modules .next
npm install
npm run dev
```

### キャンペーン案や新施術提案が出力されない場合

1. **データの確認**:
   - 市場トレンドデータまたはSNSデータが存在するか確認
   - `/market-research`または`/sns-research`で調査を実行
2. **サーバーログの確認**:
   - コンソールにエラーメッセージが表示されていないか確認
   - プロンプト長、結果長のログを確認
3. **データベースの確認**:
   - `/strategy-management`ページで履歴を確認
   - データベースに保存されているか確認

### 内部サーバーエラーが発生する場合

1. **サーバーログの確認**:
   - コンソールに詳細なエラーメッセージが表示される
   - Claude APIレスポンス検証エラーの可能性を確認
2. **データ検証の確認**:
   - 必要なデータ（商品、市場トレンド、SNSデータ）が存在するか確認
   - 空のデータで実行していないか確認
3. **APIキーの確認**:
   - Claude APIキーが正しく設定されているか確認
   - APIキーの権限で利用可能なモデルを確認（`CLAUDE_MODEL`環境変数で指定可能）

---

## ライセンス

このプロジェクトのライセンス情報は、リポジトリのルートディレクトリにあるLICENSEファイルを参照してください。

---

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

---

## サポート

問題が発生した場合は、GitHubのIssuesで報告してください。

---

## 主な変更履歴

### 2025年11月 - トークン量最適化とデータ受け渡し改善

#### トークン量削減の最適化
- **データラッパーの削除**: `{ text: processedData }` 形式のラッパーを削除し、データを直接渡すように変更
- **JSONインデントの削除**: `JSON.stringify(data, null, 2)` から `JSON.stringify(data)` に変更し、不要な空白を削減
- **構造化データの優先使用**: `consensusJSON`が存在する場合はそれを優先的に使用
- **冗長メタデータの削除**: 「あり」「なし」「unknown」などのメタデータを削除

**期待される効果**:
- ChatGPT/Gemini: 実際のデータが使用され、冗長なメタデータが削減
- Claude: 3-5%のトークン削減（インデント削除）
- 全体的: データの損失を防止し、トークン使用量を削減

#### Grokデータの受け渡し改善
- **プラットフォーム情報の明示的な含める**: SNS調査データを戦略分析に渡す際、`platform`と`aiAgent`情報を明示的に含めるように変更
- **データ形式の統一**: テキスト形式のデータも`{ platform, aiAgent, data }`形式で統一
- **Grokデータの識別**: AI APIがGrokのTwitterデータを正しく識別できるように改善

**修正箇所**:
- `strategy.ts`: `analyzeMarketPosition`, `generateCampaignProposals`, `suggestNewTreatments`関数
- すべての戦略分析関数でプラットフォーム情報を含めるように統一

#### API連携ドキュメントの追加
- **API_INTEGRATION_DOCUMENTATION.md**: 全APIの連携状況を詳細に記載したドキュメントを追加
  - 外部API一覧（6つ）
  - 内部API（tRPCルーター）一覧（9つ）
  - API連携フロー図
  - 各APIの詳細仕様
  - データフロー
  - エラーハンドリング
  - 環境変数設定
  - トークン量最適化

### 2025年11月 - コンテンツ生成機能の拡張

#### 新機能追加
- Instagram投稿生成（キャプション + ハッシュタグ + 画像）
- ブログ記事生成（SEO最適化 + アイキャッチ画像）
- LPテキスト生成（セクション構造 + コピー + LPヘッダー画像）
- 画像生成機能（DALL·E 3統合）
  - プリセット: `instagram_square` (1080x1080), `lp_banner` (1200x630), `custom`
  - テーマ: `before_after`, `season_event`, `clinic_interior`, `texture_skin`

#### データベーススキーマ拡張
- `GeneratedContent`モデルに新フィールド追加:
  - `bodyMarkdown`: Markdown形式の本文
  - `rawJson`: 構造化JSONデータ
  - `brandTone`: ブランドトーン
  - `targetAudience`: ターゲット層
  - `relatedTreatmentIds`: 関連施術ID（JSON配列）
  - `snsResearchIds`: SNS調査ID（JSON配列）
- `ContentImage`モデル追加: 生成画像の管理

#### SNS調査統合
- コンテンツ生成時にSNS調査結果を参照可能に
- プロンプトにSNS調査データを自動統合

#### 医療広告ガイドライン対応
- 禁止ワードの自動フィルタリング
- 誇大・断定表現の自動修正
- 注意書きの自動付与

### 2025年11月 - Gemini統合とWeb検索機能

#### Gemini API統合
- 市場調査（トレンド分析、価格比較、競合分析）
- SNS調査（Instagram、YouTubeトレンド分析）
- 戦略分析（ChatGPT/Claudeの代替として選択可能）

#### Web検索統合
- SerpAPI統合（優先）
- Google Custom Search API統合（フォールバック）
- 戦略分析に最新情報を反映

#### Claude Web検索対応
- Claudeの戦略分析関数にWeb検索機能を追加
- ChatGPT/Geminiと同様に最新情報を活用可能に
