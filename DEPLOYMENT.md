# Vercelデプロイメントガイド

このドキュメントでは、美容クリニックAI協調プラットフォームをVercelにデプロイする手順を説明します。

## 前提条件

- GitHubアカウント
- Vercelアカウント（[https://vercel.com/](https://vercel.com/)で作成）
- 本番環境用のMySQLデータベース（例：PlanetScale、Railway、AWS RDS等）
- 各AIサービスのAPIキー

## デプロイ手順

### 1. GitHubリポジトリの準備

1. プロジェクトをGitHubにプッシュ済みであることを確認
2. リポジトリが公開されているか、Vercelアカウントにアクセス権限があることを確認

### 2. Vercelプロジェクトの作成

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. 「Add New...」→「Project」をクリック
3. GitHubリポジトリを選択
4. プロジェクト名を設定（例：`ai-clinic-platform`）
5. Framework Preset: **Next.js** が自動検出されることを確認
6. Root Directory: `.`（デフォルト）
7. Build Command: `npm run build`（自動検出）
8. Output Directory: `.next`（自動検出）
9. Install Command: `npm install`（自動検出）

### 3. 環境変数の設定

プロジェクトの「Settings」→「Environment Variables」で以下を設定：

**方法1: Import .env機能を使用（推奨）**
1. `env.vercel.template`ファイルを開く
2. 実際のAPIキーとデータベース接続情報に置き換える
3. ファイル名を`.env`に変更（または内容をコピー）
4. Vercelダッシュボードの「Import .env」ボタンをクリック
5. `.env`ファイルを選択してインポート

**方法2: 手動で環境変数を追加**
以下の環境変数を1つずつ追加：

#### 必須環境変数

```env
# データベース接続（本番環境用）
DATABASE_URL="mysql://user:password@host:3306/database"

# Prisma設定
PRISMA_GENERATE_DATAPROXY="false"
```

#### AI API Keys（使用するサービスのみ設定）

```env
# Google Gemini API
GEMINI_API_KEY="your-gemini-api-key"

# Grok API (X/Twitter)
GROK_API_KEY="your-grok-api-key"

# Anthropic Claude API
CLAUDE_API_KEY="your-claude-api-key"
CLAUDE_MODEL="claude-3-5-sonnet"  # オプション

# OpenAI ChatGPT API
OPENAI_API_KEY="your-openai-api-key"

# Web検索API（いずれか1つ）
SERP_API_KEY="your-serp-api-key"
# または
GOOGLE_CUSTOM_SEARCH_API_KEY="your-google-custom-search-api-key"
GOOGLE_CUSTOM_SEARCH_ENGINE_ID="your-google-custom-search-engine-id"
```

#### 環境変数の適用範囲

- **Production**: 本番環境（`vercel.com`ドメイン）
- **Preview**: プレビュー環境（プルリクエストごと）
- **Development**: ローカル開発環境（`vercel dev`コマンド使用時）

**推奨**: すべての環境に適用するか、ProductionとPreviewのみに適用

### 4. データベースのセットアップ

#### 本番環境用データベースの準備

詳細な手順は`DATABASE_SETUP.md`を参照してください。

**簡単な手順（PlanetScaleの場合）**:

1. [PlanetScale](https://planetscale.com/)にアカウントを作成
2. 「Create database」をクリックしてデータベースを作成
3. 「Connect」→「Connect with Prisma」を選択
4. 表示された接続文字列をコピー（`DATABASE_URL`として使用）

**接続文字列の形式**:
```
mysql://ユーザー名:パスワード@ホスト:3306/データベース名?sslaccept=strict
```

**例**:
```env
DATABASE_URL=mysql://xxxxx:xxxxx@xxxxx.ap-northeast-1.aws.planetscale.com:3306/beautyclinic?sslaccept=strict
PRISMA_GENERATE_DATAPROXY=false
```

#### Prismaマイグレーションの実行

Vercelのビルド時に自動的に実行されますが、初回デプロイ前に手動で実行することも可能：

```bash
# ローカルで実行（本番データベースに接続）
npx prisma migrate deploy
# または
npx prisma db push
```

### 5. デプロイの実行

1. 「Deploy」ボタンをクリック
2. ビルドログを確認
3. デプロイが完了すると、自動的にURLが生成されます（例：`https://your-project.vercel.app`）

### 6. デプロイ後の確認

1. **アプリケーションの動作確認**
   - デプロイされたURLにアクセス
   - 各ページが正常に表示されるか確認

2. **APIエンドポイントの確認**
   - `/api/trpc`エンドポイントが正常に動作するか確認
   - ブラウザの開発者ツールでネットワークエラーがないか確認

3. **環境変数の確認**
   - Vercelダッシュボードの「Settings」→「Environment Variables」で設定が正しいか確認
   - ログで環境変数が正しく読み込まれているか確認

## トラブルシューティング

### ビルドエラー

#### Prismaクライアント生成エラー

```
Error: Prisma Client has not been generated yet
```

**解決策**:
- `package.json`の`postinstall`スクリプトが正しく設定されているか確認
- Vercelのビルドログで`prisma generate`が実行されているか確認

#### 環境変数が見つからない

```
Error: Environment variable not found
```

**解決策**:
- Vercelダッシュボードで環境変数が正しく設定されているか確認
- 環境変数名にタイポがないか確認
- 適用範囲（Production/Preview/Development）が正しいか確認

### データベース接続エラー

```
Error: Can't reach database server
```

**解決策**:
- `DATABASE_URL`が正しい形式か確認
- データベースプロバイダーのファイアウォール設定でVercelのIPアドレスを許可
- SSL接続が必要な場合は、`DATABASE_URL`に`?sslaccept=strict`を追加

### APIキーエラー

```
Error: API key is invalid
```

**解決策**:
- 各AIサービスのAPIキーが正しく設定されているか確認
- APIキーに余分なスペースや改行が含まれていないか確認
- APIキーの権限（使用可能なモデル、レート制限等）を確認

## 継続的デプロイ（CI/CD）

VercelはGitHubと連携して自動デプロイを設定できます：

1. **自動デプロイの設定**
   - `main`ブランチへのプッシュ → Production環境に自動デプロイ
   - プルリクエスト → Preview環境に自動デプロイ

2. **デプロイプレビュー**
   - 各プルリクエストごとに一意のURLが生成されます
   - プルリクエストのコメントに自動的にプレビューURLが追加されます

## カスタムドメインの設定

1. Vercelダッシュボードで「Settings」→「Domains」に移動
2. カスタムドメインを追加
3. DNS設定を更新（Vercelの指示に従う）

## パフォーマンス最適化

### Next.js設定

`next.config.js`で最適化設定を確認：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 必要に応じて設定を追加
}

module.exports = nextConfig
```

### 環境変数のセキュリティ

- **機密情報は環境変数で管理**: APIキーやデータベース接続文字列は環境変数に保存
- **環境変数の暗号化**: Vercelは環境変数を自動的に暗号化して保存
- **環境ごとの分離**: Production、Preview、Developmentで異なる環境変数を使用可能

## 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Prisma on Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)

## サポート

問題が発生した場合は、以下を確認してください：

1. Vercelのビルドログを確認
2. ブラウザのコンソールでエラーを確認
3. Vercelの[Status Page](https://www.vercel-status.com/)で障害情報を確認
4. GitHubのIssuesで問題を報告
