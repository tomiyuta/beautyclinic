# データベース設定ガイド

このドキュメントでは、Vercelにデプロイする際のデータベース設定方法を説明します。

## データベースプロバイダーの選択

本番環境用のMySQLデータベースが必要です。以下のいずれかを選択してください：

### 1. PlanetScale（推奨・Vercelと統合しやすい）

**特徴**:
- Vercelと統合しやすい
- 無料プランあり
- 自動スケーリング
- ブランチ機能（開発/本番環境の分離）

**セットアップ手順**:

1. [PlanetScale](https://planetscale.com/)にアカウントを作成
2. 「Create database」をクリック
3. データベース名を入力（例：`beautyclinic`）
4. リージョンを選択（例：`ap-northeast-1` - 東京）
5. 「Create database」をクリック
6. データベースが作成されたら、「Connect」をクリック
7. 「Connect with」→「Prisma」を選択
8. 表示された接続文字列をコピー（例：`mysql://xxxxx:xxxxx@xxxxx.ap-northeast-1.aws.planetscale.com:3306/beautyclinic?sslaccept=strict`）

**接続文字列の形式**:
```
mysql://ユーザー名:パスワード@ホスト:3306/データベース名?sslaccept=strict
```

### 2. Railway

**特徴**:
- シンプルなセットアップ
- 無料プランあり（$5クレジット/月）
- MySQLを簡単にデプロイ可能

**セットアップ手順**:

1. [Railway](https://railway.app/)にアカウントを作成（GitHubアカウントでログイン推奨）
2. 「New Project」→「Provision MySQL」を選択
3. MySQLインスタンスが作成されたら、「Variables」タブを開く
4. `DATABASE_URL`をコピー（例：`mysql://root:password@containers-us-west-xxx.railway.app:3306/railway`）

### 3. AWS RDS

**特徴**:
- エンタープライズ向け
- 高い可用性とセキュリティ
- 有料（使用量に応じて）

**セットアップ手順**:

1. AWSアカウントを作成
2. RDSコンソールでMySQLインスタンスを作成
3. セキュリティグループでVercelのIPアドレスを許可
4. エンドポイントとポート番号を取得
5. 接続文字列を構築：
   ```
   mysql://ユーザー名:パスワード@エンドポイント:3306/データベース名
   ```

### 4. Google Cloud SQL

**特徴**:
- Google Cloud PlatformのマネージドMySQL
- 高い可用性
- 有料

**セットアップ手順**:

1. Google Cloud Platformアカウントを作成
2. Cloud SQLでMySQLインスタンスを作成
3. 接続文字列を取得
4. 形式：
   ```
   mysql://ユーザー名:パスワード@IPアドレス:3306/データベース名
   ```

## DATABASE_URLの設定方法

### 形式

```
mysql://ユーザー名:パスワード@ホスト:ポート/データベース名
```

### 例

```env
# PlanetScaleの場合
DATABASE_URL=mysql://xxxxx:xxxxx@xxxxx.ap-northeast-1.aws.planetscale.com:3306/beautyclinic?sslaccept=strict

# Railwayの場合
DATABASE_URL=mysql://root:password@containers-us-west-xxx.railway.app:3306/railway

# AWS RDSの場合
DATABASE_URL=mysql://admin:mypassword@my-db-instance.xxxxx.ap-northeast-1.rds.amazonaws.com:3306/beautyclinic

# カスタムMySQLサーバーの場合
DATABASE_URL=mysql://user:password@db.example.com:3306/beautyclinic
```

### 注意事項

1. **パスワードに特殊文字が含まれる場合**:
   - URLエンコードが必要な場合があります（例：`@` → `%40`、`#` → `%23`）

2. **SSL接続が必要な場合**:
   - PlanetScale: `?sslaccept=strict`を追加
   - その他: `?ssl=true`を追加

3. **接続プール設定**（オプション）:
   ```
   DATABASE_URL=mysql://user:password@host:3306/database?connection_limit=10&pool_timeout=20
   ```

## PRISMA_GENERATE_DATAPROXYの設定

### 値: `false`（推奨）

```env
PRISMA_GENERATE_DATAPROXY=false
```

**説明**:
- Prisma Data Proxyを使用しない場合に設定
- Vercelでのデプロイ時は通常`false`に設定
- Prisma Clientを直接生成して使用します

### 値: `true`（特殊な場合のみ）

```env
PRISMA_GENERATE_DATAPROXY=true
```

**説明**:
- Prisma Data Proxyを使用する場合に設定
- 通常は使用しません（追加の設定が必要）

## Vercelでの設定手順

### 方法1: 環境変数として直接設定

1. Vercelダッシュボードでプロジェクトを開く
2. 「Settings」→「Environment Variables」に移動
3. 「Add New」をクリック
4. 以下を設定：
   - **Key**: `DATABASE_URL`
   - **Value**: 上記で取得した接続文字列
   - **Environment**: Production, Preview, Development（必要に応じて選択）
5. 「Save」をクリック
6. 同様に`PRISMA_GENERATE_DATAPROXY`も設定

### 方法2: .envファイルからインポート

1. ローカルで`.env`ファイルを作成：
   ```env
   DATABASE_URL=mysql://user:password@host:3306/beautyclinic
   PRISMA_GENERATE_DATAPROXY=false
   ```
2. Vercelダッシュボードで「Import .env」をクリック
3. `.env`ファイルを選択してインポート

## データベースマイグレーションの実行

### 初回デプロイ時

Vercelのビルド時に自動的に実行されますが、手動で実行することも可能：

```bash
# ローカルで実行（本番データベースに接続）
npx prisma migrate deploy
# または
npx prisma db push
```

### マイグレーションの確認

```bash
# マイグレーション状態を確認
npx prisma migrate status

# Prisma Clientを生成
npx prisma generate
```

## トラブルシューティング

### 接続エラーが発生する場合

1. **接続文字列の確認**:
   - ユーザー名、パスワード、ホスト、ポート、データベース名が正しいか確認
   - 特殊文字がURLエンコードされているか確認

2. **ファイアウォール設定**:
   - データベースプロバイダーのファイアウォール設定でVercelのIPアドレスを許可
   - PlanetScaleやRailwayは通常自動で許可されます

3. **SSL接続**:
   - SSL接続が必要な場合は`?sslaccept=strict`または`?ssl=true`を追加

4. **ネットワーク接続**:
   - データベースがインターネットからアクセス可能か確認
   - プライベートネットワークの場合はVPNやVPCピアリングが必要

### ビルドエラーが発生する場合

1. **Prisma Client生成エラー**:
   ```bash
   # ローカルで確認
   npx prisma generate
   ```

2. **環境変数の確認**:
   - Vercelダッシュボードで環境変数が正しく設定されているか確認
   - ビルドログで環境変数が読み込まれているか確認

## 推奨設定（PlanetScaleの場合）

```env
DATABASE_URL=mysql://xxxxx:xxxxx@xxxxx.ap-northeast-1.aws.planetscale.com:3306/beautyclinic?sslaccept=strict
PRISMA_GENERATE_DATAPROXY=false
```

## 参考リンク

- [PlanetScale Documentation](https://planetscale.com/docs)
- [Railway Documentation](https://docs.railway.app/)
- [Prisma on Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Prisma Connection Strings](https://www.prisma.io/docs/concepts/database-connectors/mysql#connection-details)

