# マイグレーション手動実行手順

## 問題
`prisma migrate dev` 実行時に shadow database へのアクセス権限エラーが発生しました。

## 対処方法

### 方法1: 手動でSQLを実行（推奨）

MySQLに直接接続して、以下のSQLを実行してください：

```bash
# MySQLに接続
mysql -u [ユーザー名] -p [データベース名]

# または、.envのDATABASE_URLを使用
```

実行するSQLファイル:
`prisma/migrations/20251122100732_add_content_generation_extensions/migration.sql`

### 方法2: Prisma Migrate Deployを使用（本番環境向け）

```bash
npx prisma migrate deploy
```

### 方法3: マイグレーションをスキップして開発

マイグレーションが完了していなくても、開発サーバーは起動できます。
ただし、新しいフィールドを使用する機能はエラーになる可能性があります。

## マイグレーション内容

1. `generatedContents`テーブルに7つの新規カラムを追加
   - fileUrl, fileSize, mimeType
   - complianceStatus, complianceReport
   - templateId, variations

2. `ContentType` enumを拡張（14種類）

3. 新規テーブル作成
   - `contentTemplates`
   - `complianceCheckLogs`

## 注意事項

- MySQL 8.0.19未満の場合は `IF NOT EXISTS` がサポートされていない可能性があります
- その場合は、マイグレーションSQLから `IF NOT EXISTS` を削除してください
