# Acontext MySQL実装 × Vercel 動作可能性分析

## エグゼクティブサマリー

**結論: ほぼ完全に動作しますが、一部の機能に制約があります。**

### ✅ 完全に動作する機能
- Session管理（作成、メッセージ送信・取得）
- Task抽出（flush()経由）
- Space/Skill管理
- Skill検索（fast/agenticモード）
- Disk/Artifact管理（S3使用時）
- Dashboard UI

### ⚠️ 制約がある機能
- **バックグラウンドジョブ処理**: Vercel Cron Jobsまたはポーリング方式が必要
- **flush()の長時間実行**: Vercelのタイムアウト制限に注意
- **ローカルストレージ**: Vercelでは使用不可（S3必須）

### ❌ 動作しない機能
- なし（適切な実装で回避可能）

---

## 1. Vercelの制約再確認

### 1.1. サーバーレス関数の制約

**実行時間:**
- Hobby: 10秒
- Pro: 60秒
- Enterprise: 900秒（15分）

**メモリ:**
- デフォルト: 1024MB
- 最大: 3008MB

**同時実行数:**
- Hobby: 100
- Pro: 1000
- Enterprise: 無制限

### 1.2. ステートレス

- ファイルシステムへの永続的な書き込み不可
- バックグラウンドプロセスの実行不可（リクエスト駆動のみ）

### 1.3. データベース接続

- 外部データベースへの接続は可能
- 接続プールの管理が必要

---

## 2. 機能別動作可能性分析

### 2.1. Session管理 ✅ 完全動作

**実装:**
- tRPCルーター内でPrismaを使用
- MySQLへの接続

**Vercelでの動作:**
- ✅ 完全に動作
- サーバーレス関数内でPrismaクライアントを使用
- 接続プールはPrismaが管理

**注意点:**
- コールドスタート時の接続確立に時間がかかる場合がある
- 接続プールの設定を最適化

### 2.2. Message送信・取得 ✅ 完全動作

**実装:**
- tRPCルーター内でDB操作

**Vercelでの動作:**
- ✅ 完全に動作
- 通常のDB操作と同じ

### 2.3. Task抽出 ⚠️ 動作するが制約あり

**実装:**
- flush()呼び出し時にLLMを使用してタスク抽出
- Experience Agentジョブを実行

**Vercelでの動作:**
- ✅ 動作する
- ⚠️ ただし、実行時間に注意

**制約:**
- LLM呼び出しに時間がかかる（5-15秒）
- Hobbyプラン（10秒制限）ではタイムアウトの可能性
- Proプラン（60秒制限）では問題なし

**対策:**
```typescript
// flush()のタイムアウトを短く設定
await aiSession.flush({
  sessionId,
  timeoutMs: 50000, // 50秒（Proプランの60秒制限内）
  pollIntervalMs: 1000,
});
```

### 2.4. flush()同期待機 ⚠️ 動作するが制約あり

**実装:**
- ブロッキング呼び出し
- ポーリングでジョブ完了を待機

**Vercelでの動作:**
- ✅ 動作する
- ⚠️ 実行時間制限に注意

**制約:**
- デフォルトタイムアウト60秒
- LLM呼び出しが複数回ある場合、時間がかかる

**対策:**
1. **タイムアウトを短く設定**
   ```typescript
   timeoutMs: 50000 // 50秒
   ```

2. **非同期処理に切り替え**
   ```typescript
   // flush()を呼ばず、非同期で処理
   await aiSession.complete(sessionId);
   // タスクは後で取得（ポーリング）
   ```

3. **段階的な処理**
   - タスク抽出のみ先に実行
   - スキル学習は後で非同期実行

### 2.5. Experience Agent（バックグラウンド処理）⚠️ 実装方式に依存

**問題点:**
- Vercelのサーバーレス関数はリクエスト駆動
- バックグラウンドプロセスは実行できない

**解決策:**

#### オプション1: Vercel Cron Jobs（推奨）

```typescript
// vercel.json
{
  "crons": [{
    "path": "/api/cron/process-experience-jobs",
    "schedule": "*/1 * * * *" // 1分ごと
  }]
}

// src/app/api/cron/process-experience-jobs/route.ts
export async function GET(request: Request) {
  // 未処理のジョブを取得
  const jobs = await prisma.aiExperienceJob.findMany({
    where: { status: 'pending' },
    take: 10,
  });
  
  // ジョブを処理
  for (const job of jobs) {
    await processExperienceJob(job);
  }
  
  return Response.json({ processed: jobs.length });
}
```

**メリット:**
- ✅ Vercel標準機能
- ✅ 確実に動作
- ✅ 追加コストなし（Proプラン以上）

**デメリット:**
- ⚠️ 最小間隔は1分（即座の処理は不可）
- ⚠️ Proプラン以上が必要

#### オプション2: ポーリング方式

```typescript
// flush()呼び出し時にポーリング
async function flushWithPolling(sessionId: string) {
  // ジョブを作成
  const job = await createExperienceJob(sessionId);
  
  // ポーリングで完了を待機
  let attempts = 0;
  const maxAttempts = 60; // 60秒（1秒間隔）
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updatedJob = await getExperienceJob(job.id);
    if (updatedJob.status === 'completed') {
      return updatedJob;
    }
    if (updatedJob.status === 'failed') {
      throw new Error('Job failed');
    }
    
    attempts++;
  }
  
  throw new Error('Timeout');
}
```

**メリット:**
- ✅ 即座に処理可能
- ✅ すべてのプランで動作

**デメリット:**
- ⚠️ サーバーレス関数の実行時間を消費
- ⚠️ タイムアウトのリスク

#### オプション3: 外部ジョブキュー（将来拡張）

- BullMQ + Redis
- AWS SQS
- ただし、追加インフラが必要

**推奨: オプション1（Vercel Cron Jobs）**

### 2.6. Skill学習 ⚠️ 動作するが制約あり

**実装:**
- タスク抽出後、LLMでスキルを抽出
- 複雑性判定を実行

**Vercelでの動作:**
- ✅ 動作する
- ⚠️ 実行時間に注意

**制約:**
- LLM呼び出しに時間がかかる（5-10秒）
- flush()内で実行する場合、タイムアウトに注意

**対策:**
- スキル学習を非同期で実行（Vercel Cron Jobs）

### 2.7. Skill検索 ✅ 完全動作

**fastモード:**
- MySQL FULLTEXT検索
- ✅ 完全に動作（< 200ms）

**agenticモード:**
- LLM探索
- ✅ 動作する（< 5s、Proプランで問題なし）

### 2.8. Disk/Artifact管理 ⚠️ ストレージタイプに依存

**実装:**
- ストレージアダプター（database/local/s3）

**Vercelでの動作:**

#### database（1MB未満）
- ✅ 完全に動作
- PrismaのBytes型で保存

#### local（ローカルファイルシステム）
- ❌ Vercelでは使用不可
- サーバーレス関数は読み取り専用ファイルシステム

#### s3（S3互換ストレージ）
- ✅ 完全に動作
- AWS S3、MinIO、Cloudflare R2等

**推奨:**
- 小ファイル（< 1MB）: database
- 大ファイル（≥ 1MB）: s3

**実装例:**
```typescript
// ストレージタイプの決定
function determineStorageType(size: number): AiStorageType {
  if (size < 1048576) { // 1MB
    return 'database';
  }
  return 's3'; // Vercelではlocalは使用不可
}
```

### 2.9. Dashboard UI ✅ 完全動作

**実装:**
- Next.js App Router
- tRPCクエリ

**Vercelでの動作:**
- ✅ 完全に動作
- 既存のUIと同じ

### 2.10. メトリクス集計 ⚠️ 実装方式に依存

**実装:**
- 日次集計クエリ

**Vercelでの動作:**
- ✅ 動作する
- ⚠️ 集計処理はVercel Cron Jobsで実行推奨

**実装例:**
```typescript
// vercel.json
{
  "crons": [{
    "path": "/api/cron/aggregate-metrics",
    "schedule": "0 1 * * *" // 毎日1時
  }]
}
```

---

## 3. 実装パターン別の動作可能性

### 3.1. パターン1: 同期処理（flush()使用）

**フロー:**
```
1. セッション作成
2. メッセージ送信
3. flush()呼び出し（同期待機）
   └─> タスク抽出（LLM: 5-10秒）
   └─> スキル学習（LLM: 5-10秒）
4. タスク取得
```

**Vercelでの動作:**
- ✅ Proプラン: 動作する（60秒制限内）
- ⚠️ Hobbyプラン: タイムアウトの可能性（10秒制限）

**推奨:**
- Proプラン以上を使用
- または、タイムアウトを短く設定

### 3.2. パターン2: 非同期処理（complete()使用）

**フロー:**
```
1. セッション作成
2. メッセージ送信
3. complete()呼び出し（非同期）
   └─> ジョブをキューに追加
4. Vercel Cron Jobsでジョブ処理
   └─> タスク抽出
   └─> スキル学習
5. タスク取得（ポーリング）
```

**Vercelでの動作:**
- ✅ すべてのプランで動作
- ✅ タイムアウトのリスクなし

**デメリット:**
- ⚠️ 即座にタスクを取得できない（最大1分の遅延）
- ⚠️ Proプラン以上が必要（Cron Jobs）

**推奨:**
- リアルタイム性が不要な場合

### 3.3. パターン3: ハイブリッド（推奨）

**フロー:**
```
1. セッション作成
2. メッセージ送信
3. flush()呼び出し（タイムアウト30秒）
   └─> タスク抽出のみ実行（5-10秒）
   └─> スキル学習はスキップ
4. タスク取得（即座に可能）
5. スキル学習は非同期（Vercel Cron Jobs）
```

**Vercelでの動作:**
- ✅ すべてのプランで動作
- ✅ タスクは即座に取得可能
- ✅ スキル学習は後で実行

**推奨:**
- このパターンを推奨

---

## 4. Vercelプラン別の動作可能性

### 4.1. Hobbyプラン（無料）

**動作する機能:**
- ✅ Session管理
- ✅ Message送信・取得
- ✅ Skill検索（fast/agentic）
- ✅ Disk/Artifact管理（database/s3）
- ✅ Dashboard UI

**制約がある機能:**
- ⚠️ flush()（10秒制限）
  - タスク抽出のみ実行（スキル学習は非同期）
  - タイムアウトを短く設定（8秒）

**動作しない機能:**
- ❌ Vercel Cron Jobs（Proプラン以上が必要）
  - 代替: ポーリング方式または外部トリガー

**推奨実装:**
- flush()でタスク抽出のみ
- スキル学習はポーリング方式または外部APIでトリガー

### 4.2. Proプラン（$20/月）

**動作する機能:**
- ✅ すべての機能が動作

**制約:**
- ⚠️ flush()のタイムアウトを50秒以内に設定
- ✅ Vercel Cron Jobs使用可能

**推奨実装:**
- ハイブリッドパターン（同期+非同期）

### 4.3. Enterpriseプラン

**動作する機能:**
- ✅ すべての機能が完全に動作
- ✅ 15分の実行時間制限
- ✅ 無制限の同時実行数

**制約:**
- なし

---

## 5. 実装時の注意事項

### 5.1. データベース接続

**問題:**
- コールドスタート時の接続確立に時間がかかる

**対策:**
```typescript
// Prisma接続プールの最適化
// prisma/schema.prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
  // 接続プール設定
  connection_limit = 10
  pool_timeout = 20
}
```

### 5.2. タイムアウト設定

**flush()のタイムアウト:**
```typescript
// Hobbyプラン用
await aiSession.flush({
  sessionId,
  timeoutMs: 8000, // 8秒（10秒制限内）
});

// Proプラン用
await aiSession.flush({
  sessionId,
  timeoutMs: 50000, // 50秒（60秒制限内）
});
```

### 5.3. エラーハンドリング

**タイムアウト時の処理:**
```typescript
try {
  await aiSession.flush({ sessionId, timeoutMs: 50000 });
} catch (error) {
  if (error.code === 'FLUSH_TIMEOUT') {
    // 非同期処理にフォールバック
    await aiSession.complete(sessionId);
    // ジョブは後で処理される
  }
}
```

### 5.4. ストレージ設定

**Vercel用設定:**
```env
# .env
AI_STORAGE_TYPE=s3  # localは使用不可
AI_STORAGE_S3_BUCKET=beautyclinic-ai-artifacts
AI_STORAGE_S3_REGION=ap-northeast-1
AI_STORAGE_DB_THRESHOLD=1048576  # 1MB
```

**S3互換ストレージの選択:**
- AWS S3
- Cloudflare R2（推奨: 無料枠あり）
- MinIO（自前ホスト）

---

## 6. 推奨実装パターン

### 6.1. Hobbyプラン用実装

```typescript
// タスク抽出のみ同期、スキル学習は非同期
export async function analyzeWithAiSession(input: AnalysisInput) {
  // 1. セッション作成
  const session = await aiSession.create({ spaceId: input.spaceId });
  
  // 2. メッセージ送信
  await aiSession.sendMessage({
    sessionId: session.id,
    blob: { role: 'user', content: JSON.stringify(input) },
  });
  
  // 3. タスク抽出のみ（タイムアウト短く）
  try {
    await aiSession.flush({
      sessionId: session.id,
      timeoutMs: 8000, // 8秒
      jobType: 'task_extraction', // タスク抽出のみ
    });
  } catch (error) {
    // タイムアウト時は非同期処理
    await aiSession.complete(session.id);
  }
  
  // 4. タスク取得
  const tasks = await aiSession.getTasks({ sessionId: session.id });
  
  // 5. スキル学習は非同期（外部APIでトリガー）
  // または、ポーリング方式
  
  return { result, sessionId: session.id, tasks };
}
```

### 6.2. Proプラン用実装（推奨）

```typescript
// ハイブリッドパターン
export async function analyzeWithAiSession(input: AnalysisInput) {
  // 1-2. セッション作成・メッセージ送信（同上）
  
  // 3. flush()（タスク抽出 + スキル学習）
  await aiSession.flush({
    sessionId: session.id,
    timeoutMs: 50000, // 50秒
    jobType: 'full_processing',
  });
  
  // 4. タスク取得
  const tasks = await aiSession.getTasks({ sessionId: session.id });
  
  return { result, sessionId: session.id, tasks };
}

// Vercel Cron Jobsでスキル学習を補完
// vercel.json
{
  "crons": [{
    "path": "/api/cron/process-experience-jobs",
    "schedule": "*/1 * * * *"
  }]
}
```

---

## 7. パフォーマンス目標（Vercel環境）

| 操作 | 目標値 | Vercelでの実現可能性 |
|------|-------|---------------------|
| セッション作成 | < 50ms | ✅ 問題なし |
| メッセージ保存 | < 50ms | ✅ 問題なし |
| メッセージ取得（100件） | < 100ms | ✅ 問題なし |
| flush（タスク抽出のみ） | < 10s | ⚠️ Hobby: 制限、Pro: OK |
| flush（スキル学習含む） | < 20s | ⚠️ Hobby: 不可、Pro: OK |
| スキル検索（fast） | < 200ms | ✅ 問題なし |
| スキル検索（agentic） | < 5s | ✅ ProプランでOK |
| アーティファクト保存（1MB） | < 500ms | ✅ S3使用時OK |
| アーティファクト取得（1MB） | < 300ms | ✅ S3使用時OK |

---

## 8. 結論と推奨事項

### 8.1. 結論

**Proプラン以上: 完全に動作します**
- ✅ すべての機能が動作
- ✅ Vercel Cron Jobs使用可能
- ✅ タイムアウト制限内で処理可能

**Hobbyプラン: 部分的に動作します**
- ✅ 基本機能は動作
- ⚠️ flush()は制約あり（タスク抽出のみ推奨）
- ⚠️ Vercel Cron Jobs不可（代替手段必要）

### 8.2. 推奨事項

**実装パターン:**
1. **Proプラン以上**: ハイブリッドパターン（同期+非同期）
2. **Hobbyプラン**: タスク抽出のみ同期、スキル学習は非同期

**ストレージ:**
- 小ファイル（< 1MB）: database
- 大ファイル（≥ 1MB）: s3（Cloudflare R2推奨）

**バックグラウンド処理:**
- Proプラン以上: Vercel Cron Jobs
- Hobbyプラン: ポーリング方式または外部API

### 8.3. 実装チェックリスト（Vercel対応）

- [ ] タイムアウト設定をプランに応じて調整
- [ ] ストレージタイプをs3に設定（localは使用不可）
- [ ] Vercel Cron Jobsの設定（Proプラン以上）
- [ ] エラーハンドリング（タイムアウト時のフォールバック）
- [ ] 接続プールの最適化
- [ ] パフォーマンステスト（コールドスタート含む）

---

**作成日**: 2025-01-XX
**バージョン**: 1.0


