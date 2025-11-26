# Acontext統合 × Vercelデプロイ 動作可能性分析

## エグゼクティブサマリー

**結論: フル機能は動きません。部分的に動作しますが、Acontextサーバーは別途デプロイが必要です。**

### 動作する部分
- ✅ beauty project（Next.js + tRPC）はVercelで完全に動作
- ✅ Acontext SDK（`@acontext/acontext`）はVercelのサーバーレス関数で動作
- ✅ beauty projectからAcontext APIへのHTTPリクエストは可能

### 動作しない部分
- ❌ Acontextサーバー自体はVercelでは動かない
- ❌ Acontextのバックグラウンドワーカー（Task Agent、Experience Agent）はVercelでは動かない
- ❌ AcontextダッシュボードはVercelで動くが、バックエンドが必要

---

## 1. Vercelの制約

### 1.1. サーバーレス関数の制約

**実行時間の制限:**
- Hobbyプラン: 10秒
- Proプラン: 60秒
- Enterpriseプラン: 900秒（15分）

**メモリ制限:**
- デフォルト: 1024MB
- 最大: 3008MB（Pro/Enterprise）

**同時実行数の制限:**
- Hobby: 100
- Pro: 1000
- Enterprise: 無制限

### 1.2. ステートレス

**制約:**
- サーバーレス関数はステートレス
- ファイルシステムへの永続的な書き込み不可
- バックグラウンドプロセスの実行不可
- 長時間実行されるプロセスの実行不可

### 1.3. データベース接続

**制約:**
- 外部データベースへの接続は可能
- 接続プールの管理が必要
- コールドスタート時の接続確立に時間がかかる場合がある

---

## 2. Acontextの要件

### 2.1. Acontextサーバーの構成

Acontextは以下のコンポーネントで構成されています：

```
Acontextシステム
├── Core (Python FastAPI)
│   ├── セッション管理
│   ├── メッセージ保存
│   ├── タスク抽出（バックグラウンド）
│   └── スキル学習（バックグラウンド）
├── API (Go REST API)
│   └── HTTPエンドポイント
├── UI (Next.js Dashboard)
│   └── ダッシュボード
├── PostgreSQL
│   └── データベース
└── RabbitMQ
    └── メッセージキュー（バックグラウンド処理用）
```

### 2.2. 必要なインフラ

**必須:**
- PostgreSQLデータベース
- RabbitMQ（メッセージキュー）
- バックグラウンドワーカー（常時実行）

**推奨:**
- Docker Compose環境
- または、Kubernetes環境

### 2.3. バックグラウンド処理

**Task Agent:**
- メッセージ送信後にバックグラウンドでタスクを抽出
- 10-30秒かかる場合がある
- 常時実行が必要

**Experience Agent:**
- タスク完了後にスキルを抽出・保存
- 非同期処理
- 常時実行が必要

---

## 3. Vercelでの動作可能性

### 3.1. beauty project（Vercelで動作 ✅）

**動作する機能:**
- Next.jsアプリケーション
- tRPC APIエンドポイント
- Acontext SDKを使用したAPI呼び出し
- 外部データベース（MySQL）への接続

**制約:**
- サーバーレス関数の実行時間制限
- ステートレス（セッション状態の保持不可）

### 3.2. Acontextサーバー（Vercelでは動作不可 ❌）

**動作しない理由:**

1. **PostgreSQLの要件**
   - AcontextはPostgreSQLを使用
   - VercelはPostgreSQLを提供していない
   - 外部PostgreSQLへの接続は可能だが、Acontextサーバー自体がVercelで動かない

2. **RabbitMQの要件**
   - AcontextはRabbitMQを使用
   - VercelはRabbitMQを提供していない
   - バックグラウンド処理に必要

3. **バックグラウンドワーカーの要件**
   - Task Agent、Experience Agentは常時実行が必要
   - Vercelのサーバーレス関数はリクエスト駆動
   - バックグラウンドプロセスは実行できない

4. **長時間実行プロセス**
   - タスク抽出に10-30秒かかる
   - VercelのHobbyプランでは10秒の制限
   - Proプランでも60秒の制限

### 3.3. ハイブリッド構成（推奨 ✅）

**構成:**
```
┌─────────────────┐
│  Vercel         │
│  (beauty project)│
│  - Next.js      │
│  - tRPC API     │
└────────┬────────┘
         │ HTTP API
         │ (Acontext SDK)
         ▼
┌─────────────────┐
│  別ホスト        │
│  (Acontext Server)│
│  - Python API   │
│  - Go API       │
│  - PostgreSQL   │
│  - RabbitMQ     │
│  - Workers      │
└─────────────────┘
```

**動作する機能:**
- ✅ beauty projectからAcontext APIへの呼び出し
- ✅ セッション作成
- ✅ メッセージ保存
- ✅ タスク取得（Acontextサーバーが処理済みの場合）

**制約:**
- ⚠️ Acontextサーバーを別途デプロイ・運用する必要がある
- ⚠️ ネットワークレイテンシが追加される
- ⚠️ 2つのシステムを管理する必要がある

---

## 4. デプロイオプション

### 4.1. オプション1: ハイブリッド構成（推奨）

**beauty project:**
- Vercelにデプロイ（既存通り）

**Acontextサーバー:**
- 別ホストにデプロイ
  - **推奨プラットフォーム:**
    - Railway（簡単、PostgreSQL付属）
    - Render（無料プランあり）
    - DigitalOcean App Platform
    - AWS ECS/Fargate
    - Google Cloud Run
    - Azure Container Instances

**メリット:**
- ✅ beauty projectはVercelの利点を活用
- ✅ Acontextサーバーは必要なインフラで動作
- ✅ 各システムを最適な環境で運用

**デメリット:**
- ❌ 2つのシステムを管理
- ❌ 追加のコスト（Acontextサーバーのホスティング）
- ❌ ネットワークレイテンシ

### 4.2. オプション2: すべてをVercelで動かす（不可 ❌）

**問題点:**
- AcontextサーバーはVercelでは動かない
- PostgreSQL、RabbitMQが必要
- バックグラウンドワーカーが必要

**結論: このオプションは不可能**

### 4.3. オプション3: すべてを別ホストで動かす

**beauty project + Acontext:**
- 同じホスト（VPS、Kubernetes等）にデプロイ
- Docker Composeで管理

**メリット:**
- ✅ 単一のインフラで管理
- ✅ ネットワークレイテンシが少ない
- ✅ フル機能が動作

**デメリット:**
- ❌ Vercelの利点（自動デプロイ、CDN等）を失う
- ❌ インフラ管理の負担が増える
- ❌ スケーリングの設定が必要

---

## 5. 推奨デプロイ構成

### 5.1. 本番環境推奨構成

```
┌─────────────────────────────────┐
│  Vercel (beauty project)        │
│  - Next.js App                  │
│  - tRPC API                     │
│  - MySQL (PlanetScale)           │
│  URL: https://app.example.com   │
└──────────────┬──────────────────┘
               │
               │ HTTPS API
               │ (ACONTEXT_BASE_URL)
               ▼
┌─────────────────────────────────┐
│  Railway / Render (Acontext)     │
│  - Python FastAPI               │
│  - Go REST API                  │
│  - PostgreSQL                   │
│  - RabbitMQ                     │
│  - Background Workers           │
│  URL: https://acontext.example.com│
└─────────────────────────────────┘
```

### 5.2. 環境変数の設定

**Vercel（beauty project）:**
```env
# 既存の環境変数
DATABASE_URL=mysql://...
OPENAI_API_KEY=...
CLAUDE_API_KEY=...

# Acontext設定（新規追加）
ACONTEXT_BASE_URL=https://acontext.example.com/api/v1
ACONTEXT_API_KEY=sk-ac-your-api-key
```

**Acontextサーバー:**
```env
# Acontextの環境変数
DATABASE_URL=postgresql://...
RABBITMQ_URL=amqp://...
OPENAI_API_KEY=...  # Task Agent用
```

### 5.3. RailwayでのAcontextデプロイ例

**Railwayの利点:**
- PostgreSQLが自動提供
- Docker Compose対応
- 簡単なデプロイ
- 無料プランあり（制限あり）

**デプロイ手順:**
1. Railwayアカウント作成
2. GitHubリポジトリを接続
3. `docker-compose.yaml`を指定
4. 環境変数を設定
5. デプロイ

---

## 6. 機能別動作可能性

### 6.1. PoCで実装する機能

| 機能 | Vercel | Acontext Server | 動作可否 |
|------|--------|-----------------|----------|
| セッション作成 | ✅ | ✅ | ✅ 動作する |
| メッセージ保存 | ✅ | ✅ | ✅ 動作する |
| タスク自動抽出 | ⚠️ | ✅ | ⚠️ 部分的に動作 |
| タスク取得 | ✅ | ✅ | ✅ 動作する |
| スキル学習 | ❌ | ✅ | ❌ PoCでは対象外 |

**詳細:**

1. **セッション作成・メッセージ保存**
   - ✅ 完全に動作
   - beauty project（Vercel）→ Acontext API（別ホスト）へのHTTPリクエスト

2. **タスク自動抽出**
   - ⚠️ 部分的に動作
   - Acontextサーバー側でバックグラウンド処理
   - 10-30秒の遅延がある
   - Vercel側では待機しない（非同期）

3. **タスク取得**
   - ✅ 動作する
   - タスク抽出完了後に取得可能

### 6.2. 制約事項

**ネットワークレイテンシ:**
- Vercel → AcontextサーバーへのHTTPリクエスト
- 追加レイテンシ: 100-500ms（地域による）

**タイムアウト:**
- Acontext APIへのリクエストにタイムアウトを設定
- 推奨: 5-10秒

**エラーハンドリング:**
- Acontextサーバーが利用不可の場合のフォールバック
- グレースフルデグラデーション

---

## 7. コスト見積もり

### 7.1. Vercel（beauty project）

**既存コスト:**
- Hobby: 無料（制限あり）
- Pro: $20/月
- Enterprise: カスタム

**追加コスト:**
- なし（Acontext統合による追加コストなし）

### 7.2. Acontextサーバー（別ホスト）

**Railway:**
- Starter: $5/月
- Developer: $20/月
- Pro: $20/月

**Render:**
- Free: 無料（制限あり）
- Starter: $7/月
- Standard: $25/月

**DigitalOcean:**
- App Platform: $12/月〜
- Droplet: $6/月〜

**推奨:**
- PoC: Render Free または Railway Starter
- 本番: Railway Developer または Render Standard

### 7.3. データベース

**PostgreSQL（Acontext用）:**
- Railway: 含まれる
- Render: 含まれる
- 外部: Supabase（無料プランあり）、Neon（無料プランあり）

**MySQL（beauty project用）:**
- 既存: PlanetScale等（変更なし）

---

## 8. 実装時の注意事項

### 8.1. ネットワーク設定

**CORS設定:**
- AcontextサーバーでCORSを有効化
- Vercelのドメインを許可

**認証:**
- APIキーによる認証
- HTTPS必須

### 8.2. エラーハンドリング

**タイムアウト設定:**
```typescript
const acontextClient = new AcontextClient({
  base_url: process.env.ACONTEXT_BASE_URL,
  api_key: process.env.ACONTEXT_API_KEY,
  timeout: 10000, // 10秒
});
```

**リトライロジック:**
```typescript
async function safeAcontextOperation<T>(
  operation: () => Promise<T>,
  fallback: T,
  retries = 2,
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === retries - 1) {
        console.warn("Acontext operation failed after retries:", error);
        return fallback;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return fallback;
}
```

### 8.3. モニタリング

**Vercel側:**
- VercelのログでAcontext API呼び出しを監視
- エラーレートを追跡

**Acontext側:**
- Acontextサーバーのログを監視
- ヘルスチェックエンドポイントを実装

---

## 9. 結論と推奨事項

### 9.1. 結論

**フル機能は動きませんが、PoCで実装する機能は動作します。**

- ✅ セッション管理: 動作する
- ✅ メッセージ保存: 動作する
- ✅ タスク取得: 動作する
- ⚠️ タスク自動抽出: 部分的に動作（バックグラウンド処理のため遅延あり）

### 9.2. 推奨事項

**PoC段階:**
1. beauty projectはVercelにデプロイ（既存通り）
2. AcontextサーバーはRailwayまたはRenderにデプロイ
3. ハイブリッド構成で動作確認

**本番環境:**
1. beauty project: Vercel Pro（既存）
2. Acontextサーバー: Railway Developer または Render Standard
3. モニタリングとアラートを設定

### 9.3. 代替案

**Acontextを使わない場合:**
- 自前でセッション管理を実装（Prisma + MySQL）
- タスク追跡を簡易的に実装
- スキル学習は後回し

**ただし、Acontextの価値（自動タスク抽出、スキル学習）は失われる**

---

## 10. 次のステップ

1. **PoC実装**
   - AcontextサーバーをRailwayにデプロイ
   - beauty projectから接続テスト
   - 動作確認

2. **本番準備**
   - モニタリング設定
   - エラーハンドリングの強化
   - パフォーマンステスト

3. **運用開始**
   - 本番環境にデプロイ
   - ユーザーフィードバック収集
   - 改善

---

**作成日**: 2025-01-XX
**バージョン**: 1.0


