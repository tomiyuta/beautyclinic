# デプロイメントガイド

このシステムはNext.jsアプリケーションなので、様々なクラウドサービスにデプロイできます。

## デプロイ可能なサービス

### 1. Vercel（推奨・最も簡単）

VercelはNext.jsの開発元が提供するホスティングサービスで、最も簡単にデプロイできます。

#### デプロイ手順

1. **Vercelアカウントの作成**
   - [Vercel](https://vercel.com/)にアクセスしてアカウントを作成

2. **GitHubリポジトリにプッシュ**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

3. **Vercelでプロジェクトをインポート**
   - Vercelダッシュボードで「New Project」をクリック
   - GitHubリポジトリを選択
   - 環境変数を設定（後述）

4. **環境変数の設定**
   Vercelダッシュボードの「Environment Variables」で以下を設定：
   ```
   DATABASE_URL=mysql://user:password@host:3306/database
   GEMINI_API_KEY=your-key
   GROK_API_KEY=your-key
   CLAUDE_API_KEY=your-key
   OPENAI_API_KEY=your-key
   ```

5. **デプロイ**
   - 「Deploy」ボタンをクリック
   - 自動的にビルドとデプロイが開始されます

**注意**: Vercelはサーバーレス環境なので、MySQLデータベースは外部のクラウドデータベース（PlanetScale、AWS RDS、Google Cloud SQLなど）が必要です。

---

### 2. Google Cloud Platform (GCP)

#### オプションA: Cloud Run（推奨）

1. **Dockerfileの作成**（後述）

2. **Google Cloud SDKのインストール**
   ```bash
   curl https://sdk.cloud.google.com | bash
   gcloud init
   ```

3. **プロジェクトの作成**
   ```bash
   gcloud projects create your-project-id
   gcloud config set project your-project-id
   ```

4. **Cloud SQL（MySQL）のセットアップ**
   ```bash
   gcloud sql instances create ai-clinic-db \
     --database-version=MYSQL_8_0 \
     --tier=db-f1-micro \
     --region=asia-northeast1
   
   gcloud sql databases create ai_clinic --instance=ai-clinic-db
   ```

5. **Dockerイメージのビルドとプッシュ**
   ```bash
   gcloud builds submit --tag gcr.io/your-project-id/ai-clinic-platform
   ```

6. **Cloud Runにデプロイ**
   ```bash
   gcloud run deploy ai-clinic-platform \
     --image gcr.io/your-project-id/ai-clinic-platform \
     --platform managed \
     --region asia-northeast1 \
     --allow-unauthenticated \
     --set-env-vars DATABASE_URL="mysql://user:pass@/ai_clinic?unix_socket=/cloudsql/project:region:instance"
   ```

#### オプションB: App Engine

1. **app.yamlの作成**（後述）

2. **デプロイ**
   ```bash
   gcloud app deploy
   ```

---

### 3. AWS

#### AWS Amplify（推奨）

1. **AWS Amplifyコンソール**でプロジェクトを作成
2. GitHubリポジトリを接続
3. ビルド設定を追加（amplify.yml）
4. 環境変数を設定
5. デプロイ

#### AWS Elastic Beanstalk

1. **Dockerfileの作成**
2. **EB CLIのインストール**
   ```bash
   pip install awsebcli
   ```
3. **初期化とデプロイ**
   ```bash
   eb init
   eb create
   eb deploy
   ```

---

### 4. Railway

1. **Railwayアカウントの作成**
   - [Railway](https://railway.app/)にアクセス

2. **プロジェクトの作成**
   - 「New Project」→「Deploy from GitHub repo」

3. **環境変数の設定**
   - Railwayダッシュボードで環境変数を設定

4. **MySQLプラグインの追加**
   - 「New」→「Database」→「MySQL」を選択

---

## 必要な設定ファイル

### Dockerfile（Cloud Run、AWS用）

```dockerfile
FROM node:20-alpine AS base

# 依存関係のインストール
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ビルド
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# 本番環境
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### next.config.jsの更新（standalone出力用）

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Docker用
  // ... 既存の設定
};

module.exports = nextConfig;
```

### app.yaml（App Engine用）

```yaml
runtime: nodejs20

env_variables:
  DATABASE_URL: "mysql://user:password@/ai_clinic?unix_socket=/cloudsql/project:region:instance"
  GEMINI_API_KEY: "your-key"
  GROK_API_KEY: "your-key"
  CLAUDE_API_KEY: "your-key"
  OPENAI_API_KEY: "your-key"

automatic_scaling:
  min_instances: 1
  max_instances: 10
```

---

## データベースの移行

### クラウドMySQLサービスの選択

1. **PlanetScale**（Vercel推奨）
   - サーバーレスMySQL
   - 無料プランあり

2. **Google Cloud SQL**
   - GCPと統合しやすい
   - 自動バックアップ機能

3. **AWS RDS**
   - AWSと統合しやすい
   - 高可用性オプション

4. **Railway MySQL**
   - Railwayと統合しやすい
   - 簡単なセットアップ

### データベース接続URLの更新

デプロイ先に応じて、`DATABASE_URL`環境変数を更新：

```env
# PlanetScale例
DATABASE_URL="mysql://user:password@host.planetscale.com:3306/database?sslaccept=strict"

# Cloud SQL例
DATABASE_URL="mysql://user:password@/database?unix_socket=/cloudsql/project:region:instance"

# Railway例
DATABASE_URL="mysql://user:password@host.railway.app:3306/database"
```

---

## デプロイ前のチェックリスト

- [ ] `.env`ファイルを`.gitignore`に追加（機密情報保護）
- [ ] 環境変数をデプロイ先のダッシュボードで設定
- [ ] データベースをクラウドサービスに移行
- [ ] `DATABASE_URL`を更新
- [ ] Prismaマイグレーションを実行
- [ ] APIキーが正しく設定されているか確認
- [ ] ビルドが成功するかローカルで確認（`npm run build`）

---

## トラブルシューティング

### ビルドエラー

- `npm run build`をローカルで実行してエラーを確認
- 環境変数が正しく設定されているか確認

### データベース接続エラー

- `DATABASE_URL`の形式が正しいか確認
- クラウドデータベースのファイアウォール設定を確認
- SSL接続が必要な場合は`?sslaccept=strict`を追加

### 環境変数の読み込みエラー

- Next.jsでは`NEXT_PUBLIC_`プレフィックスが必要な変数はクライアント側でも使用可能
- サーバー側のみの変数はプレフィックス不要

---

## 推奨デプロイ先

1. **開発・小規模運用**: Vercel + PlanetScale（無料プランあり）
2. **中規模運用**: Railway（簡単、統合MySQL）
3. **大規模運用**: Google Cloud Run + Cloud SQL（スケーラブル）
4. **エンタープライズ**: AWS Amplify + RDS（高可用性）

