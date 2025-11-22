# Vercel環境変数の設定方法

## 問題
`prisma generate`が`DATABASE_URL`環境変数を必要としています。

## 解決方法

### 方法1: Vercelダッシュボードで環境変数を設定（推奨）

1. Vercelダッシュボードにアクセス
2. プロジェクトを選択
3. 「Settings」→「Environment Variables」をクリック
4. 以下の環境変数を追加：

| 変数名 | 値 | 環境 |
|--------|-----|------|
| `DATABASE_URL` | `mysql://dummy:dummy@localhost:3306/dummy` | Production, Preview, Development すべて |

**重要**: `DATABASE_URL`はビルド時に必要ですが、ダミー値で問題ありません。`prisma generate`はデータベースに接続しません。

5. 「Save」をクリック
6. 「Redeploy」をクリック

### 方法2: vercel.jsonで設定（一時的な解決策）

`vercel.json`に以下を追加：

```json
{
  "env": {
    "DATABASE_URL": "mysql://dummy:dummy@localhost:3306/dummy"
  }
}
```

ただし、本番環境では実際のデータベースURLに変更する必要があります。

## 推奨される設定

ビルド時用のダミー値と、本番環境用の実際の値の両方を設定：

1. **ビルド用（ダミー値）**: Vercelの環境変数で設定
   - `DATABASE_URL=mysql://dummy:dummy@localhost:3306/dummy`
   - Production, Preview, Developmentすべてに設定

2. **本番環境用（実際の値）**: デプロイ後に設定
   - PlanetScaleの接続文字列
   - Production環境のみに設定

## 次のステップ

環境変数を設定したら、Vercelダッシュボードで「Redeploy」をクリックしてください。

