# 美容クリニックAI協調プラットフォーム

美容クリニック向けの戦略立案・素材生成を支援するAI協調システムです。複数のAIサービス（Gemini、Grok、Claude、ChatGPT）を連携させて、市場調査、SNS分析、戦略立案、コンテンツ生成などの業務を自動化します。

## 主な機能

### 1. 商品管理 (`/`)
- クリニックの施術・商品情報の管理
- 価格設定、説明文の編集
- 商品の追加・削除・更新

### 2. 市場調査 (`/market-research`)
- トレンド分析：指定地域の美容施術トレンドを調査
- 価格調査：複数都市での価格比較
- 競合調査：周辺地域の競合クリニック分析

### 3. SNS調査 (`/sns-research`)
- Twitter/X調査（Grok API使用）
- Instagram調査（Gemini API使用）
- YouTube調査（Gemini API使用）
- キーワードベースのトレンド分析

### 4. 戦略分析 (`/strategy-analysis`)
- 総合分析：市場データとSNSデータを統合分析
- 価格設定提案：市場価格データに基づく価格提案
- キャンペーン案生成：効果的な月次キャンペーン案の提案
- 新施術導入提案：市場トレンドに基づく新施術の提案

### 5. 戦略管理 (`/strategy-management`)
- 戦略提案の履歴管理
- フィードバックの記録
- 実装ステータスの管理
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
- APIキーの設定状態確認
- **API接続確認機能**：各AIサービスの接続テスト
- セキュアなAPIキー管理

### 9. プロンプト管理 (`/prompt`)
- 各AIサービスへの指示文（プロンプト）の管理
- プロンプトの編集・保存
- プロンプトの有効/無効切り替え
- AIエージェント別のプロンプト管理

## 技術スタック

### フロントエンド
- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
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

### バックエンド
- **tRPC** - 型安全なAPI通信
- **Prisma** - ORM
- **Zod** - スキーマバリデーション

### AIサービス統合
- **Google Gemini API** - 市場調査、SNS分析
- **Grok API (X/Twitter)** - Twitterトレンド分析
- **Anthropic Claude API** - 戦略分析
- **OpenAI ChatGPT API** - コンテンツ生成

### その他
- **SuperJSON** - データシリアライゼーション
- **React Query (TanStack Query)** - データフェッチング
- **html2canvas** - 画像エクスポート機能

## セットアップ

### 必要な環境
- Node.js 18以上
- npm または yarn
- PostgreSQL（データベース）

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
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# AI API Keys
GEMINI_API_KEY="your-gemini-api-key"
GROK_API_KEY="your-grok-api-key"
CLAUDE_API_KEY="your-claude-api-key"
OPENAI_API_KEY="your-openai-api-key"
```

### データベースのセットアップ

```bash
# Prismaマイグレーションの実行
npx prisma migrate dev

# Prismaクライアントの生成
npx prisma generate
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
│   │   └── workflow/           # ワークフロー管理
│   ├── server/                 # サーバーサイドコード
│   │   ├── api/                # tRPCルーター
│   │   │   ├── routers/       # 各機能のルーター
│   │   │   ├── root.ts        # ルートルーター
│   │   │   └── trpc.ts        # tRPC設定
│   │   ├── services/           # ビジネスロジック
│   │   │   ├── ai-health-check.ts  # AI接続確認
│   │   │   ├── gemini.ts      # Gemini API統合
│   │   │   ├── grok.ts        # Grok API統合
│   │   │   ├── claude.ts      # Claude API統合
│   │   │   ├── chatgpt.ts     # ChatGPT API統合
│   │   │   └── workflow-orchestrator.ts  # ワークフロー管理
│   │   └── db.ts              # Prismaクライアント
│   └── trpc/                   # tRPCクライアント設定
│       ├── provider.tsx        # tRPCプロバイダー
│       └── react.ts            # Reactフック
├── prisma/
│   └── schema.prisma          # データベーススキーマ
├── .env                        # 環境変数（.gitignoreに含まれる）
└── package.json               # 依存関係

```

## 主な変更履歴

### Atlassian Design Systemの導入

すべてのUIコンポーネントをAtlassian Design Systemに置き換えました。

#### 置き換えられたコンポーネント

1. **api-key-management.tsx**
   - Button, TextField, Banner, Badgeを使用
   - API接続確認機能を追加

2. **product-management.tsx**
   - Table, Form, Button, Bannerを使用

3. **market-research.tsx**
   - Form, TextField, Select, Tag, Bannerを使用
   - SelectコンポーネントのonChangeハンドラーを修正

4. **content-generation.tsx**
   - TextField, Textarea, Select, Button, Banner, Badge, Tag, Spinner, EmptyStateを使用
   - Instagram LPプレビュー機能を実装

5. **prompt-management.tsx**
   - TextField, Textarea, Button, Banner, Badge, Checkbox, Spinner, EmptyStateを使用

6. **sns-research.tsx**
   - TextField, Select, Button, Banner, Badge, Tag, Spinner, EmptyStateを使用
   - SelectコンポーネントのonChangeハンドラーを修正

7. **strategy-management.tsx**
   - Select, Textarea, Button, Banner, Badge, Spinner, EmptyStateを使用

8. **strategy-analysis.tsx**
   - TextField, Checkbox, Button, Banner, Badge, Spinner, EmptyStateを使用

9. **workflow-management.tsx**
   - TextField, Button, Banner, Badge, Spinner, EmptyStateを使用

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
4. 「調査を開始」ボタンをクリック
5. 結果は「調査結果履歴」セクションに表示されます

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

### モジュールが見つからないエラー

```bash
# 依存関係を再インストール
rm -rf node_modules .next
npm install
npm run dev
```

## ライセンス

このプロジェクトのライセンス情報は、リポジトリのルートディレクトリにあるLICENSEファイルを参照してください。

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## サポート

問題が発生した場合は、GitHubのIssuesで報告してください。

