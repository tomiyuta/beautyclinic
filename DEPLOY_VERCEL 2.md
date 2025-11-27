# Vercel CLI デプロイ手順

## 方法1: Vercel CLIを使用（推奨）

### 1. Vercel CLIのインストール

```bash
npm install -g vercel
```

または、プロジェクトローカルにインストール：

```bash
cd "/Users/yutatomi/Desktop/beauty project"
npm install --save-dev vercel
```

### 2. Vercelにログイン

```bash
vercel login
```

ブラウザが開き、GitHubアカウントでログインします。

### 3. プロジェクトをリンク（初回のみ）

```bash
cd "/Users/yutatomi/Desktop/beauty project"
vercel link
```

既存のプロジェクトを選択するか、新規プロジェクトを作成します。
- Project name: `beautyclinic`
- Directory: `.` (現在のディレクトリ)

### 4. 環境変数の設定

```bash
vercel env add DATABASE_URL production
vercel env add OPENAI_API_KEY production
# その他の環境変数も同様に追加
```

または、Vercelダッシュボードから設定：
1. https://vercel.com/beautyai-fc10f037/beautyclinic/settings/environment-variables
2. 各環境変数を追加

### 5. デプロイ実行

**プレビューデプロイ（開発環境）:**
```bash
vercel
```

**本番環境へのデプロイ:**
```bash
vercel --prod
```

## 方法2: GitHub経由の自動デプロイ（現在の設定）

既にGitHubリポジトリとVercelが連携されている場合、GitHubにpushするだけで自動デプロイされます。

### 手順

1. 変更をコミット:
```bash
cd "/Users/yutatomi/Desktop/beauty project"
git add .
git commit -m "Update Acontext implementation"
```

2. GitHubにpush:
```bash
git push origin main
```

3. Vercelが自動的にデプロイを開始します

## デプロイ状況の確認

### Vercelダッシュボード
- https://vercel.com/beautyai-fc10f037/beautyclinic/deployments

### コマンドライン
```bash
vercel ls
```

## トラブルシューティング

### ビルドエラーが発生する場合

1. ローカルでビルドをテスト:
```bash
npm run build
```

2. エラーログを確認:
```bash
vercel logs
```

### 環境変数が反映されない場合

1. Vercelダッシュボードで環境変数を確認
2. 再デプロイを実行:
```bash
vercel --prod --force
```

## 現在のデプロイURL

- 本番環境: https://beautyclinic-eight.vercel.app
- プレビュー環境: 各デプロイごとに生成されるURL


