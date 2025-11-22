# VercelでのPrisma Client Query Engineエラー修正ガイド

## 問題

Vercelでのデプロイ時に以下のエラーが発生：
```
Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x"
```

## 原因

Prisma Clientがカスタム出力パス（`../src/generated/prisma`）を使用しているため、VercelのビルドプロセスでQuery Engineバイナリが正しくコピーされていない。

## 修正内容

### 1. `next.config.js`
- `outputFileTracingIncludes`でPrismaバイナリファイルを明示的に指定
- `serverExternalPackages`でPrisma関連パッケージを外部パッケージとして扱う

### 2. `vercel.json`
- ビルドコマンドで`prisma generate`を確実に実行

### 3. `package.json`
- `postinstall`スクリプトで`prisma generate`を実行
- `vercel-build`スクリプトでビルド前に`prisma generate`を実行

### 4. `prisma/schema.prisma`
- `binaryTargets`にVercel環境用のターゲットを指定

## 確認事項

1. Vercelのビルドログで`prisma generate`が実行されているか確認
2. 生成されたバイナリファイルが`.next/server/app/api/trpc/[trpc]`にコピーされているか確認
3. 環境変数`DATABASE_URL`が正しく設定されているか確認

