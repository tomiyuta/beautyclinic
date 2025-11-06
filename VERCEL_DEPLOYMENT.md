# Vercelデプロイガイド

このガイドでは、美容クリニックAI協調プラットフォームをVercelにデプロイする手順を説明します。

## 前提条件

- GitHubアカウント
- Vercelアカウント（[vercel.com](https://vercel.com)で無料作成可能）
- クラウドMySQLデータベース（PlanetScale推奨）

## ステップ1: GitHubリポジトリの準備

### 1.1 Gitリポジトリの初期化（まだの場合）

```bash
cd ai-clinic-platform
git init
git add .
git commit -m "Initial commit for Vercel deployment"
```

### 1.2 GitHubにリポジトリを作成

1. [GitHub](https://github.com)にログイン
2. 「New repository」をクリック
3. リポジトリ名を入力（例: `ai-clinic-platform`）
4. 「Create repository」をクリック

### 1.3 コードをプッシュ

```bash
git remote add origin https://github.com/YOUR_USERNAME/ai-clinic-platform.git
git branch -M main
git push -u origin main
```

## ステップ2: データベースのセットアップ（PlanetScale推奨）

Vercelはサーバーレス環境のため、外部のMySQLデータベースが必要です。

### PlanetScaleのセットアップ

1. [PlanetScale](https://planetscale.com)にアクセスしてアカウント作成
2. 「Create database」をクリック
3. データベース名を入力（例: `ai-clinic`）
4. リージョンを選択（`ap-northeast-1`推奨）
5. 「Create database」をクリック
6. 「Connect」をクリックして接続文字列をコピー

接続文字列の例：
```
mysql://USERNAME:PASSWORD@HOST.planetscale.com:3306/DATABASE?sslaccept=strict
```

## ステップ3: Vercelプロジェクトの作成

### 3.1 Vercelアカウントでログイン

1. [Vercel](https://vercel.com)にアクセス
2. 「Sign Up」または「Log In」
3. GitHubアカウントでログイン（推奨）

### 3.2 プロジェクトのインポート

1. Vercelダッシュボードで「Add New...」→「Project」をクリック
2. GitHubリポジトリを選択
3. 「Import」をクリック

### 3.3 プロジェクト設定

- **Framework Preset**: Next.js（自動検出）
- **Root Directory**: `./`（デフォルト）
- **Build Command**: `npm run build`（自動検出）
- **Output Directory**: `.next`（自動検出）
- **Install Command**: `npm install`（自動検出）

## ステップ4: 環境変数の設定

Vercelダッシュボードの「Environment Variables」セクションで以下を設定：

### 必須環境変数

```
DATABASE_URL=mysql://USERNAME:PASSWORD@HOST.planetscale.com:3306/DATABASE?sslaccept=strict
GEMINI_API_KEY=your-gemini-api-key
GROK_API_KEY=your-grok-api-key
CLAUDE_API_KEY=your-claude-api-key
OPENAI_API_KEY=your-openai-api-key
```

### オプション環境変数

```
GEMINI_MODEL=gemini-1.5-flash-latest
GROK_MODEL=grok-3
CLAUDE_MODEL=claude-3-5-sonnet
```

**重要**: 
- 環境変数は「Production」「Preview」「Development」の3つの環境で設定できます
- 本番環境用は「Production」に設定してください

## ステップ5: データベースマイグレーション

### 5.1 PlanetScaleでブランチを作成

PlanetScaleダッシュボードで：
1. 「Branches」タブをクリック
2. 「Create branch」をクリック
3. ブランチ名を入力（例: `main`）

### 5.2 ローカルでマイグレーション実行

```bash
# 接続文字列を更新（PlanetScaleの接続文字列に変更）
export DATABASE_URL="mysql://USERNAME:PASSWORD@HOST.planetscale.com:3306/DATABASE?sslaccept=strict"

# Prismaマイグレーション
npx prisma migrate deploy

# または、スキーマを直接プッシュ（開発環境）
npx prisma db push
```

### 5.3 PlanetScaleでデプロイリクエストを作成

1. PlanetScaleダッシュボードで「Deploy requests」タブ
2. 「Create deploy request」をクリック
3. 変更を確認して「Deploy」をクリック

## ステップ6: デプロイの実行

### 6.1 初回デプロイ

Vercelダッシュボードで：
1. 「Deploy」ボタンをクリック
2. ビルドログを確認
3. デプロイが完了するとURLが表示されます

### 6.2 自動デプロイの設定

- GitHubにプッシュするたびに自動デプロイされます
- プルリクエストごとにプレビュー環境が作成されます

## ステップ7: カスタムドメインの設定（オプション）

1. Vercelダッシュボードで「Settings」→「Domains」
2. ドメイン名を入力
3. DNS設定を更新（指示に従って）

## トラブルシューティング

### ビルドエラー

**エラー**: `Prisma Client not generated`

**解決策**:
```bash
# package.jsonのbuildスクリプトを確認
# postinstallスクリプトを追加（推奨）
```

`package.json`に以下を追加：
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### データベース接続エラー

**エラー**: `Can't reach database server`

**解決策**:
1. `DATABASE_URL`が正しいか確認
2. PlanetScaleの接続文字列に`?sslaccept=strict`が含まれているか確認
3. PlanetScaleダッシュボードで接続が有効か確認

### 環境変数が読み込まれない

**解決策**:
1. Vercelダッシュボードで環境変数が正しく設定されているか確認
2. 環境変数名にタイポがないか確認
3. 「Redeploy」を実行して再デプロイ

### Prismaマイグレーションエラー

**解決策**:
```bash
# Vercelの環境変数を使用してローカルでテスト
vercel env pull .env.local

# マイグレーションを実行
npx prisma migrate deploy
```

## パフォーマンス最適化

### 1. Edge Functionsの使用（オプション）

APIルートをEdge Functionsに移行することで、レスポンス時間を短縮できます。

### 2. 画像最適化

Next.jsのImageコンポーネントを使用している場合は、自動的に最適化されます。

### 3. キャッシング

Vercelは自動的に静的アセットをキャッシュします。

## コスト

### Vercel無料プラン

- 100GB帯域幅/月
- 100時間のビルド時間/月
- 無制限のデプロイ
- 無制限のプレビューデプロイ

### PlanetScale無料プラン

- 5GBストレージ
- 1億行読み取り/月
- 1ブランチ

## 次のステップ

デプロイが完了したら：

1. アプリケーションの動作確認
2. エラーログの監視（Vercelダッシュボードの「Logs」）
3. パフォーマンスの監視（Vercel Analytics）
4. カスタムドメインの設定

## サポート

問題が発生した場合：
- Vercelドキュメント: https://vercel.com/docs
- PlanetScaleドキュメント: https://planetscale.com/docs
- GitHub Issuesで報告

