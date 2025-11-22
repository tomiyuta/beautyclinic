# プロジェクト構造

## 📁 ルートディレクトリ

### 主要ドキュメント
- `README.md` - プロジェクト概要
- `REQUIREMENTS_DOCUMENT.md` - 要件定義書
- `DEPLOYMENT.md` - デプロイ手順
- `DATABASE_SETUP.md` - データベースセットアップ
- `CHANGELOG_RECENT.md` - 最近の変更履歴
- `FILE_CLASSIFICATION.md` - ファイル分類レポート
- `CLEANUP_SUMMARY.md` - クリーンアップサマリー
- `PROJECT_STRUCTURE.md` - このファイル

### 設定ファイル
- `package.json` - 依存関係とスクリプト
- `package-lock.json` - 依存関係ロック
- `tsconfig.json` - TypeScript設定
- `next.config.js` - Next.js設定
- `next-env.d.ts` - Next.js型定義
- `vercel.json` - Vercelデプロイ設定
- `.gitignore` - Git除外設定
- `.npmrc` - npm設定

### デプロイ設定
- `Dockerfile` - Docker設定
- `amplify.yml` - AWS Amplify設定
- `app.yaml` - GCP App Engine設定
- `vercel.env` - Vercel環境変数
- `env.vercel.template` - Vercel環境変数テンプレート

### スクリプト
- `execute_migration.sh` - マイグレーション実行
- `extract_prompts.js` - プロンプト抽出
- `cleanup-unnecessary-files.sh` - クリーンアップスクリプト

---

## 📂 ディレクトリ構造

```
beauty project/
├── src/                          # ソースコード
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # APIルート
│   │   │   └── trpc/             # tRPCエンドポイント
│   │   ├── api-key/              # APIキー管理ページ
│   │   ├── content/              # コンテンツ生成ページ
│   │   ├── market-research/       # 市場調査ページ
│   │   ├── prompt/               # プロンプト管理ページ
│   │   ├── sns-research/         # SNS調査ページ
│   │   ├── strategy-analysis/   # 戦略分析ページ
│   │   ├── strategy-management/ # 戦略管理ページ
│   │   └── workflow/             # ワークフローページ
│   ├── components/               # 共通コンポーネント
│   ├── features/                 # 機能別モジュール
│   │   ├── api-key/              # APIキー管理機能
│   │   ├── content/               # コンテンツ生成機能
│   │   │   ├── components/        # コンテンツ生成コンポーネント
│   │   │   │   ├── CampaignInfoFields.tsx
│   │   │   │   ├── ContentCategorySelector.tsx
│   │   │   │   ├── ContentTypeSelector.tsx
│   │   │   │   ├── ImageContentForm.tsx
│   │   │   │   ├── TemplateSelector.tsx
│   │   │   │   ├── TextContentForm.tsx
│   │   │   │   └── VideoContentForm.tsx
│   │   │   ├── constants/         # 定数定義
│   │   │   │   └── content-type-options.ts
│   │   │   ├── hooks/             # カスタムフック
│   │   │   │   ├── useContentFormHandlers.ts
│   │   │   │   ├── useContentGenerationFormState.ts
│   │   │   │   ├── useContentMutations.ts
│   │   │   │   └── useContentSubmit.ts
│   │   │   ├── content-generation.tsx  # メインコンポーネント
│   │   │   └── content-generator.tsx
│   │   ├── market-research/       # 市場調査機能
│   │   ├── products/              # 商品管理機能
│   │   ├── prompt/                # プロンプト管理機能
│   │   ├── sns-research/          # SNS調査機能
│   │   ├── strategy/              # 戦略機能
│   │   └── workflow/              # ワークフロー機能
│   ├── generated/                 # 自動生成ファイル
│   │   └── prisma/                # Prisma生成ファイル
│   ├── server/                    # サーバーサイドコード
│   │   ├── api/                   # APIルーター
│   │   │   ├── routers/           # tRPCルーター
│   │   │   │   ├── api-key.ts
│   │   │   │   ├── content.ts      # 統合ルーター
│   │   │   │   ├── content-batch.ts
│   │   │   │   ├── content-image.ts
│   │   │   │   ├── content-template.ts
│   │   │   │   ├── content-text.ts
│   │   │   │   ├── content-video.ts
│   │   │   │   ├── market-research.ts
│   │   │   │   ├── product.ts
│   │   │   │   ├── prompt.ts
│   │   │   │   ├── sns-research.ts
│   │   │   │   ├── strategy-management.ts
│   │   │   │   ├── strategy.ts
│   │   │   │   └── workflow.ts
│   │   │   ├── schemas/           # Zodスキーマ
│   │   │   │   └── content.ts
│   │   │   ├── utils/             # ユーティリティ
│   │   │   │   └── generated-content.ts
│   │   │   ├── root.ts            # ルートルーター
│   │   │   └── trpc.ts            # tRPC設定
│   │   ├── services/              # ビジネスロジック
│   │   │   ├── ai-health-check.ts
│   │   │   ├── chatgpt.ts
│   │   │   ├── claude.ts
│   │   │   ├── error-logger.ts
│   │   │   ├── gemini.ts
│   │   │   ├── grok.ts
│   │   │   ├── image-generation.ts
│   │   │   ├── prompt-helper.ts
│   │   │   ├── utils/             # サービスユーティリティ
│   │   │   │   └── video-retry.ts
│   │   │   ├── video-generation.ts
│   │   │   ├── web-search.ts
│   │   │   └── workflow-orchestrator.ts
│   │   └── utils/                 # サーバーユーティリティ
│   │       └── advertising-guidelines.ts
│   └── trpc/                      # tRPCクライアント設定
│       └── react.ts
│
├── prisma/                        # データベーススキーマ
│   ├── migrations/                # マイグレーションファイル
│   └── schema.prisma              # Prismaスキーマ
│
├── docs/                          # ドキュメント（整理済み）
│   ├── archive/                    # アーカイブ（21ファイル）
│   ├── api/                       # APIドキュメント（7ファイル）
│   ├── deployment/                # デプロイドキュメント（10ファイル）
│   ├── features/                  # 機能ドキュメント（1ファイル）
│   ├── implementation/            # 実装ドキュメント（10ファイル）
│   └── README.md                  # ドキュメント説明
│
├── scripts/                       # スクリプト
│   └── update-prompts-to-text.ts
│
└── tests/                         # テストディレクトリ（準備済み）

```

---

## 📊 主要ファイル統計

### ソースコード
- **src/features/content/**: リファクタリング済み
  - コンポーネント: 7ファイル
  - フック: 4ファイル
  - 定数: 1ファイル
  - メインコンポーネント: 2ファイル

### サーバーAPI
- **src/server/api/routers/**: 用途別に分割
  - コンテンツ関連: 6ファイル（text, image, video, template, batch, 統合）
  - その他: 8ファイル

### ドキュメント
- **ルート**: 8ファイル（主要ドキュメントのみ）
- **docs/**: 49ファイル（カテゴリ別に整理）

---

## 🎯 主要な変更点（リファクタリング後）

1. **コンテンツ生成機能のモジュール化**
   - フォームコンポーネントを分割
   - カスタムフックでロジックを分離
   - 定数を別ファイルに集約

2. **tRPCルーターの用途別分割**
   - content.ts → content-text.ts, content-image.ts, content-video.ts など
   - スキーマとユーティリティを分離

3. **ドキュメントの整理**
   - ルートディレクトリをクリーンアップ
   - カテゴリ別にdocs/に整理

---

## 📝 ファイル命名規則

- **コンポーネント**: `PascalCase.tsx`
- **フック**: `use*.ts`
- **ユーティリティ**: `kebab-case.ts`
- **ルーター**: `kebab-case.ts`
- **スキーマ**: `kebab-case.ts`
- **ドキュメント**: `UPPER_SNAKE_CASE.md`

