# Vercelデプロイクイックスタートガイド

## 🚀 5分でデプロイ完了！

### ステップ1: GitHubにコードをプッシュ

```bash
cd ai-clinic-platform

# Gitリポジトリの初期化（まだの場合）
git init
git add .
git commit -m "Initial commit"

# GitHubにリポジトリを作成してから
git remote add origin https://github.com/YOUR_USERNAME/ai-clinic-platform.git
git branch -M main
git push -u origin main
```

### ステップ2: PlanetScaleでデータベースを作成

1. [PlanetScale](https://planetscale.com)にアクセス（無料アカウント作成）
2. 「Create database」→ データベース名を入力 → 「Create」
3. 「Connect」をクリックして接続文字列をコピー
   - 例: `mysql://xxxxx:xxxxx@xxxxx.planetscale.com:3306/ai_clinic?sslaccept=strict`

### ステップ3: Vercelでプロジェクトを作成

1. [Vercel](https://vercel.com)にアクセス（GitHubアカウントでログイン）
2. 「Add New...」→「Project」
3. GitHubリポジトリを選択 → 「Import」

### ステップ4: 環境変数を設定

Vercelダッシュボードの「Environment Variables」で以下を追加：

| 変数名 | 値 |
|--------|-----|
| `DATABASE_URL` | PlanetScaleの接続文字列 |
| `GEMINI_API_KEY` | あなたのGemini APIキー |
| `GROK_API_KEY` | あなたのGrok APIキー |
| `CLAUDE_API_KEY` | あなたのClaude APIキー |
| `OPENAI_API_KEY` | あなたのOpenAI APIキー |

**重要**: 各環境変数の「Environment」で「Production」「Preview」「Development」をすべて選択してください。

### ステップ5: データベースマイグレーション

PlanetScaleダッシュボードで：
1. 「Branches」タブ → 「Create branch」（`main`という名前で）
2. 接続文字列をコピー

ローカルで実行：
```bash
# 環境変数を設定
export DATABASE_URL="mysql://xxxxx:xxxxx@xxxxx.planetscale.com:3306/ai_clinic?sslaccept=strict"

# マイグレーション実行
npx prisma migrate deploy

# または、スキーマを直接プッシュ
npx prisma db push
```

PlanetScaleダッシュボードで：
3. 「Deploy requests」タブ → 「Create deploy request」→ 「Deploy」

### ステップ6: デプロイ実行

Vercelダッシュボードで：
1. 「Deploy」ボタンをクリック
2. ビルドが完了するまで待機（2-3分）
3. デプロイ完了後、URLが表示されます！

## ✅ 完了！

デプロイが完了すると、以下のようなURLが表示されます：
`https://ai-clinic-platform-xxxxx.vercel.app`

## 🔄 今後の更新

GitHubにプッシュするだけで自動デプロイされます：
```bash
git add .
git commit -m "Update"
git push
```

## ⚠️ トラブルシューティング

### ビルドエラーが出る場合

1. Vercelダッシュボードの「Logs」を確認
2. 環境変数が正しく設定されているか確認
3. `DATABASE_URL`に`?sslaccept=strict`が含まれているか確認

### データベース接続エラー

1. PlanetScaleの接続文字列が正しいか確認
2. PlanetScaleダッシュボードでデータベースが作成されているか確認
3. Prismaマイグレーションが実行されているか確認

### Prisma Clientエラー

`package.json`に`postinstall`スクリプトが追加されているか確認：
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

## 📚 詳細な手順

より詳しい手順は `VERCEL_DEPLOYMENT.md` を参照してください。

