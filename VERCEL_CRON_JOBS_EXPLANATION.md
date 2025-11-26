# Vercel Cron Jobs 解説と実装例

## 1. Vercel Cron Jobsとは

### 1.1. 概要

**Vercel Cron Jobs**は、Vercelが提供する**スケジュール実行機能**です。指定した時間間隔で、指定したAPIエンドポイントを自動的に呼び出します。

**従来の問題:**
- サーバーレス関数はリクエスト駆動（誰かがアクセスしないと実行されない）
- バックグラウンド処理を実行できない
- 定期的な処理（データ集計、クリーンアップ等）ができない

**Vercel Cron Jobsの解決:**
- 指定したスケジュールで自動実行
- サーバーレス関数を定期的に呼び出し
- バックグラウンド処理を実現

### 1.2. 基本的な仕組み

```
┌─────────────────┐
│  Vercel Platform │
│                  │
│  Cron Scheduler  │───定期的に───┐
│                  │              │
└─────────────────┘              │
                                 ▼
                        ┌─────────────────┐
                        │  API Endpoint   │
                        │  /api/cron/...  │
                        └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  処理実行       │
                        │  - ジョブ処理   │
                        │  - データ集計   │
                        │  - クリーンアップ│
                        └─────────────────┘
```

### 1.3. 設定方法

**vercel.jsonに設定:**
```json
{
  "crons": [
    {
      "path": "/api/cron/my-job",
      "schedule": "*/5 * * * *"  // 5分ごと
    }
  ]
}
```

**スケジュール形式（Cron式）:**
```
分 時 日 月 曜日
*  *  *  *  *
```

**例:**
- `*/1 * * * *` - 1分ごと
- `0 * * * *` - 1時間ごと
- `0 0 * * *` - 毎日0時
- `0 1 * * *` - 毎日1時

### 1.4. プラン別の対応

| プラン | Cron Jobs | 最小間隔 |
|--------|-----------|----------|
| Hobby | ❌ 利用不可 | - |
| Pro | ✅ 利用可能 | 1分 |
| Enterprise | ✅ 利用可能 | 1分 |

---

## 2. 今回の実装での使用目的

### 2.1. 問題: Experience Agentのバックグラウンド処理

**Acontextの要件:**
- タスク抽出: メッセージ送信後、バックグラウンドでタスクを抽出（5-10秒）
- スキル学習: タスク完了後、バックグラウンドでスキルを学習（5-10秒）

**Vercelの制約:**
- サーバーレス関数はリクエスト駆動
- バックグラウンドプロセスは実行できない
- 長時間実行される処理はタイムアウト

**解決策: Vercel Cron Jobs**

### 2.2. 実装パターン

#### パターン1: 非同期処理（推奨）

**フロー:**
```
1. ユーザーが分析を実行
   └─> セッション作成
   └─> メッセージ送信
   └─> complete()呼び出し（非同期）
       └─> ジョブをキューに追加（AiExperienceJob）

2. Vercel Cron Jobs（1分ごと）
   └─> /api/cron/process-experience-jobs を呼び出し
       └─> 未処理のジョブを取得
       └─> タスク抽出実行
       └─> スキル学習実行
       └─> ジョブ完了

3. ユーザーがタスクを確認
   └─> ポーリングまたはページリロード
   └─> タスク取得
```

#### パターン2: ハイブリッド（同期+非同期）

**フロー:**
```
1. ユーザーが分析を実行
   └─> セッション作成
   └─> メッセージ送信
   └─> flush()呼び出し（同期、タイムアウト30秒）
       └─> タスク抽出のみ実行（5-10秒）
       └─> スキル学習はスキップ

2. タスク取得（即座に可能）

3. Vercel Cron Jobs（1分ごと）
   └─> 未処理のスキル学習ジョブを処理
```

---

## 3. 具体的な実装例

### 3.1. vercel.jsonの設定

```json
{
  "crons": [
    {
      "path": "/api/cron/process-experience-jobs",
      "schedule": "*/1 * * * *"  // 1分ごと
    },
    {
      "path": "/api/cron/aggregate-metrics",
      "schedule": "0 1 * * *"  // 毎日1時
    }
  ]
}
```

### 3.2. Experience Agentジョブ処理

**ファイル: `src/app/api/cron/process-experience-jobs/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { processExperienceJob } from '@/server/services/ai-experience/job-processor';

/**
 * Vercel Cron Jobsから呼び出される
 * 1分ごとに未処理のExperience Agentジョブを処理
 */
export async function GET(request: NextRequest) {
  // 認証: Vercel Cron Jobsからのリクエストか確認
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 未処理のジョブを取得（優先度順、最大10件）
    const jobs = await db.aiExperienceJob.findMany({
      where: {
        status: 'pending',
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: 10,
    });

    if (jobs.length === 0) {
      return NextResponse.json({ 
        message: 'No pending jobs',
        processed: 0 
      });
    }

    // ジョブを処理
    const results = [];
    for (const job of jobs) {
      try {
        // ジョブステータスを「処理中」に更新
        await db.aiExperienceJob.update({
          where: { id: job.id },
          data: {
            status: 'processing',
            startedAt: new Date(),
          },
        });

        // ジョブを処理
        const result = await processExperienceJob(job);
        
        // ジョブステータスを「完了」に更新
        await db.aiExperienceJob.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            output: result,
          },
        });

        results.push({ jobId: job.id, status: 'success' });
      } catch (error) {
        // エラー処理
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        await db.aiExperienceJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            completedAt: new Date(),
            errorMessage,
            attempts: { increment: 1 },
          },
        });

        results.push({ jobId: job.id, status: 'failed', error: errorMessage });
      }
    }

    return NextResponse.json({
      message: 'Jobs processed',
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 3.3. ジョブ処理ロジック

**ファイル: `src/server/services/ai-experience/job-processor.ts`**

```typescript
import { db } from '@/server/db';
import { extractTasks } from './task-extractor';
import { learnSkill } from './skill-learner';
import type { AiExperienceJob, AiExperienceJobType } from '@prisma/client';

export async function processExperienceJob(
  job: AiExperienceJob
): Promise<{ tasksExtracted: number; skillsLearned: number }> {
  const session = await db.aiSession.findUnique({
    where: { id: job.sessionId },
    include: { messages: true },
  });

  if (!session) {
    throw new Error('Session not found');
  }

  let tasksExtracted = 0;
  let skillsLearned = 0;

  // ジョブタイプに応じて処理
  if (job.jobType === 'task_extraction' || job.jobType === 'full_processing') {
    // タスク抽出
    const tasks = await extractTasks(session);
    tasksExtracted = tasks.length;

    // セッションのexperienceStatusを更新
    await db.aiSession.update({
      where: { id: session.id },
      data: {
        experienceStatus: tasks.length > 0 ? 'completed' : 'skipped',
      },
    });
  }

  if (job.jobType === 'skill_learning' || job.jobType === 'full_processing') {
    // スキル学習
    if (session.spaceId) {
      const tasks = await db.aiTask.findMany({
        where: {
          sessionId: session.id,
          status: 'success',
        },
      });

      for (const task of tasks) {
        const skill = await learnSkill(task, session);
        if (skill) {
          skillsLearned++;
        }
      }
    }
  }

  return { tasksExtracted, skillsLearned };
}
```

### 3.4. メトリクス集計

**ファイル: `src/app/api/cron/aggregate-metrics/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';

/**
 * 毎日1時に実行される
 * 前日のメトリクスを集計
 */
export async function GET(request: NextRequest) {
  // 認証確認（同上）

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    // セッションメトリクスを集計
    const sessionMetrics = await db.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        space_id,
        COUNT(*) as total_sessions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
        SUM(CASE WHEN status = 'abandoned' THEN 1 ELSE 0 END) as abandoned_sessions
      FROM ai_sessions
      WHERE DATE(created_at) = ${dateStr}
      GROUP BY DATE(created_at), space_id
    `;

    // タスクメトリクスを集計
    const taskMetrics = await db.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_tasks,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_tasks
      FROM ai_tasks
      WHERE DATE(created_at) = ${dateStr}
      GROUP BY DATE(created_at)
    `;

    // メトリクスを保存
    for (const metric of sessionMetrics) {
      await db.aiSessionMetrics.upsert({
        where: {
          date_spaceId: {
            date: new Date(metric.date),
            spaceId: metric.space_id || null,
          },
        },
        create: {
          date: new Date(metric.date),
          spaceId: metric.space_id || null,
          totalSessions: metric.total_sessions,
          completedSessions: metric.completed_sessions,
          abandonedSessions: metric.abandoned_sessions,
          // ... 他のフィールド
        },
        update: {
          totalSessions: metric.total_sessions,
          completedSessions: metric.completed_sessions,
          abandonedSessions: metric.abandoned_sessions,
        },
      });
    }

    return NextResponse.json({
      message: 'Metrics aggregated',
      date: dateStr,
      sessions: sessionMetrics.length,
      tasks: taskMetrics.length,
    });
  } catch (error) {
    console.error('Metrics aggregation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 4. 実装の詳細

### 4.1. ジョブキューシステム

**データモデル:**
```prisma
model AiExperienceJob {
  id          String   @id @default(uuid())
  sessionId   String
  jobType     AiExperienceJobType  // task_extraction | skill_learning | full_processing
  status      AiJobStatus          // pending | processing | completed | failed
  priority    Int      @default(0)
  attempts    Int      @default(0)
  maxAttempts Int      @default(3)
  timeoutMs   Int      @default(60000)
  createdAt   DateTime @default(now())
  startedAt   DateTime?
  completedAt DateTime?
  // ...
}
```

**ジョブの作成:**
```typescript
// セッション完了時にジョブを作成
await db.aiExperienceJob.create({
  data: {
    sessionId: session.id,
    jobType: 'full_processing',
    status: 'pending',
    priority: 0,
  },
});
```

**ジョブの処理:**
```typescript
// Vercel Cron Jobsから呼び出される
const jobs = await db.aiExperienceJob.findMany({
  where: { status: 'pending' },
  orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  take: 10,
});

for (const job of jobs) {
  await processExperienceJob(job);
}
```

### 4.2. 認証とセキュリティ

**問題:**
- 誰でもAPIエンドポイントにアクセスできる
- 悪意のあるリクエストの可能性

**解決策: CRON_SECRET**

```typescript
// .env
CRON_SECRET=your-secret-key-here

// APIエンドポイント
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ...
}
```

**Vercelの自動認証:**
- Vercel Cron Jobsからのリクエストには自動的に認証ヘッダーが付与される
- ただし、手動でテストする場合は`CRON_SECRET`を使用

### 4.3. エラーハンドリングとリトライ

**リトライロジック:**
```typescript
// ジョブ処理失敗時
if (job.attempts < job.maxAttempts) {
  await db.aiExperienceJob.update({
    where: { id: job.id },
    data: {
      status: 'pending',
      attempts: { increment: 1 },
    },
  });
  // 次回のCron実行で再試行
} else {
  // 最大試行回数に達した場合、失敗として記録
  await db.aiExperienceJob.update({
    where: { id: job.id },
    data: {
      status: 'failed',
      errorMessage: 'Max attempts reached',
    },
  });
}
```

---

## 5. 動作フロー（具体例）

### 5.1. ユーザーが戦略分析を実行

```
1. ユーザーが「総合分析を実行」ボタンをクリック
   └─> tRPC: strategy.analyzeMarketPosition

2. 統合ヘルパー関数が実行
   └─> withAiSession() 呼び出し
       ├─> セッション作成
       ├─> ユーザー要求をメッセージとして保存
       ├─> 既存の分析ロジック実行
       ├─> 結果をメッセージとして保存
       └─> complete()呼び出し
           └─> ジョブをキューに追加
               └─> AiExperienceJob作成（status: pending）

3. 分析結果をユーザーに返却
   └─> sessionIdを含む
```

### 5.2. Vercel Cron Jobsが実行（1分後）

```
1. Vercelが /api/cron/process-experience-jobs を呼び出し

2. APIエンドポイントが実行
   └─> 未処理のジョブを取得（status: pending）
       └─> 最大10件

3. 各ジョブを処理
   └─> processExperienceJob() 呼び出し
       ├─> セッションとメッセージを取得
       ├─> タスク抽出（LLM呼び出し: 5-10秒）
       │   └─> AiTask作成
       ├─> 複雑性判定
       └─> スキル学習（条件満たす場合）
           └─> AiSkillBlock作成

4. ジョブステータスを更新
   └─> status: completed

5. セッションのexperienceStatusを更新
   └─> experienceStatus: completed
```

### 5.3. ユーザーがタスクを確認

```
1. ユーザーが「タスク進捗を確認」ボタンをクリック
   └─> tRPC: aiSession.getTasks

2. タスクを取得
   └─> flush()が完了していればタスクが取得可能
   └─> 未完了の場合は空配列または「処理中」メッセージ

3. フロントエンドでポーリング（オプション）
   └─> 5秒ごとにタスクを取得
   └─> タスクが取得できたらポーリング停止
```

---

## 6. メリットとデメリット

### 6.1. メリット

1. **Vercel標準機能**
   - 追加のインフラ不要
   - 設定が簡単

2. **確実な実行**
   - Vercelが管理
   - 障害時の自動リトライ

3. **コスト効率**
   - Proプランに含まれる
   - 追加コストなし

### 6.2. デメリット

1. **最小間隔の制限**
   - 1分が最小間隔
   - 即座の処理は不可

2. **プラン制限**
   - Proプラン以上が必要
   - Hobbyプランでは使用不可

3. **実行時間の制限**
   - サーバーレス関数の制限（60秒）が適用
   - 長時間処理は分割が必要

---

## 7. 代替案（Hobbyプラン用）

### 7.1. ポーリング方式

```typescript
// flush()呼び出し時にポーリング
async function flushWithPolling(sessionId: string) {
  const job = await createExperienceJob(sessionId);
  
  // フロントエンドでポーリング
  // または、サーバー側で短時間ポーリング
  let attempts = 0;
  while (attempts < 30) { // 30秒
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updatedJob = await getExperienceJob(job.id);
    if (updatedJob.status === 'completed') {
      return updatedJob;
    }
    attempts++;
  }
  
  // タイムアウト時は非同期処理にフォールバック
  throw new Error('Timeout');
}
```

### 7.2. 外部APIトリガー

```typescript
// 外部サービス（Zapier、Make.com等）からAPIを呼び出し
// または、別のサーバーから定期的にAPIを呼び出し
```

---

## 8. まとめ

### Vercel Cron Jobsの役割

1. **バックグラウンド処理の実現**
   - Experience Agentジョブの処理
   - タスク抽出、スキル学習

2. **定期処理の実行**
   - メトリクス集計
   - データクリーンアップ

3. **サーバーレス環境での制約の回避**
   - リクエスト駆動の制約を回避
   - 定期的な処理を実現

### 今回の実装での使用

- **Experience Agentジョブ処理**: 1分ごと
- **メトリクス集計**: 毎日1時
- **その他の定期処理**: 必要に応じて追加

**注意:** Proプラン以上が必要

---

**作成日**: 2025-01-XX
**バージョン**: 1.0


