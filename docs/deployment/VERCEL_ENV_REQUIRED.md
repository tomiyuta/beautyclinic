# ⚠️ 重要: Vercel環境変数の設定が必要です

現在、`npm install`時に`prisma generate`が実行され、`DATABASE_URL`環境変数が必要になっています。

## 解決方法: Vercelダッシュボードで環境変数を設定

### ステップ1: Vercelダッシュボードにアクセス
1. [Vercel](https://vercel.com)にログイン
2. プロジェクト `ai-clinic-platform` を選択

### ステップ2: 環境変数を追加
1. 「Settings」タブをクリック
2. 「Environment Variables」セクションを開く
3. 以下の環境変数を追加：

**変数名**: `DATABASE_URL`  
**値**: `mysql://dummy:dummy@localhost:3306/dummy`  
**環境**: ✅ Production, ✅ Preview, ✅ Development すべてにチェック

4. 「Save」をクリック

### ステップ3: 再デプロイ
1. 「Deployments」タブに移動
2. 最新のデプロイメントの「...」メニューをクリック
3. 「Redeploy」を選択
4. 「Use existing Build Cache」のチェックを外す（オプション）
5. 「Redeploy」をクリック

## なぜこれが必要か？

`@prisma/client`パッケージは`postinstall`スクリプトを持っており、`npm install`時に自動的に`prisma generate`を実行しようとします。この時、`DATABASE_URL`環境変数が必要になります。

`prisma generate`は実際にはデータベース接続を必要としませんが、Prismaの設定ファイルが`DATABASE_URL`の存在を検証するため、ダミー値でも設定する必要があります。

## 本番環境での注意

本番環境では、後でPlanetScaleの実際の接続文字列に変更してください：
1. PlanetScaleでデータベースを作成
2. 接続文字列をコピー
3. Vercelダッシュボードで`DATABASE_URL`を更新（Production環境のみ）

