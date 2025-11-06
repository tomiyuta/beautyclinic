# Vercelデプロイ完全ガイド

## 🎯 現在の状態

✅ GitHubにコードがプッシュ済み  
✅ Vercel設定ファイル（vercel.json）が準備済み  
⚠️ **Vercelダッシュボードで環境変数の設定が必要**

---

## 📋 デプロイ手順（ステップバイステップ）

### ステップ1: Vercelアカウントの準備

1. [Vercel](https://vercel.com)にアクセス
2. 「Sign Up」または「Log In」をクリック
3. **GitHubアカウントでログイン**（推奨）

---

### ステップ2: プロジェクトのインポート

1. Vercelダッシュボードで「Add New...」→「Project」をクリック
2. 「Import Git Repository」を選択
3. GitHubリポジトリ `tomiyuta/ai-clinic-platform` を選択
4. 「Import」をクリック

---

### ステップ3: プロジェクト設定（自動検出されるはず）

以下の設定が自動的に検出されます：
- **Framework Preset**: Next.js ✅
- **Root Directory**: `./` ✅
- **Build Command**: `npm run build` ✅
- **Output Directory**: `.next` ✅
- **Install Command**: `npm install --ignore-scripts` ✅

**変更不要**のまま「Continue」をクリック

---

### ステップ4: 環境変数の設定（重要！）

**⚠️ このステップをスキップするとビルドエラーになります**

「Environment Variables」セクションで以下を追加：

#### 必須環境変数（ビルド用）

| 変数名 | 値 | 環境 |
|--------|-----|------|
| `DATABASE_URL` | `mysql://dummy:dummy@localhost:3306/dummy` | ✅ Production<br>✅ Preview<br>✅ Development |

**重要**: `DATABASE_URL`はビルド時に必要です。ダミー値で問題ありません。

#### 本番環境用（後で設定）

以下のAPIキーは後で設定できますが、今設定してもOKです：

| 変数名 | 値 | 環境 |
|--------|-----|------|
| `GEMINI_API_KEY` | あなたのGemini APIキー | ✅ Production |
| `GROK_API_KEY` | あなたのGrok APIキー | ✅ Production |
| `CLAUDE_API_KEY` | あなたのClaude APIキー | ✅ Production |
| `OPENAI_API_KEY` | あなたのOpenAI APIキー | ✅ Production |

**設定方法:**
1. 「Add」ボタンをクリック
2. 変数名を入力
3. 値を入力
4. 環境を選択（チェックボックス）
5. 「Save」をクリック

---

### ステップ5: デプロイ実行

1. 「Deploy」ボタンをクリック
2. ビルドログを確認（2-3分かかります）
3. デプロイが完了するとURLが表示されます！

**デプロイURL例**: `https://ai-clinic-platform-xxxxx.vercel.app`

---

## ✅ デプロイ後の確認

### 1. アプリケーションが動作しているか確認

デプロイURLにアクセスして、アプリケーションが表示されるか確認してください。

### 2. エラーの確認

- Vercelダッシュボードの「Logs」タブでエラーを確認
- ブラウザのコンソールでエラーを確認

---

## 🔧 トラブルシューティング

### エラー: `DATABASE_URL`が見つからない

**解決方法:**
1. Vercelダッシュボードの「Settings」→「Environment Variables」を確認
2. `DATABASE_URL`が設定されているか確認
3. すべての環境（Production/Preview/Development）にチェックが入っているか確認
4. 「Redeploy」を実行

### エラー: Prisma Clientが見つからない

**解決方法:**
- ビルドログで`prisma generate`が実行されているか確認
- `DATABASE_URL`が設定されていれば自動的に実行されます

### エラー: APIキーが見つからない

**解決方法:**
- 本番環境でAPI機能を使う場合は、環境変数を設定してください
- 開発中は設定しなくてもアプリケーションは起動します

---

## 🗄️ データベースのセットアップ（後で実行）

### PlanetScaleでデータベースを作成

1. [PlanetScale](https://planetscale.com)にアクセス（無料アカウント作成）
2. 「Create database」をクリック
3. データベース名を入力（例: `ai-clinic`）
4. リージョンを選択（`ap-northeast-1`推奨）
5. 「Create database」をクリック
6. 「Connect」をクリックして接続文字列をコピー

### 接続文字列の形式

```
mysql://USERNAME:PASSWORD@HOST.planetscale.com:3306/DATABASE?sslaccept=strict
```

### VercelでデータベースURLを更新

1. Vercelダッシュボードの「Settings」→「Environment Variables」
2. `DATABASE_URL`を編集
3. PlanetScaleの接続文字列に変更
4. **環境**: Productionのみにチェック（本番環境のみ）
5. 「Save」をクリック
6. 「Redeploy」を実行

### データベースマイグレーション

```bash
# ローカルで実行
export DATABASE_URL="mysql://USERNAME:PASSWORD@HOST.planetscale.com:3306/DATABASE?sslaccept=strict"
npx prisma migrate deploy
```

---

## 🚀 今後の更新

GitHubにプッシュするだけで自動デプロイされます：

```bash
git add .
git commit -m "Update"
git push
```

Vercelが自動的に：
1. 変更を検出
2. ビルドを実行
3. デプロイを実行

---

## 📊 デプロイ状態の確認

Vercelダッシュボードで以下を確認できます：

- **Deployments**: デプロイ履歴
- **Logs**: ビルドログとランタイムログ
- **Analytics**: トラフィック統計（Proプラン）
- **Settings**: 環境変数、ドメイン設定など

---

## 🎉 完了！

デプロイが成功すると、以下のようなURLが表示されます：

```
https://ai-clinic-platform-xxxxx.vercel.app
```

このURLをシェアすれば、誰でもアプリケーションにアクセスできます！

---

## 📚 参考資料

- [Vercel公式ドキュメント](https://vercel.com/docs)
- [Next.jsデプロイメント](https://nextjs.org/docs/deployment)
- [PlanetScaleドキュメント](https://planetscale.com/docs)

