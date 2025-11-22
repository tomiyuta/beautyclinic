# Google Cloud Platform (GCP) デプロイ時の潜在的な問題点

このドキュメントでは、このアプリケーションをGCP（Google Cloud Platform）でデプロイする際に発生する可能性のある問題点とその解決方法を説明します。

## 🚨 主要な問題点

### 1. **Prismaクライアント生成の問題**

#### 問題
- `npm install`時に`@prisma/client`の`postinstall`スクリプトが`prisma generate`を実行
- `prisma generate`実行時に`DATABASE_URL`環境変数が必要
- ビルド時点ではデータベースがまだ存在しない可能性がある

#### 解決方法
**Cloud Run / App Engine:**
```yaml
# app.yaml または環境変数で設定
env_variables:
  DATABASE_URL: "mysql://dummy:dummy@localhost:3306/dummy"  # ビルド用ダミー値
```

**Dockerfile:**
```dockerfile
# ビルド時にDATABASE_URLを設定
ENV DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy"
RUN npx prisma generate
```

---

### 2. **Next.js Standalone出力の設定**

#### 問題
- `Dockerfile`で`standalone`出力を想定しているが、`next.config.js`で有効化されていない
- `server.js`が見つからないエラーが発生する可能性

#### 解決方法
`next.config.js`を更新：
```javascript
const nextConfig = {
  output: 'standalone',  // Docker用に追加
  // ... 既存の設定
};
```

**または、Dockerfileを修正:**
```dockerfile
# standalone出力を使わない場合
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
CMD ["npm", "start"]
```

---

### 3. **Cloud SQL接続の問題**

#### 問題
- Cloud SQLへの接続にはUnixソケットまたはプライベートIPが必要
- App EngineとCloud Runでは接続方法が異なる
- SSL証明書の設定が必要な場合がある

#### 解決方法

**App Engine:**
```yaml
# app.yaml
beta_settings:
  cloud_sql_instances: "PROJECT_ID:REGION:INSTANCE_NAME"

env_variables:
  DATABASE_URL: "mysql://USER:PASSWORD@/DATABASE_NAME?unix_socket=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME"
```

**Cloud Run:**
```bash
# Cloud SQL接続を有効化
gcloud run deploy SERVICE_NAME \
  --add-cloudsql-instances=PROJECT_ID:REGION:INSTANCE_NAME \
  --set-env-vars DATABASE_URL="mysql://USER:PASSWORD@/DATABASE_NAME?unix_socket=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME"
```

**注意点:**
- Cloud SQL Proxyが必要な場合がある
- プライベートIP接続の場合はVPC接続が必要
- 接続プールの設定を検討（`?connection_limit=10`など）

---

### 4. **環境変数の管理**

#### 問題
- 複数のAPIキー（Gemini, Grok, Claude, OpenAI）を管理する必要がある
- 機密情報を`app.yaml`に直接書くのはセキュリティリスク
- 環境ごとに異なる値を設定する必要がある

#### 解決方法

**Secret Managerを使用（推奨）:**
```bash
# Secret Managerに保存
echo -n "your-api-key" | gcloud secrets create OPENAI_API_KEY --data-file=-

# Cloud Runで使用
gcloud run deploy SERVICE_NAME \
  --set-secrets="OPENAI_API_KEY=OPENAI_API_KEY:latest"
```

**環境変数として設定:**
```bash
# Cloud Run
gcloud run deploy SERVICE_NAME \
  --set-env-vars="OPENAI_API_KEY=your-key,GEMINI_API_KEY=your-key"

# App Engine (app.yaml)
env_variables:
  OPENAI_API_KEY: "your-key"
  GEMINI_API_KEY: "your-key"
```

---

### 5. **メモリとCPUリソースの制限**

#### 問題
- AI API呼び出しは時間がかかる可能性がある
- 大量のデータ処理でメモリ不足になる可能性
- タイムアウトエラーが発生する可能性

#### 解決方法

**Cloud Run:**
```bash
gcloud run deploy SERVICE_NAME \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300 \
  --max-instances=10
```

**App Engine:**
```yaml
# app.yaml
instance_class: F4  # より多くのメモリとCPU

automatic_scaling:
  min_instances: 1
  max_instances: 10
  target_cpu_utilization: 0.6
```

---

### 6. **Cold Startの問題**

#### 問題
- Cloud RunやApp Engineはリクエストがないとインスタンスが停止
- 初回リクエスト時にCold Startが発生し、レスポンスが遅い
- Prismaクライアントの初期化に時間がかかる

#### 解決方法

**最小インスタンス数を設定:**
```bash
# Cloud Run
gcloud run deploy SERVICE_NAME \
  --min-instances=1  # 常に1インスタンスを維持
```

```yaml
# App Engine
automatic_scaling:
  min_instances: 1  # 常に1インスタンスを維持
```

**ウォームアップリクエスト:**
- 定期的にヘルスチェックエンドポイントを呼び出す
- Cloud Schedulerでcronジョブを設定

---

### 7. **ファイルシステムの制限**

#### 問題
- App EngineとCloud Runは読み取り専用ファイルシステム
- 一時ファイルの書き込みができない
- `html2canvas`などのライブラリがファイルシステムに依存する可能性

#### 解決方法

**メモリ内で処理:**
- ファイルではなく、メモリ内で画像を生成
- `/tmp`ディレクトリを使用（Cloud Runのみ、一時的）

**Cloud Storageを使用:**
- 永続的なファイルはCloud Storageに保存
- 一時ファイルはメモリ内で処理

---

### 8. **CORSとセキュリティ設定**

#### 問題
- 外部API（Gemini, Grok, Claude, OpenAI）へのリクエスト
- CORSエラーの可能性
- APIキーの漏洩リスク

#### 解決方法

**APIキーはサーバー側でのみ使用:**
- クライアント側にAPIキーを公開しない
- tRPCエンドポイント経由でのみAPIを呼び出す

**CORS設定:**
```javascript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://yourdomain.com' },
        ],
      },
    ];
  },
};
```

---

### 9. **ログとモニタリング**

#### 問題
- エラーログの確認が困難
- パフォーマンス監視が必要
- デバッグが難しい

#### 解決方法

**Cloud Logging:**
```bash
# ログを確認
gcloud logging read "resource.type=cloud_run_revision" --limit=50
```

**Error Reporting:**
- Cloud Error Reportingを有効化
- エラーを自動的に検出・通知

**Monitoring:**
- Cloud Monitoringでメトリクスを監視
- アラートを設定

---

### 10. **コスト管理**

#### 問題
- Cloud SQLのインスタンス費用
- Cloud Run/App Engineの実行時間費用
- AI API呼び出しの費用
- データ転送費用

#### 解決方法

**予算アラートを設定:**
```bash
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="AI Clinic Platform Budget" \
  --budget-amount=100USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

**リソースの最適化:**
- 不要なインスタンスを停止
- 適切なインスタンスサイズを選択
- キャッシュを活用してAPI呼び出しを削減

---

### 11. **データベースマイグレーション**

#### 問題
- デプロイ時に自動的にマイグレーションが実行されない
- 手動でマイグレーションを実行する必要がある
- ロールバックが困難

#### 解決方法

**Cloud Buildで自動化:**
```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/npm'
    args: ['install']
  - name: 'gcr.io/cloud-builders/npm'
    args: ['run', 'prisma', 'generate']
  - name: 'gcr.io/cloud-builders/npm'
    args: ['run', 'prisma', 'migrate', 'deploy']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/app', '.']
```

**手動実行:**
```bash
# ローカルから実行
export DATABASE_URL="mysql://user:pass@/db?unix_socket=/cloudsql/project:region:instance"
npx prisma migrate deploy
```

---

### 12. **Next.jsの静的ファイル配信**

#### 問題
- `public`フォルダの静的ファイルが正しく配信されない
- 画像やアセットが404エラーになる

#### 解決方法

**Dockerfileで確認:**
```dockerfile
# publicフォルダをコピー
COPY --from=builder /app/public ./public
```

**App Engineの静的ファイル設定:**
```yaml
# app.yaml
handlers:
  - url: /static
    static_dir: public
```

---

## 📋 デプロイ前チェックリスト

- [ ] `next.config.js`で`output: 'standalone'`が設定されているか
- [ ] `DATABASE_URL`環境変数がビルド時に設定されているか
- [ ] Cloud SQLインスタンスが作成され、接続設定が完了しているか
- [ ] すべてのAPIキーが環境変数またはSecret Managerに設定されているか
- [ ] メモリとCPUリソースが適切に設定されているか
- [ ] タイムアウト設定が十分か（AI API呼び出しを考慮）
- [ ] ログとモニタリングが設定されているか
- [ ] 予算アラートが設定されているか
- [ ] データベースマイグレーションの手順が明確か

---

## 🔧 推奨されるデプロイ構成

### Cloud Run（推奨）

```bash
# 1. Cloud SQLインスタンス作成
gcloud sql instances create ai-clinic-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=asia-northeast1

# 2. データベース作成
gcloud sql databases create ai_clinic --instance=ai-clinic-db

# 3. ユーザー作成
gcloud sql users create ai_user --instance=ai-clinic-db --password=YOUR_PASSWORD

# 4. Dockerイメージビルド
gcloud builds submit --tag gcr.io/PROJECT_ID/ai-clinic-platform

# 5. Cloud Runにデプロイ
gcloud run deploy ai-clinic-platform \
  --image gcr.io/PROJECT_ID/ai-clinic-platform \
  --platform managed \
  --region asia-northeast1 \
  --add-cloudsql-instances=PROJECT_ID:asia-northeast1:ai-clinic-db \
  --set-env-vars DATABASE_URL="mysql://ai_user:PASSWORD@/ai_clinic?unix_socket=/cloudsql/PROJECT_ID:asia-northeast1:ai-clinic-db" \
  --set-env-vars GEMINI_API_KEY="your-key" \
  --set-env-vars GROK_API_KEY="your-key" \
  --set-env-vars CLAUDE_API_KEY="your-key" \
  --set-env-vars OPENAI_API_KEY="your-key" \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300 \
  --min-instances=1 \
  --max-instances=10 \
  --allow-unauthenticated
```

---

## 📚 参考資料

- [Cloud Run ドキュメント](https://cloud.google.com/run/docs)
- [App Engine ドキュメント](https://cloud.google.com/appengine/docs)
- [Cloud SQL ドキュメント](https://cloud.google.com/sql/docs)
- [Next.js デプロイメント](https://nextjs.org/docs/deployment)
- [Prisma Cloud SQL接続](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-google-cloud-run)

