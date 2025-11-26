# Acontext MySQL実装 × Vercel Proプラン 最終動作可能性分析

## エグゼクティブサマリー

**結論: Proプランであれば、要件定義書の実装はほぼ全てVercel上で稼働します。ただし、いくつかの実装上の注意点があります。**

### ✅ 完全に動作する機能（100%）
- Session管理（作成、メッセージ送信・取得）
- Message管理（OpenAI/Anthropic形式対応）
- Space管理
- Skill検索（fast/agenticモード）
- Disk/Artifact管理（database/s3）
- Dashboard UI
- メトリクス集計（Cron Jobs使用）

### ⚠️ 動作するが実装に注意が必要な機能
- **flush()同期待機**: タイムアウト設定が必要（50秒以内推奨）
- **Experience Agent**: Vercel Cron Jobsの設定が必要
- **Task抽出**: LLM呼び出し時間に注意（5-10秒）
- **Skill学習**: LLM呼び出し時間に注意（5-10秒）

### ❌ 動作しない機能
- **なし**（適切な実装で全て回避可能）

---

## 1. Vercel Proプランの制約

### 1.1. 実行時間制限

- **最大実行時間: 60秒**
- flush()のタイムアウトを50秒以内に設定推奨

### 1.2. メモリ制限

- **最大: 3008MB**
- 通常の処理では問題なし

### 1.3. 同時実行数

- **最大: 1000**
- 通常の使用では問題なし

### 1.4. Cron Jobs

- **利用可能: ✅**
- **最小間隔: 1分**
- Experience Agentの処理に使用

---

## 2. 機能別詳細分析

### 2.1. Session管理 ✅ 完全動作

**実装:**
- tRPCルーター内でPrismaを使用
- MySQLへの接続

**Vercel Proでの動作:**
- ✅ 完全に動作
- 実行時間: < 50ms（制限内）
- メモリ: 問題なし

**確認事項:**
- 接続プールの最適化（Prismaが自動管理）
- コールドスタート時の接続確立（初回のみ遅延）

### 2.2. Message送信・取得 ✅ 完全動作

**実装:**
- tRPCルーター内でDB操作
- OpenAI/Anthropic形式のパース

**Vercel Proでの動作:**
- ✅ 完全に動作
- 実行時間: < 50ms（制限内）

### 2.3. Task抽出 ⚠️ 動作するが注意が必要

**実装:**
- flush()呼び出し時にLLMを使用
- 会話からタスクを抽出

**Vercel Proでの動作:**
- ✅ 動作する
- ⚠️ 実行時間: 5-10秒（LLM依存）
- ⚠️ タイムアウト設定が必要

**実装例:**
```typescript
// タイムアウトを50秒に設定（60秒制限内）
await aiSession.flush({
  sessionId,
  timeoutMs: 50000, // 50秒
  pollIntervalMs: 1000,
});
```

**注意点:**
- LLM呼び出しが遅い場合、タイムアウトの可能性
- エラーハンドリングが必要

### 2.4. flush()同期待機 ⚠️ 動作するが注意が必要

**実装:**
- ブロッキング呼び出し
- ポーリングでジョブ完了を待機

**Vercel Proでの動作:**
- ✅ 動作する
- ⚠️ 実行時間: 10-20秒（タスク抽出+スキル学習）
- ⚠️ タイムアウト設定が必要

**実装パターン:**

#### パターン1: 完全同期（推奨）

```typescript
// タスク抽出 + スキル学習を同期で実行
await aiSession.flush({
  sessionId,
  timeoutMs: 50000, // 50秒
  jobType: 'full_processing',
});
```

**動作:**
- タスク抽出: 5-10秒
- スキル学習: 5-10秒
- 合計: 10-20秒（60秒制限内）

**注意:**
- LLM呼び出しが遅い場合、タイムアウトの可能性
- エラーハンドリングが必要

#### パターン2: ハイブリッド（安全）

```typescript
// タスク抽出のみ同期、スキル学習は非同期
await aiSession.flush({
  sessionId,
  timeoutMs: 30000, // 30秒
  jobType: 'task_extraction', // タスク抽出のみ
});

// スキル学習は非同期（Vercel Cron Jobs）
await aiSession.complete(sessionId);
```

**動作:**
- タスク抽出: 5-10秒（即座に完了）
- スキル学習: 非同期（最大1分の遅延）

**メリット:**
- タイムアウトのリスクが低い
- タスクは即座に取得可能

### 2.5. Experience Agent（バックグラウンド処理）✅ 動作する

**実装:**
- Vercel Cron Jobsを使用
- 1分ごとに未処理ジョブを処理

**Vercel Proでの動作:**
- ✅ 完全に動作
- ✅ Vercel Cron Jobs利用可能

**実装例:**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/process-experience-jobs",
      "schedule": "*/1 * * * *"  // 1分ごと
    }
  ]
}
```

**動作:**
- 1分ごとに自動実行
- 未処理のジョブを最大10件処理
- 各ジョブの処理時間: 10-20秒（60秒制限内）

**注意:**
- 1分間隔のため、即座の処理は不可
- 最大1分の遅延

### 2.6. Skill学習 ⚠️ 動作するが注意が必要

**実装:**
- タスク抽出後、LLMでスキルを抽出
- 複雑性判定を実行

**Vercel Proでの動作:**
- ✅ 動作する
- ⚠️ 実行時間: 5-10秒（LLM依存）

**実装パターン:**

#### パターン1: flush()内で実行（同期）

```typescript
await aiSession.flush({
  sessionId,
  timeoutMs: 50000,
  jobType: 'full_processing', // タスク抽出 + スキル学習
});
```

**動作:**
- タスク抽出: 5-10秒
- スキル学習: 5-10秒
- 合計: 10-20秒（60秒制限内）

#### パターン2: Vercel Cron Jobsで実行（非同期）

```typescript
// flush()でタスク抽出のみ
await aiSession.flush({
  sessionId,
  timeoutMs: 30000,
  jobType: 'task_extraction',
});

// スキル学習は非同期
await aiSession.complete(sessionId);
// → Vercel Cron Jobsで後で処理
```

**動作:**
- タスク抽出: 5-10秒（即座に完了）
- スキル学習: 非同期（最大1分の遅延）

### 2.7. Skill検索 ✅ 完全動作

**fastモード:**
- MySQL FULLTEXT検索
- ✅ 完全に動作（< 200ms）

**agenticモード:**
- LLM探索
- ✅ 動作する（< 5s、60秒制限内）

### 2.8. Disk/Artifact管理 ✅ 完全動作

**database（1MB未満）:**
- PrismaのBytes型で保存
- ✅ 完全に動作

**s3（1MB以上）:**
- S3互換ストレージ（Cloudflare R2等）
- ✅ 完全に動作

**local（ローカルファイルシステム）:**
- ❌ Vercelでは使用不可
- 実装時にs3に統一

### 2.9. Dashboard UI ✅ 完全動作

**実装:**
- Next.js App Router
- tRPCクエリ

**Vercel Proでの動作:**
- ✅ 完全に動作
- 既存のUIと同じ

### 2.10. メトリクス集計 ✅ 完全動作

**実装:**
- Vercel Cron Jobsで日次集計

**Vercel Proでの動作:**
- ✅ 完全に動作
- ✅ Vercel Cron Jobs利用可能

**実装例:**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/aggregate-metrics",
      "schedule": "0 1 * * *"  // 毎日1時
    }
  ]
}
```

---

## 3. 実装上の注意事項

### 3.1. タイムアウト設定

**flush()のタイムアウト:**
```typescript
// 安全な設定（50秒）
await aiSession.flush({
  sessionId,
  timeoutMs: 50000, // 60秒制限の50秒
  pollIntervalMs: 1000,
});
```

**理由:**
- 60秒制限の50秒に設定することで、バッファを確保
- LLM呼び出しの遅延に対応

### 3.2. エラーハンドリング

**タイムアウト時の処理:**
```typescript
try {
  await aiSession.flush({
    sessionId,
    timeoutMs: 50000,
  });
} catch (error) {
  if (error.code === 'FLUSH_TIMEOUT') {
    // 非同期処理にフォールバック
    await aiSession.complete(sessionId);
    // ジョブはVercel Cron Jobsで後で処理
  }
}
```

### 3.3. ストレージ設定

**Vercel用設定:**
```env
# .env
AI_STORAGE_TYPE=s3  # localは使用不可
AI_STORAGE_S3_BUCKET=beautyclinic-ai-artifacts
AI_STORAGE_S3_REGION=ap-northeast-1
AI_STORAGE_DB_THRESHOLD=1048576  # 1MB
```

**推奨S3サービス:**
- Cloudflare R2（無料枠あり、推奨）
- AWS S3
- MinIO（自前ホスト）

### 3.4. 接続プールの最適化

**Prisma設定:**
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
  // 接続プールはPrismaが自動管理
}
```

**注意:**
- コールドスタート時の接続確立に時間がかかる場合がある
- 通常は問題なし

### 3.5. Vercel Cron Jobsの設定

**vercel.json:**
```json
{
  "crons": [
    {
      "path": "/api/cron/process-experience-jobs",
      "schedule": "*/1 * * * *"
    },
    {
      "path": "/api/cron/aggregate-metrics",
      "schedule": "0 1 * * *"
    }
  ]
}
```

**認証:**
```typescript
// APIエンドポイントで認証
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ...
}
```

---

## 4. パフォーマンス目標（Vercel Pro）

| 操作 | 目標値 | Vercel Proでの実現可能性 |
|------|-------|------------------------|
| セッション作成 | < 50ms | ✅ 問題なし |
| メッセージ保存 | < 50ms | ✅ 問題なし |
| メッセージ取得（100件） | < 100ms | ✅ 問題なし |
| flush（タスク抽出のみ） | < 10s | ✅ 問題なし（60秒制限内） |
| flush（スキル学習含む） | < 20s | ✅ 問題なし（60秒制限内） |
| スキル検索（fast） | < 200ms | ✅ 問題なし |
| スキル検索（agentic） | < 5s | ✅ 問題なし（60秒制限内） |
| アーティファクト保存（1MB） | < 500ms | ✅ S3使用時OK |
| アーティファクト取得（1MB） | < 300ms | ✅ S3使用時OK |

**結論: すべての目標値がVercel Proで実現可能**

---

## 5. 実装パターン（推奨）

### 5.1. 完全同期パターン（推奨）

**フロー:**
```
1. セッション作成
2. メッセージ送信
3. flush()呼び出し（タイムアウト50秒）
   └─> タスク抽出（5-10秒）
   └─> スキル学習（5-10秒）
4. タスク取得（即座に可能）
```

**メリット:**
- ✅ タスクとスキルが即座に利用可能
- ✅ シンプルな実装

**デメリット:**
- ⚠️ タイムアウトのリスク（LLMが遅い場合）
- ⚠️ ユーザーの待ち時間が長い（10-20秒）

### 5.2. ハイブリッドパターン（安全）

**フロー:**
```
1. セッション作成
2. メッセージ送信
3. flush()呼び出し（タイムアウト30秒）
   └─> タスク抽出のみ（5-10秒）
4. タスク取得（即座に可能）
5. スキル学習は非同期（Vercel Cron Jobs）
   └─> 最大1分の遅延
```

**メリット:**
- ✅ タイムアウトのリスクが低い
- ✅ タスクは即座に取得可能
- ✅ ユーザーの待ち時間が短い

**デメリット:**
- ⚠️ スキル学習に最大1分の遅延

**推奨: このパターン**

---

## 6. 実装チェックリスト（Vercel Pro対応）

### 必須実装

- [ ] タイムアウト設定を50秒以内に設定
- [ ] ストレージタイプをs3に設定（localは使用不可）
- [ ] Vercel Cron Jobsの設定（vercel.json）
- [ ] エラーハンドリング（タイムアウト時のフォールバック）
- [ ] 認証設定（CRON_SECRET）

### 推奨実装

- [ ] 接続プールの最適化
- [ ] パフォーマンスモニタリング
- [ ] ログ記録
- [ ] リトライロジック

---

## 7. 結論

### 7.1. 最終結論

**Proプランであれば、要件定義書の実装は全てVercel上で稼働します。**

**条件:**
1. ✅ 適切なタイムアウト設定（50秒以内）
2. ✅ Vercel Cron Jobsの設定
3. ✅ S3互換ストレージの使用（localは不可）
4. ✅ エラーハンドリングの実装

### 7.2. 動作しない機能

**なし**（適切な実装で全て回避可能）

### 7.3. 制約事項

1. **実行時間制限: 60秒**
   - flush()のタイムアウトを50秒以内に設定
   - 長時間処理は分割

2. **Cron Jobsの最小間隔: 1分**
   - 即座の処理は不可
   - 最大1分の遅延

3. **ローカルストレージ: 使用不可**
   - S3互換ストレージを使用

### 7.4. 推奨実装パターン

**ハイブリッドパターン:**
- タスク抽出: 同期（flush()）
- スキル学習: 非同期（Vercel Cron Jobs）

**理由:**
- タイムアウトのリスクが低い
- タスクは即座に取得可能
- ユーザー体験が良い

---

## 8. 実装時の注意点まとめ

### 8.1. 必須設定

```typescript
// flush()のタイムアウト
timeoutMs: 50000  // 50秒（60秒制限の50秒）

// ストレージ設定
AI_STORAGE_TYPE=s3  // localは使用不可

// Vercel Cron Jobs
// vercel.jsonに設定
```

### 8.2. エラーハンドリング

```typescript
try {
  await aiSession.flush({ sessionId, timeoutMs: 50000 });
} catch (error) {
  if (error.code === 'FLUSH_TIMEOUT') {
    // 非同期処理にフォールバック
    await aiSession.complete(sessionId);
  }
}
```

### 8.3. パフォーマンス最適化

- 接続プールの最適化
- 不要なデータの取得を避ける
- インデックスの最適化

---

**結論: Proプランであれば、要件定義書の実装は全てVercel上で稼働します。適切な実装（タイムアウト設定、Cron Jobs設定、S3使用）を行えば、問題なく動作します。**

---

**作成日**: 2025-01-XX
**バージョン**: 1.0

