# Vercelビルドエラー修正ガイド

## 問題: `react/jsx-runtime`が見つからないエラー

### エラーメッセージ
```
Module not found: Can't resolve 'react/jsx-runtime'
```

## 解決方法

### ステップ1: Vercelダッシュボードで`Install Command`を変更

1. [Vercelダッシュボード](https://vercel.com)にログイン
2. プロジェクト `ai-clinic-platform` を選択
3. 「Settings」タブをクリック
4. 「General」セクションを開く
5. 「Build & Development Settings」セクションを探す
6. **「Install Command」**を以下のように変更：
   - **変更前**: `npm install --ignore-scripts`
   - **変更後**: `npm install`
7. 「Save」をクリック

### ステップ2: 環境変数の確認

「Environment Variables」セクションで以下が設定されているか確認：

| 変数名 | 値 | 環境 |
|--------|-----|------|
| `DATABASE_URL` | `mysql://dummy:dummy@localhost:3306/dummy` | ✅ Production<br>✅ Preview<br>✅ Development |

### ステップ3: 再デプロイ

1. 「Deployments」タブに移動
2. 最新のデプロイメントの「...」メニューをクリック
3. 「Redeploy」を選択
4. 「Use existing Build Cache」のチェックを**外す**（重要）
5. 「Redeploy」をクリック

## なぜこれが必要か？

### `--ignore-scripts`の問題

`npm install --ignore-scripts`を使用すると：
- `postinstall`スクリプトが実行されない
- Prismaクライアントが生成されない（ただし、`build`コマンドで生成される）
- 一部のパッケージのセットアップがスキップされる

### 推奨される設定

`vercel.json`では既に`installCommand: "npm install"`に設定されていますが、Vercelダッシュボードの設定が優先される場合があります。

**推奨**: Vercelダッシュボードで`Install Command`を`npm install`に設定してください。

## 代替案: `--ignore-scripts`を使い続ける場合

`--ignore-scripts`を使い続ける場合は、`build`コマンドで確実にPrismaクライアントを生成する必要があります：

```json
{
  "scripts": {
    "build": "prisma generate --schema=./prisma/schema.prisma && next build"
  }
}
```

これは既に`package.json`に設定されていますが、Reactの`jsx-runtime`の問題は別の問題です。

## トラブルシューティング

### まだエラーが出る場合

1. **ビルドログを確認**: Vercelダッシュボードの「Logs」タブで詳細なエラーを確認
2. **キャッシュをクリア**: 「Redeploy」時に「Use existing Build Cache」のチェックを外す
3. **環境変数を確認**: `DATABASE_URL`が正しく設定されているか確認
4. **ブランチを確認**: 最新のコミットが反映されているか確認

### コミットが古い場合

ビルドログで古いコミット（例: `2964bdd`）からビルドされている場合：
- GitHubに最新の変更がプッシュされているか確認
- Vercelダッシュボードで「Redeploy」を実行

