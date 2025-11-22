# クリマケ - 美容クリニック向けAI統合プラットフォーム

複数のAIエージェント（Gemini、Grok、Claude、ChatGPT）を協調させて、美容クリニックの経営戦略立案からコンテンツ生成までを支援する統合プラットフォームです。

## 📋 目次

- [概要](#概要)
- [主な機能](#主な機能)
- [技術スタック](#技術スタック)
- [プロジェクト構造](#プロジェクト構造)
- [セットアップ](#セットアップ)
- [使用方法](#使用方法)
- [開発ガイド](#開発ガイド)
- [デプロイ](#デプロイ)
- [ライセンス](#ライセンス)

---

## 概要

### システムの特徴

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

## 主な機能

### 1. 商品管理 (`/`)
- クリニックの施術・商品情報の管理
- 価格設定、説明文の編集
- 商品の追加・削除・更新

### 2. 市場調査 (`/market-research`)
- **トレンド分析**: 美容施術の市場トレンドを調査
- **価格調査**: 複数都市×複数施術の価格相場を比較
- **競合調査**: 周辺エリアの競合クリニックを分析

### 3. SNS調査 (`/sns-research`)
- **Twitter/X調査**: Grokを使用してX上のトレンドを分析
- **Instagram調査**: Geminiを使用してInstagramのトレンドを分析
- **YouTube調査**: Geminiを使用してYouTubeのトレンドを分析

### 4. 戦略分析 (`/strategy-analysis`)
- **総合分析**: 市場データとSNSデータを統合して総合的な戦略を提案
- **価格設定提案**: 市場価格データに基づく価格調整の提案
- **キャンペーン案生成**: トレンドに基づくキャンペーン案の生成
- **新施術導入提案**: 未導入の有望施術の提案（投資対効果含む）
- **AI選択機能**: ClaudeまたはChatGPTを選択可能

### 5. コンテンツ生成 (`/content`)
- **テキストコンテンツ**: Instagram投稿、ブログ記事、LPテキスト
- **画像コンテンツ**: DALL·E 3を使用した画像生成（Instagram正方形、LPバナー）
- **動画コンテンツ**: 
  - 短尺動画（Pika Labs）: Instagram Reels, TikTok, YouTube Shorts
  - 説明動画（Synthesia）: 施術説明、事前/アフターケア、FAQ
- **コンプライアンスチェック**: リアルタイムで医療広告ガイドライン違反をチェック
- **テンプレート機能**: よく使う設定をテンプレートとして保存・再利用
- **バッチ生成**: CSVファイルから複数のキャンペーンを一括生成

### 6. 戦略管理 (`/strategy-management`)
- 戦略提案の履歴管理
- フィードバックの記録
- 実装ステータスの管理
- 戦略書のエクスポート（JSON、テキスト、PDF、Excel形式）

### 7. ワークフロー管理 (`/workflow`)
- AIエージェント間の協調動作管理
- 統合分析ワークフローの実行
- AIエージェントのヘルスチェック

### 8. APIキー設定 (`/api-key`)
- Gemini、Grok、Claude、OpenAIのAPIキー設定
- Web検索APIキー設定（SerpAPIまたはGoogle Custom Search API）
- API接続確認機能

### 9. プロンプト管理 (`/prompt`)
- 各AIエージェント用のプロンプトテンプレート管理
- プロンプトの編集・有効/無効切り替え

---

## 技術スタック

### フロントエンド
- **Next.js 13.5.6**: App Routerを使用したReactフレームワーク
- **React 18.2.0**: UIライブラリ
- **TypeScript 5**: 型安全性
- **Atlassian Design System**: UIコンポーネントライブラリ
- **@tanstack/react-query**: データフェッチング・キャッシュ管理
- **@trpc/react-query**: tRPCクライアント

### バックエンド
- **tRPC 11.7.1**: 型安全なAPI層
- **Prisma 6.18.0**: ORM（MySQL）
- **Zod 4.1.12**: スキーマバリデーション
- **superjson 2.2.5**: JSONシリアライゼーション

### AI統合
- **OpenAI SDK 6.7.0**: ChatGPT (GPT-5.1/GPT-4o) + DALL·E 3
- **@anthropic-ai/sdk 0.68.0**: Claude (Claude Opus 4.1 / Sonnet 4.5)
- **@google/generative-ai 0.24.1**: Gemini (Gemini 2.5 Pro/Flash)
- **axios 1.13.1**: Grok API統合
- **@fal-ai/client 1.7.2**: Pika Labs API統合（動画生成）
- **Synthesia API**: 説明動画生成

### その他
- **html2canvas 1.4.1**: フロントエンド画像エクスポート
- **jspdf 3.0.3**: PDF生成
- **exceljs 4.4.0**: Excelエクスポート

### データベース
- **MySQL**: リレーショナルデータベース
- **Prisma Client**: 型安全なデータベースアクセス

---

## プロジェクト構造

```
beauty project/
├── src/                          # ソースコード
│   ├── app/                      # Next.js App Router
│   │   ├── api/trpc/             # tRPCエンドポイント
│   │   ├── api-key/               # APIキー管理ページ
│   │   ├── content/               # コンテンツ生成ページ
│   │   ├── market-research/       # 市場調査ページ
│   │   ├── prompt/                # プロンプト管理ページ
│   │   ├── sns-research/          # SNS調査ページ
│   │   ├── strategy-analysis/     # 戦略分析ページ
│   │   ├── strategy-management/   # 戦略管理ページ
│   │   └── workflow/              # ワークフローページ
│   ├── components/                # 共通コンポーネント
│   ├── features/                  # 機能別モジュール
│   │   ├── api-key/               # APIキー管理機能
│   │   ├── content/               # コンテンツ生成機能（リファクタリング済み）
│   │   │   ├── components/        # コンポーネント（7ファイル）
│   │   │   ├── constants/         # 定数定義
│   │   │   ├── hooks/             # カスタムフック（4ファイル）
│   │   │   └── content-generation.tsx
│   │   ├── market-research/       # 市場調査機能
│   │   ├── products/              # 商品管理機能
│   │   ├── prompt/                # プロンプト管理機能
│   │   ├── sns-research/          # SNS調査機能
│   │   ├── strategy/              # 戦略機能
│   │   └── workflow/              # ワークフロー機能
│   ├── generated/prisma/          # Prisma生成ファイル
│   ├── server/                    # サーバーサイドコード
│   │   ├── api/                   # APIルーター
│   │   │   ├── routers/           # tRPCルーター（用途別に分割）
│   │   │   │   ├── content.ts     # 統合ルーター
│   │   │   │   ├── content-text.ts
│   │   │   │   ├── content-image.ts
│   │   │   │   ├── content-video.ts
│   │   │   │   ├── content-template.ts
│   │   │   │   ├── content-batch.ts
│   │   │   │   └── ...（その他）
│   │   │   ├── schemas/           # Zodスキーマ
│   │   │   └── utils/             # ユーティリティ
│   │   ├── services/              # ビジネスロジック
│   │   │   ├── chatgpt.ts
│   │   │   ├── claude.ts
│   │   │   ├── gemini.ts
│   │   │   ├── grok.ts
│   │   │   ├── image-generation.ts
│   │   │   ├── video-generation.ts
│   │   │   └── ...（その他）
│   │   └── utils/                 # サーバーユーティリティ
│   └── trpc/                      # tRPCクライアント設定
├── prisma/                        # データベーススキーマ
│   ├── migrations/                # マイグレーションファイル
│   └── schema.prisma              # Prismaスキーマ
├── docs/                          # ドキュメント（整理済み）
│   ├── archive/                   # アーカイブ
│   ├── api/                       # APIドキュメント
│   ├── deployment/                # デプロイドキュメント
│   ├── features/                  # 機能ドキュメント
│   └── implementation/            # 実装ドキュメント
├── scripts/                       # スクリプト
└── tests/                         # テストディレクトリ（準備済み）
```

詳細は `PROJECT_STRUCTURE.md` を参照してください。

---

## セットアップ

### 前提条件

- Node.js 18以上
- MySQL 8.0以上
- npm または yarn

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd beauty-project
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

# 動画生成APIキー
FAL_KEY="your_fal_key"                    # Pika Labs（優先）
PIKA_LABS_API_KEY="your_pika_api_key"     # Pika Labs（フォールバック）
SYNTHESIA_API_KEY="your_synthesia_api_key"

# Web検索API（オプション）
SERP_API_KEY="your_serp_api_key"
GOOGLE_CUSTOM_SEARCH_API_KEY="your_google_custom_search_api_key"
GOOGLE_CUSTOM_SEARCH_ENGINE_ID="your_engine_id"

# AIモデル設定（オプション）
GEMINI_MODEL="gemini-2.5-pro"
CLAUDE_MODEL="claude-opus-4-1"
OPENAI_MODEL="gpt-5.1"
GROK_MODEL="grok-4"
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

### 2. 商品管理

1. `/`ページにアクセス
2. 「商品を追加」ボタンで商品を登録
3. 原価・販売価格・説明文を入力

### 3. 市場調査の実行

1. `/market-research`ページにアクセス
2. 調査タイプを選択（トレンド分析、価格調査、競合調査）
3. 必要なパラメータを入力
4. 「調査を開始」ボタンをクリック

### 4. SNS調査の実行

1. `/sns-research`ページにアクセス
2. プラットフォームを選択（Twitter/X、Instagram、YouTube）
3. キーワードを入力
4. 「調査を開始」ボタンをクリック

### 5. 戦略分析の実行

1. `/strategy-analysis`ページにアクセス
2. ページヘッダーの「AI」ドロップダウンから、ClaudeまたはChatGPTを選択
3. 分析タイプを選択（総合分析、価格設定提案、キャンペーン案生成、新施術導入提案）
4. 必要な情報を入力
5. 分析を実行

### 6. コンテンツ生成

1. `/content`ページにアクセス
2. コンテンツカテゴリを選択（テキスト、画像、動画）
3. コンテンツタイプを選択
4. キャンペーン情報を入力
5. オプション設定（トーン、画像スタイル、動画設定など）
6. 「コンテンツを生成」ボタンをクリック
7. プレビューで結果を確認

---

## 開発ガイド

### コードスタイル

- **TypeScript**: 厳格な型チェックを有効化
- **ESLint**: Next.jsのデフォルト設定を使用

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

### 主要な設計パターン

1. **コンポーネントのモジュール化**: 機能別にコンポーネントを分割
2. **カスタムフック**: ロジックをフックに分離（`useContentGenerationFormState`など）
3. **tRPCルーターの用途別分割**: 大きなルーターを用途別に分割（`content-text.ts`、`content-image.ts`など）
4. **スキーマの集約**: Zodスキーマを`schemas/`ディレクトリに集約

---

## デプロイ

### Vercel

詳細は `DEPLOYMENT.md` を参照してください。

```bash
# Vercel CLIを使用
vercel deploy
```

### その他のプラットフォーム

- **Docker**: `Dockerfile`を使用
- **AWS Amplify**: `amplify.yml`を使用
- **GCP App Engine**: `app.yaml`を使用

---

## AIエージェントの役割分担

### Gemini（Google）
- **担当**: 市場調査、SNS調査（Instagram、YouTube）
- **モデル**: Gemini 2.5 Pro / Flash（最新版を優先）

### Grok（xAI）
- **担当**: SNS調査（X/Twitter）
- **モデル**: Grok-4（最新版を優先）

### Claude（Anthropic）
- **担当**: 戦略統合分析、価格設定提案、キャンペーン案生成、新施術導入提案
- **モデル**: 
  - 総合分析・新規導入提案: Claude Opus 4.1（最高性能）
  - 価格設定提案・キャンペーン案: Claude Sonnet 4.5（高性能・コスト効率重視）

### ChatGPT（OpenAI）
- **担当**: コンテンツ生成（テキスト、画像）
- **モデル**: GPT-5.1 / GPT-4o（最新版を優先）
- **画像生成**: DALL·E 3

### Pika Labs（動画生成）
- **担当**: 短尺動画生成（Instagram Reels, TikTok, YouTube Shorts）
- **API**: fal-ai経由でPika 2.2モデルにアクセス

### Synthesia（動画生成）
- **担当**: 説明動画生成（施術説明、事前/アフターケア、FAQ）

---

## 医療広告ガイドライン対応

### 禁止表現リスト

以下の表現は自動的に検出・修正されます：

- 断定表現: "完全に治る"、"必ず治る"、"絶対に治る"
- 比較優良誤認: "No.1"、"一番"、"最高"、"最強"
- 誇大表現: "革命的な"、"驚異的な"、"奇跡的な"
- 即効性の強調: "即効性"、"即座に"、"すぐに治る"
- 副作用・リスクの否定: "副作用なし"、"リスクなし"

### 自動修正機能

禁止表現は自動的に適切な表現に置換されます。

### 注意書きの自動付与

以下の注意書きが自動的に付与されます：

- "※効果には個人差があります"
- "※施術内容により、効果の程度や持続期間は異なります"
- "※事前のカウンセリングで、ご希望やご予算に合わせた最適なプランをご提案いたします"

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

## 関連ドキュメント

- `REQUIREMENTS_DOCUMENT.md` - 要件定義書
- `DEPLOYMENT.md` - デプロイ手順
- `DATABASE_SETUP.md` - データベースセットアップ
- `CHANGELOG_RECENT.md` - 最近の変更履歴
- `PROJECT_STRUCTURE.md` - プロジェクト構造の詳細
- `docs/` - その他のドキュメント

---

## 主な変更履歴

### 2025年11月22日 - リファクタリングとクリーンアップ

#### リファクタリング
- **コンテンツ生成機能のモジュール化**: コンポーネント、フック、定数を分離
- **tRPCルーターの用途別分割**: `content.ts`を`content-text.ts`、`content-image.ts`、`content-video.ts`などに分割
- **スキーマとユーティリティの集約**: Zodスキーマとユーティリティ関数を別ファイルに分離

#### クリーンアップ
- **ドキュメントの整理**: ルートディレクトリのドキュメントを`docs/`にカテゴリ別に整理
- **重複ファイルの削除**: 23個の重複ドキュメントを削除
- **一時ファイルの削除**: `.DS_Store`、`tsconfig.tsbuildinfo`などを削除

### 2025年11月22日 - 動画生成機能とUI改善

#### 動画生成機能の実装
- **Pika Labs API統合（fal-ai経由）**: Instagram Reels, TikTok, YouTube Shorts対応
- **Synthesia API統合**: 施術説明動画、事前/アフターケア動画、FAQ動画の生成

#### コンテンツ生成UIの改善
- **使用AI表示の動的更新**: コンテンツタイプ変更時に再計算
- **コンテンツ履歴表示の改善**: 動画・画像の適切な表示とダウンロード機能

詳細は `CHANGELOG_RECENT.md` を参照してください。
