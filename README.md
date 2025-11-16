# 美容クリニックAI協調プラットフォーム

美容クリニック向けの戦略立案・素材生成を支援するAI協調システムです。複数のAIサービス（Gemini、Grok、Claude、ChatGPT）を連携させて、市場調査、SNS分析、戦略立案、コンテンツ生成などの業務を自動化します。

## 主な機能

### 1. 商品管理 (`/`)
- クリニックの施術・商品情報の管理
- 価格設定、説明文の編集
- 商品の追加・削除・更新
- 商品の有効/無効切り替え

### 2. 市場調査 (`/market-research`)
- **トレンド分析**：指定地域の美容施術トレンドを調査
  - パラメータ：`location`（必須）、`period`（オプション、デフォルト: "last 90 days"）
  - 出力形式：構造化プロンプト（`<CONSENSUS_JSON>` + `<REPORT_MARKDOWN>`）
  - 根拠URLと取得日時を必須記載
  - 医療広告ガイドライン配慮（誇大表現禁止）
- **価格調査**：複数都市での価格比較
  - パラメータ：`treatments`（必須）、`cities`（必須）、`period`（オプション、デフォルト: "last 90 days"）
  - 標準化単位での価格正規化（例：ボトックス=per_unit_10U、HA=per_ml_1）
  - 統計情報（中央値、p25、p75、サンプル数）を含む
- **競合調査**：周辺地域の競合クリニック分析
  - パラメータ：`location`（必須）、`radius`（オプション、デフォルト: 5km）
  - Google Mapsベースの競合抽出
  - 施術カタログ・価格・特徴の比較

### 3. SNS調査 (`/sns-research`)
- **Twitter/X調査**（Grok API使用）
  - パラメータ：`keywords`（必須）、`timeRange`（オプション、デフォルト: "last_month"）、`location`（オプション、デフォルト: "unknown"）
  - ハッシュタグ分析、影響力アカウント分析、エンゲージメント傾向
- **Instagram調査**（Gemini API使用）
  - パラメータ：`keywords`（必須）、`timeRange`（オプション、デフォルト: "last_month"）、`location`（オプション、デフォルト: "unknown"）
  - 投稿タイプ分析、ビジュアルトレンド、ユーザー動向
- **YouTube調査**（Gemini API使用）
  - パラメータ：`keywords`（必須）、`timeRange`（オプション、デフォルト: "last_month"）、`location`（オプション、デフォルト: "unknown"）
  - フォーマット分析（Shorts/長尺）、動画の長さ・構成トレンド、視聴者関心
- すべてのSNS調査は構造化プロンプト形式で出力（`<CONSENSUS_JSON>` + `<REPORT_MARKDOWN>`）

### 4. 戦略分析 (`/strategy-analysis`)
- **総合分析**：市場データとSNSデータを統合分析
  - パラメータ：`location`（必須）、`productIds`（オプション）、`includeMarketData`（オプション、デフォルト: true）、`includeSNSData`（オプション、デフォルト: true）
  - 商品選択機能：分析対象の商品を複数選択可能
  - **複数AI協業**：Gemini（市場調査）、Grok（SNS調査）、Claude/ChatGPT（戦略統合）による協業分析
  - **構造化データの活用**：各AIの分析結果（CONSENSUS_JSON）を抽出・統合して総合的な戦略を提案
  - **Web検索統合**：最新情報を取得して分析に反映
  - SWOT分析、市場ポジション分析、競合地図
  - 小規模クリニック向け最適化（人時・予算制約を考慮）
  - 7日間の実行チェックリストと30/60/90日ロードマップを含む
  - データベースに自動保存
- **価格設定提案**：市場価格データに基づく価格提案
  - パラメータ：`userId`（必須）
  - 粗利下限を守りつつ相場と需給に整合した推奨価格
  - 心理価格を考慮（端数ルール：¥x,800 / ¥x,980 / ¥x,500）
  - 優先度付き（高/中/低）で提示
  - データベースに自動保存
- **キャンペーン案生成**：効果的な月次キャンペーン案の提案
  - パラメータ：`userId`（必須）
  - 市場トレンドデータとSNSデータが必要
  - 最少2件以上のキャンペーン案を優先度順に提示
  - 実行容易性×効果の高い順に並べ替え
  - データベースに自動保存
- **新施術導入提案**：市場トレンドに基づく新施術の提案
  - パラメータ：`userId`（必須）
  - 商品データ、市場トレンドデータ、SNSトレンドデータが必要
  - 既存施術を除外し、未導入の有望施術のみを提案
  - 投資対効果（Payback試算）を含む
  - データベースに自動保存
- **戦略提案履歴表示**：各提案タイプごとの履歴を個別に表示
  - 総合分析履歴：`marketingStrategy`がある提案を表示
  - 価格設定提案履歴：`priceRecommendations`がある提案を表示
  - キャンペーン案履歴：`campaignProposals`がある提案を表示
  - 新施術提案履歴：`newTreatmentSuggestions`がある提案を表示
  - 各履歴には日時、実装ステータス、提案内容が含まれる
  - 提案内容は折りたたみ表示で確認可能

### 5. 戦略管理 (`/strategy-management`)
- 戦略提案の履歴管理
  - 価格推奨、キャンペーン案、新施術提案の履歴を一覧表示
  - 各提案の詳細を確認可能
- フィードバックの記録
- 実装ステータスの管理（pending / in_progress / completed）
- 戦略書のエクスポート（JSON、テキスト、PDF、Excel形式）

### 6. コンテンツ生成 (`/content`)
- Instagram用LP案の生成
- SEO最適化されたHP記事の生成
- キャンペーンコピーの生成
- プレビュー機能と画像エクスポート機能

### 7. ワークフロー管理 (`/workflow`)
- AIエージェント間の協調動作管理
- 統合分析ワークフローの実行
- AIエージェントのヘルスチェック
- ワークフロー実行履歴の確認

### 8. APIキー設定 (`/api-key`)
- Gemini、Grok、Claude、OpenAIのAPIキー設定
- **Web検索APIキー設定**：最新情報取得のためのSerpAPIまたはGoogle Custom Search APIキー設定
- APIキーの設定状態確認
- **API接続確認機能**：各AIサービスの接続テスト
- **戦略分析AIプロバイダー選択**：戦略分析で使用するAIプロバイダー（Claude API / ChatGPT API）を選択可能
  - デフォルトはChatGPT API
  - 選択したプロバイダーのAPIキーが設定されている必要があります
  - 設定は即座に反映されます（サーバー再起動不要）
- セキュアなAPIキー管理

### 9. プロンプト管理 (`/prompt`)
- 各AIサービスへの指示文（プロンプト）の管理
- プロンプトの編集・保存
- プロンプトの有効/無効切り替え
- AIエージェント別のプロンプト管理
- **構造化プロンプト形式**：`<CONSENSUS_JSON>`（機械処理用）と`<REPORT_MARKDOWN>`（人向け）の2部構成

## 技術スタック

### フロントエンド
- **Next.js 13.5.6** (App Router)
- **React 18.2.0**
- **TypeScript 5**
- **Atlassian Design System** - UIコンポーネントライブラリ
  - `@atlaskit/button` - ボタンコンポーネント
  - `@atlaskit/textfield` - テキスト入力
  - `@atlaskit/textarea` - 複数行テキスト入力
  - `@atlaskit/select` - ドロップダウン選択
  - `@atlaskit/banner` - 通知メッセージ
  - `@atlaskit/badge` - ステータス表示
  - `@atlaskit/tag` - タグ表示
  - `@atlaskit/checkbox` - チェックボックス
  - `@atlaskit/spinner` - ローディング表示
  - `@atlaskit/empty-state` - 空状態表示
  - `@atlaskit/app-provider` - アプリケーション全体のラッパー
  - `@atlaskit/table` - テーブルコンポーネント
  - `@atlaskit/modal-dialog` - モーダルダイアログ

### バックエンド
- **tRPC 11.7.1** - 型安全なAPI通信
- **Prisma 6.18.0** - ORM
- **Zod 4.1.12** - スキーマバリデーション
- **SuperJSON 2.2.5** - データシリアライゼーション

### AIサービス統合
- **Google Gemini API** (`@google/generative-ai 0.24.1`) - 市場調査、SNS分析
- **Grok API (X/Twitter)** (`axios 1.13.1`) - Twitterトレンド分析
- **Anthropic Claude API** (`@anthropic-ai/sdk 0.68.0`) - 戦略分析
- **OpenAI ChatGPT API** (`openai 6.7.0`) - コンテンツ生成

### データベース
- **MySQL** - Prisma経由で接続
- **Prisma Client** - 型安全なデータベースアクセス

### その他
- **React Query (TanStack Query) 5.90.5** - データフェッチング
- **html2canvas 1.4.1** - 画像エクスポート機能
- **jspdf 3.0.3** + **jspdf-autotable 5.0.2** - PDFエクスポート
- **exceljs 4.4.0** - Excelエクスポート

## セットアップ

### 必要な環境
- Node.js 18以上
- npm または yarn
- MySQL（データベース）

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/tomiyuta/ai-clinic-platform.git
cd ai-clinic-platform

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集して、データベースURLとAPIキーを設定
```

### 環境変数の設定

`.env`ファイルに以下の環境変数を設定してください：

```env
# データベース
DATABASE_URL="mysql://user:password@localhost:3306/beautyclinic"

# AI API Keys
GEMINI_API_KEY="your-gemini-api-key"
GROK_API_KEY="your-grok-api-key"
CLAUDE_API_KEY="your-claude-api-key"
OPENAI_API_KEY="your-openai-api-key"

# Claude Model (オプション)
# 利用可能なモデルを指定（例: claude-3-5-sonnet）
# 未指定の場合は自動的に利用可能なモデルを選択
CLAUDE_MODEL="claude-3-5-sonnet"

# Web Search API Keys (for latest information retrieval)
# 最新情報を取得するために、以下のいずれかを設定してください
# オプション1: SerpAPI (推奨) - https://serpapi.com/
SERP_API_KEY="your-serp-api-key"

# オプション2: Google Custom Search API
# https://developers.google.com/custom-search/v1/overview
GOOGLE_CUSTOM_SEARCH_API_KEY="your-google-custom-search-api-key"
GOOGLE_CUSTOM_SEARCH_ENGINE_ID="your-google-custom-search-engine-id"
```

### データベースのセットアップ

```bash
# Prismaマイグレーションの実行
npx prisma migrate dev

# または、直接データベースにスキーマを適用（マイグレーション履歴が不要な場合）
npx prisma db push

# Prismaクライアントの生成
npx prisma generate
```

**注意**: `prisma migrate dev`でエラーが発生する場合は、`prisma db push`を使用してください。

**注意**: Apple Silicon（M1/M2）マシンを使用している場合、`prisma/schema.prisma`の`generator`セクションに`binaryTargets`を追加する必要がある場合があります：

```prisma
generator client {
  provider      = "prisma-client"
  output        = "../src/generated/prisma"
  binaryTargets = ["native", "darwin-arm64"]
}
```

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセスしてください。

## プロジェクト構成

```
ai-clinic-platform/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/
│   │   │   └── trpc/          # tRPC APIルート
│   │   │       └── [trpc]/route.ts  # tRPCハンドラー（エラーハンドリング強化）
│   │   ├── api-key/           # APIキー設定ページ
│   │   ├── content/            # コンテンツ生成ページ
│   │   ├── market-research/    # 市場調査ページ
│   │   ├── sns-research/       # SNS調査ページ
│   │   ├── strategy-analysis/  # 戦略分析ページ
│   │   ├── strategy-management/# 戦略管理ページ
│   │   ├── workflow/           # ワークフロー管理ページ
│   │   ├── prompt/             # プロンプト管理ページ
│   │   ├── layout.tsx          # ルートレイアウト
│   │   ├── page.tsx            # ホームページ
│   │   ├── error.tsx           # エラーページ
│   │   └── not-found.tsx       # 404ページ
│   ├── components/             # 共通コンポーネント
│   │   ├── AtlassianProvider.tsx  # Atlassian Design Systemプロバイダー
│   │   └── Navigation.tsx      # ナビゲーションコンポーネント
│   ├── features/               # 機能別コンポーネント
│   │   ├── api-key/            # APIキー管理
│   │   ├── content/             # コンテンツ生成
│   │   ├── market-research/    # 市場調査
│   │   ├── products/           # 商品管理
│   │   ├── prompt/             # プロンプト管理
│   │   ├── sns-research/       # SNS調査
│   │   ├── strategy/           # 戦略分析・管理
│   │   │   ├── strategy-analysis.tsx  # 戦略分析UI（キャッシュ無効化実装、タイプ別履歴表示）
│   │   │   └── strategy-management.tsx  # 戦略管理UI
│   │   └── workflow/           # ワークフロー管理
│   ├── server/                 # サーバーサイドコード
│   │   ├── api/                # tRPCルーター
│   │   │   ├── routers/       # 各機能のルーター
│   │   │   │   ├── market-research.ts  # 市場調査（periodパラメータ追加）
│   │   │   │   ├── sns-research.ts     # SNS調査（locationパラメータ追加）
│   │   │   │   ├── strategy.ts         # 戦略分析（構造化データ統合、ユーザー設定管理）
│   │   │   │   └── ...
│   │   │   ├── root.ts        # ルートルーター
│   │   │   └── trpc.ts        # tRPC設定
│   │   ├── services/           # ビジネスロジック
│   │   │   ├── ai-health-check.ts  # AI接続確認
│   │   │   ├── gemini.ts      # Gemini API統合（period/locationパラメータ対応）
│   │   │   ├── grok.ts        # Grok API統合（locationパラメータ対応）
│   │   │   ├── claude.ts      # Claude API統合（レスポンス検証強化、デバッグログ追加）
│   │   │   ├── chatgpt.ts     # ChatGPT API統合（構造化データ対応、Web検索統合）
│   │   │   ├── prompt-helper.ts  # プロンプト管理（構造化プロンプト実装、複数AI協業説明追加）
│   │   │   ├── web-search.ts  # Web検索機能
│   │   │   └── workflow-orchestrator.ts  # ワークフロー管理
│   │   └── utils/              # ユーティリティ関数
│   │       └── parse-ai-results.ts  # CONSENSUS_JSON抽出・パース機能
│   │   └── db.ts              # Prismaクライアント
│   └── trpc/                   # tRPCクライアント設定
│       ├── provider.tsx        # tRPCプロバイダー（エラーハンドリング改善）
│       └── react.ts            # Reactフック
├── prisma/
│   └── schema.prisma          # データベーススキーマ
├── .env                        # 環境変数（.gitignoreに含まれる）
└── package.json               # 依存関係

```

## プロンプト設計の特徴

### 構造化プロンプト形式

すべてのAI分析機能は、以下の2部構成の構造化プロンプト形式を採用しています：

1. **`<CONSENSUS_JSON>`** - AI合議・採点用の「隠しJSON」（機械処理用）
   - UIには表示しない
   - 厳密なJSON構造で返す
   - 根拠URL、取得日時、統計情報を含む

2. **`<REPORT_MARKDOWN>`** - 人が読むレポート（Markdown）
   - 読みやすい要約形式
   - 丁寧語・断定禁止
   - 実務に直結する内容

### 厳格ルール

すべてのプロンプトは以下のルールを厳守します：

- **根拠の必須記載**：主張・数値は必ず根拠URLと取得日時で裏付ける
- **医療広告ガイドライン配慮**：誇大・断定・比較優良誤認（「必ず/完全/No.1/絶対」等）禁止
- **小規模クリニック最適化**：人時・予算・機器の制約を考慮
- **標準化単位**：価格は正規化単位で比較（例：ボトックス=per_unit_10U、HA=per_ml_1）
- **データギャップの明記**：取得できなかった情報は「unknown」または「gaps」に記載

### プロンプトタイプ一覧

#### Claude用プロンプト
- `claude_analyze_market_position` - 市場ポジション分析
- `claude_generate_price_recommendations` - 価格推奨
- `claude_generate_campaign_proposals` - キャンペーン提案
- `claude_suggest_new_treatments` - 新施術提案

#### Gemini用プロンプト
- `gemini_research_trend_analysis` - トレンド分析調査
- `gemini_research_price_comparison` - 価格比較調査
- `gemini_analyze_instagram_trends` - Instagramトレンド分析
- `gemini_analyze_youtube_trends` - YouTubeトレンド分析
- `gemini_research_competitor_analysis` - 競合分析調査

#### Grok用プロンプト
- `grok_analyze_twitter_trends` - X（Twitter）トレンド分析

#### ChatGPT用プロンプト
- `chatgpt_system_prompt` - システムプロンプト
- `chatgpt_generate_instagram_lp` - Instagram LP生成
- `chatgpt_generate_website_article` - HP記事生成
- `chatgpt_generate_campaign_copy` - キャンペーンコピー生成

## エラーハンドリング

### tRPCエラーハンドリング

#### クライアント側（`src/trpc/provider.tsx`）
- **404/401エラーはリトライしない**：`NOT_FOUND`、`UNAUTHORIZED`コードのエラーは即座に失敗として扱う
- **最大3回までリトライ**：その他のエラーは指数バックオフで最大3回までリトライ
- **リトライ間隔**：`Math.min(1000 * 2 ** attemptIndex, 30000)`（最大30秒）

#### サーバー側（`src/app/api/trpc/[trpc]/route.ts`）
- **JSONレスポンス保証**：すべてのエラーはJSON形式で返す（HTMLエラーページを防止）
- **詳細なエラーメッセージ**：エラー内容を`message`フィールドに含める

### Claude APIレスポンス検証

`src/server/services/claude.ts`で以下の検証を実装：

1. **空のcontent配列チェック**：`message.content`が空でないことを確認
2. **contentタイプチェック**：最初のcontentが`text`タイプであることを確認
3. **空のレスポンステキストチェック**：レスポンステキストが空でないことを確認
4. **デバッグログ**：プロンプト長、結果長、プレビューをログ出力

### データ検証

`src/server/api/routers/strategy.ts`で以下の検証を実装：

1. **商品データの存在確認**：商品が存在しない場合はエラーを返す
2. **市場トレンド/SNSデータの存在確認**：必要なデータが空の場合はエラーを返す
3. **生成結果の検証**：AI生成結果が空または無効な場合はエラーを返す

## データベース保存

### 戦略分析結果の保存

以下の戦略分析結果は自動的にデータベースに保存されます：

- **価格推奨**：`StrategyRecommendation.priceRecommendations`
- **キャンペーン案**：`StrategyRecommendation.campaignProposals`
- **新施術提案**：`StrategyRecommendation.newTreatmentSuggestions`
- **総合分析**：`StrategyRecommendation.marketingStrategy`

### フロントエンドのキャッシュ無効化

各戦略分析の`onSuccess`コールバックで、`utils.strategy.list.invalidate()`を呼び出し、履歴一覧を自動更新します。

## 主な変更履歴

### 複数AI協業機能の実装（2025年1月）

#### 複数AIの協業アーキテクチャ
- **Gemini（Google）**：市場調査（トレンド分析、価格調査、競合分析）、SNS調査（Instagram、YouTube）
  - 構造化データ（CONSENSUS_JSON）として、施術の人気度、価格帯、競合情報、ハッシュタグ、インフルエンサー情報などを提供
- **Grok（xAI）**：SNS調査（X/Twitter）
  - 構造化データ（CONSENSUS_JSON）として、X上のトレンド、ハッシュタグ、投稿傾向、エンゲージメント情報などを提供
- **Claude/ChatGPT（戦略統合AI）**：上記のAI分析結果を統合し、総合的な戦略提案を行う
  - デフォルトはChatGPT API
  - ユーザー設定でClaude APIに切り替え可能

#### CONSENSUS_JSON抽出・パース機能
- `src/server/utils/parse-ai-results.ts`を新規作成
- Gemini/Grokの出力から`<CONSENSUS_JSON>`タグを抽出・パースする機能を実装
- 市場調査データとSNS調査データを構造化データに変換
- 構造化データを優先的に使用し、数値やURLなどの根拠を活用

#### 戦略分析APIの改善
- テキストデータではなく、構造化データ（CONSENSUS_JSON）を優先的に使用
- 各AIの分析結果を統合してClaude/ChatGPTに渡すように変更
- 構造化データから主要情報（施術、価格テーブル、ハッシュタグ、インフルエンサー等）を抽出
- 各AIの分析結果を引用する際は、どのAI（Gemini/Grok等）が分析したかを明記

#### ChatGPT API統合の改善
- 戦略分析のデフォルトAPIをChatGPT APIに変更
- Web検索機能を統合し、最新情報を取得して分析に反映
- 構造化データを詳細にフォーマットし、AI分析エージェント名、分析日時、構造化データ、レポートなどを明示
- 各関数で構造化データからキーワードを抽出するロジックを追加

#### プロンプトの改善
- 複数AIの協業についての説明を追加
- データの優先順位（構造化データ > レポート > 生データ）を明示
- 各AIの役割を明確化（Gemini:市場調査、Grok:SNS調査、Claude/ChatGPT:戦略統合）

#### ユーザー設定機能
- `UserSettings`テーブルを追加（`strategyAIProvider`フィールド）
- 戦略分析で使用するAIプロバイダーを選択可能（Claude API / ChatGPT API）
- デフォルトはChatGPT API
- フロントエンドから設定を変更可能（`/api-key`ページ）

#### データベーススキーマの更新
- `UserSettings`モデルを追加
  - `id`: 主キー
  - `userId`: ユーザーID（ユニーク）
  - `strategyAIProvider`: 戦略分析で使用するAIプロバイダー（"claude" または "chatgpt"、デフォルト: "chatgpt"）
  - `createdAt`, `updatedAt`: タイムスタンプ

### 戦略提案履歴表示機能の追加（2025年1月）

#### 履歴表示の改善
- **タイプ別履歴表示**：各提案タイプ（総合分析、価格設定提案、キャンペーン案、新施術提案）ごとに履歴を個別に表示
- **空状態の表示**：各セクションに提案がない場合は、適切なメッセージを表示
- **UI改善**：各履歴カードに日時、実装ステータス、折りたたみ可能な提案内容を表示
- **エラーハンドリング強化**：戦略提案履歴取得時のエラーハンドリングを追加し、HTMLエラーページの返却を防止

### プロンプト構造化とエラーハンドリング強化（2025年1月）

#### プロンプトの全面刷新
- すべてのAI分析プロンプトを構造化形式（`<CONSENSUS_JSON>` + `<REPORT_MARKDOWN>`）に変更
- 根拠URLと取得日時の必須記載を実装
- 医療広告ガイドライン配慮（誇大表現禁止）を全プロンプトに適用
- 小規模クリニック向け最適化を全プロンプトに反映

#### パラメータの拡張
- **トレンド分析**：`period`パラメータを追加（デフォルト: "last 90 days"）
- **価格比較調査**：`period`パラメータを追加（デフォルト: "last 90 days"）
- **SNS調査**：`location`パラメータを追加（デフォルト: "unknown"）
- `timeRangeText`を英語形式に統一（例: "last 30 days"）

#### データベース保存ロジックの追加
- 価格推奨、キャンペーン案、新施術提案の結果を自動保存
- フロントエンドでキャッシュ無効化を実装し、履歴一覧を自動更新

#### エラーハンドリングの改善
- tRPCクライアント：404/401エラーはリトライしないように変更
- tRPCサーバー：すべてのエラーをJSON形式で返すように修正
- Claude API：レスポンス検証を強化（空配列、不正タイプ、空テキストのチェック）
- データ検証：商品データ、市場トレンド/SNSデータの存在確認を追加
- デバッグログ：プロンプト長、結果長、プレビューをログ出力

#### Prisma設定の修正
- Apple Silicon（M1/M2）対応：`binaryTargets`に`"darwin-arm64"`を追加（必要に応じて）

### Web検索機能の統合（2024年11月）

すべてのAI機能に最新情報を取得するためのWeb検索機能を統合しました。

#### Web検索API統合
- **SerpAPI統合**：SerpAPIを使用したWeb検索機能を実装
- **Google Custom Search API統合**：Google Custom Search APIを使用したWeb検索機能を実装
- **自動フォールバック**：SerpAPIが利用できない場合、Google Custom Search APIに自動的にフォールバック

#### Gemini API統合
- **トレンド分析**：Web検索結果を基に最新のトレンド情報を取得
- **価格比較調査**：最新の価格情報をWeb検索で取得
- **Instagram/YouTubeトレンド分析**：最新のSNSトレンド情報を取得
- **競合分析**：最新の競合情報を取得

#### ChatGPT API統合
- **Instagram LP生成**：Web検索結果を基に最新トレンドを取り入れたLP案を生成
- **HP記事生成**：最新のSEO情報を含めた記事を生成
- **キャンペーンコピー生成**：最新のトレンド情報を基にキャンペーンコピーを生成

#### プロンプト管理の改善
- **新規プロンプト登録機能**：プロンプトが未登録でも、各AIエージェントごとに未登録のプロンプトタイプを表示し、新規登録可能に
- **レイアウト改善**：コンテナの最大幅を拡大し、セクション間のスペースを調整
- **UI/UX改善**：新規作成時のフォーム強調表示、プレースホルダー説明の追加

#### 戦略分析ページの改善
- **商品選択機能**：分析対象の商品を選択できるUIを追加
- **商品選択バリデーション**：商品が選択されていない場合のエラーメッセージを改善

#### APIキー設定の拡張
- **SerpAPIキー入力欄**：APIキー設定ページにSerpAPIキーの入力欄を追加
- **Web検索APIキー状態表示**：SerpAPIとGoogle Custom Search APIの設定状態を表示

### Atlassian Design Systemの導入

すべてのUIコンポーネントをAtlassian Design Systemに置き換えました。

#### 置き換えられたコンポーネント
1. **api-key-management.tsx** - Button, TextField, Banner, Badgeを使用、API接続確認機能を追加
2. **product-management.tsx** - Table, Form, Button, Bannerを使用
3. **market-research.tsx** - Form, TextField, Select, Tag, Bannerを使用
4. **content-generation.tsx** - TextField, Textarea, Select, Button, Banner, Badge, Tag, Spinner, EmptyStateを使用、Instagram LPプレビュー機能を実装
5. **prompt-management.tsx** - TextField, Textarea, Button, Banner, Badge, Checkbox, Spinner, EmptyStateを使用
6. **sns-research.tsx** - TextField, Select, Button, Banner, Badge, Tag, Spinner, EmptyStateを使用
7. **strategy-management.tsx** - Select, Textarea, Button, Banner, Badge, Spinner, EmptyStateを使用
8. **strategy-analysis.tsx** - TextField, Checkbox, Button, Banner, Badge, Spinner, EmptyStateを使用
9. **workflow-management.tsx** - TextField, Button, Banner, Badge, Spinner, EmptyStateを使用

#### 共通ナビゲーションの実装
- `src/components/Navigation.tsx`を作成
- すべてのページで共通のナビゲーションバーを表示
- 現在のページをハイライト表示
- Atlassian Design SystemのButtonコンポーネントを使用

#### エラーハンドリングの改善
- `src/app/error.tsx` - エラーページコンポーネント
- `src/app/not-found.tsx` - 404ページコンポーネント

#### tRPC APIルートの設定
- `src/app/api/trpc/[trpc]/route.ts` - Next.js App Router用のtRPCルートハンドラーを作成

#### すべてのルートページの作成
以下のルートページを作成：
- `/market-research` → `src/app/market-research/page.tsx`
- `/sns-research` → `src/app/sns-research/page.tsx`
- `/strategy-analysis` → `src/app/strategy-analysis/page.tsx`
- `/strategy-management` → `src/app/strategy-management/page.tsx`
- `/content` → `src/app/content/page.tsx`
- `/workflow` → `src/app/workflow/page.tsx`
- `/api-key` → `src/app/api-key/page.tsx`

## 使用方法

### APIキーの設定

1. `/api-key`ページにアクセス
2. 各AIサービスのAPIキーを入力
3. 「APIキーを設定」ボタンをクリック
4. 「接続を確認」ボタンで接続をテスト
5. サーバーを再起動して変更を反映

### 市場調査の実行

1. `/market-research`ページにアクセス
2. 調査タイプを選択（トレンド分析、価格調査、競合調査）
3. 必要な情報を入力
   - **トレンド分析**：場所（必須）、期間（オプション）
   - **価格調査**：施術リスト（必須）、都市リスト（必須）、期間（オプション）
   - **競合調査**：場所（必須）、半径（オプション、デフォルト: 5km）
4. 「調査を開始」ボタンをクリック
5. 結果は「調査結果履歴」セクションに表示されます

### SNS調査の実行

1. `/sns-research`ページにアクセス
2. プラットフォームを選択（Twitter/X、Instagram、YouTube）
3. キーワードを入力（複数可）
4. 期間を選択（オプション、デフォルト: "last_month"）
5. 地域を入力（オプション、デフォルト: "unknown"）
6. 「調査を開始」ボタンをクリック
7. 結果は構造化形式（`<CONSENSUS_JSON>` + `<REPORT_MARKDOWN>`）で表示されます

### 戦略分析の実行

1. `/strategy-analysis`ページにアクセス
2. **総合分析**：
   - 場所を入力
   - 分析対象の商品を選択（複数可）
   - 市場データ/SNSデータを含めるか選択
   - 「総合分析を実行」ボタンをクリック
3. **価格設定提案**：
   - 「価格設定提案を生成」ボタンをクリック
   - 市場価格データが必要です
4. **キャンペーン案生成**：
   - 「キャンペーン案を生成」ボタンをクリック
   - 市場トレンドデータとSNSデータが必要です
5. **新施術導入提案**：
   - 「新施術提案を生成」ボタンをクリック
   - 商品データ、市場トレンドデータ、SNSトレンドデータが必要です
6. 結果は自動的にデータベースに保存され、`/strategy-management`ページで確認できます

### コンテンツ生成

1. `/content`ページにアクセス
2. コンテンツタイプを選択（Instagram LP、HP記事、キャンペーンコピー）
3. キャンペーン情報を入力
4. 「コンテンツを生成」ボタンをクリック
5. プレビューで結果を確認し、必要に応じて画像としてエクスポート

## 開発

### ビルド

```bash
npm run build
```

ビルド前に自動的に`prisma generate`が実行されます。

### 型チェック

```bash
npm run type-check
```

### データベースマイグレーション

```bash
# 開発環境
npx prisma migrate dev

# 本番環境
npx prisma migrate deploy
```

### Prismaクライアントの生成

```bash
npx prisma generate
```

`postinstall`スクリプトで自動的に実行されます。

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

1. **データの確認**：
   - 市場トレンドデータまたはSNSデータが存在するか確認
   - `/market-research`または`/sns-research`で調査を実行
2. **サーバーログの確認**：
   - コンソールにエラーメッセージが表示されていないか確認
   - プロンプト長、結果長のログを確認
3. **データベースの確認**：
   - `/strategy-management`ページで履歴を確認
   - データベースに保存されているか確認

### 内部サーバーエラーが発生する場合

1. **サーバーログの確認**：
   - コンソールに詳細なエラーメッセージが表示される
   - Claude APIレスポンス検証エラーの可能性を確認
2. **データ検証の確認**：
   - 必要なデータ（商品、市場トレンド、SNSデータ）が存在するか確認
   - 空のデータで実行していないか確認
3. **APIキーの確認**：
   - Claude APIキーが正しく設定されているか確認
   - APIキーの権限で利用可能なモデルを確認（`CLAUDE_MODEL`環境変数で指定可能）

## ライセンス

このプロジェクトのライセンス情報は、リポジトリのルートディレクトリにあるLICENSEファイルを参照してください。

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## サポート

問題が発生した場合は、GitHubのIssuesで報告してください。
