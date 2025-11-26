# Acontext セットアップガイド

## ステップ1: 環境変数の設定

### 1.1. `.env`ファイルの確認と編集

beauty projectのルートディレクトリにある`.env`ファイルを開き、以下の環境変数を追加してください。

```bash
# ============================================
# Acontext設定
# ============================================

# OpenAI API（必須）
# タスク抽出とスキル学習に使用
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# S3ストレージ設定（オプション、大ファイル用）
# 1MB以上のファイルは自動的にS3に保存されます
# 設定しない場合は、databaseストレージのみ使用（1MB未満のファイルのみ）
AI_STORAGE_TYPE=s3
AI_STORAGE_S3_BUCKET=your-bucket-name
AI_STORAGE_S3_REGION=ap-northeast-1
AI_STORAGE_S3_ACCESS_KEY_ID=your-access-key-id
AI_STORAGE_S3_SECRET_ACCESS_KEY=your-secret-access-key
AI_STORAGE_DB_THRESHOLD=1048576  # 1MB（デフォルト）

# Vercel Cron Jobs認証（オプション、推奨）
# 本番環境でCron Jobsを保護するためのシークレット
# ランダムな文字列を生成して設定してください
CRON_SECRET=your-random-secret-string-here
```

### 1.2. 環境変数の説明

#### 必須設定

- **`OPENAI_API_KEY`**: OpenAI APIキー（必須）
  - タスク抽出とスキル学習に使用
  - [OpenAI Platform](https://platform.openai.com/api-keys)で取得

#### オプション設定

- **S3ストレージ**: 大ファイル（1MB以上）を保存する場合
  - Cloudflare R2、AWS S3、MinIO等のS3互換ストレージに対応
  - 設定しない場合、1MB未満のファイルのみ保存可能

- **`CRON_SECRET`**: Vercel Cron Jobsの認証
  - 本番環境でCron Jobsを保護
  - ランダムな文字列を生成（例: `openssl rand -hex 32`）

### 1.3. 環境変数の確認

設定後、サーバーを再起動して環境変数が読み込まれているか確認してください。

```bash
# サーバーを再起動
npm run dev
```

---

## ステップ2: 動作確認

### 2.1. テストスクリプトの実行

以下のテストスクリプトを使用して、各機能の動作を確認できます。

#### テスト1: セッション作成とメッセージ送信

```typescript
// テスト用のコード（ブラウザのコンソールまたはテストファイルで実行）

// 1. セッション作成
const session = await trpc.aiSession.create.mutate({
  title: "テストセッション",
});

console.log("セッション作成成功:", session);

// 2. メッセージ送信
const message = await trpc.aiSession.sendMessage.mutate({
  sessionId: session.id,
  role: "user",
  content: "市場分析を実行してください。競合他社の価格を調査し、推奨価格を提案してください。",
});

console.log("メッセージ送信成功:", message);
```

#### テスト2: タスク抽出（flush）

```typescript
// flush()でタスク抽出を実行
const result = await trpc.aiSession.flush.mutate({
  sessionId: session.id,
  timeoutMs: 30000, // 30秒
  jobType: "task_extraction", // タスク抽出のみ
});

console.log("flush()成功:", result);

// タスクを取得
const tasks = await trpc.aiSession.getTasks.query({
  sessionId: session.id,
});

console.log("抽出されたタスク:", tasks);
```

#### テスト3: スキル検索

```typescript
// fastモード（FULLTEXT検索）
const skillsFast = await trpc.aiSession.searchSkills.query({
  query: "市場分析",
  mode: "fast",
  limit: 10,
});

console.log("fastモード検索結果:", skillsFast);

// agenticモード（LLM探索）
const skillsAgentic = await trpc.aiSession.searchSkills.query({
  query: "市場分析",
  mode: "agentic",
  limit: 10,
});

console.log("agenticモード検索結果:", skillsAgentic);
```

### 2.2. ブラウザでの動作確認

1. **開発サーバーを起動**
   ```bash
   npm run dev
   ```

2. **ブラウザでアクセス**
   - `http://localhost:3000` を開く

3. **ブラウザのコンソールでテスト**
   - 開発者ツール（F12）を開く
   - Consoleタブで上記のテストコードを実行

### 2.3. tRPC Playgroundでの確認

tRPC Playgroundを使用して、各エンドポイントを直接テストできます。

1. **tRPC Playgroundにアクセス**
   - `http://localhost:3000/api/trpc` （設定されている場合）

2. **各エンドポイントをテスト**
   - `aiSession.create`
   - `aiSession.sendMessage`
   - `aiSession.flush`
   - `aiSession.getTasks`
   - `aiSession.searchSkills`

### 2.4. 期待される動作

#### 正常な動作

- ✅ セッション作成: 新しいセッションIDが返される
- ✅ メッセージ送信: メッセージが保存される
- ✅ flush(): タスクが抽出される（5-10秒）
- ✅ タスク取得: 抽出されたタスクが表示される
- ✅ スキル検索: 関連するスキルが返される

#### エラーが発生した場合

- **`OPENAI_API_KEY is not set`**: 環境変数が設定されていません
- **タイムアウトエラー**: `timeoutMs`を増やすか、`jobType: "task_extraction"`を使用
- **データベースエラー**: Prismaマイグレーションが実行されているか確認

---

## ステップ3: UI統合

### 3.1. 基本的な統合パターン

既存のbeauty projectのUIにAcontext機能を統合する方法を説明します。

#### パターン1: 戦略分析ページに統合

既存の戦略分析機能にAcontextを統合して、会話履歴とタスクを表示します。

```typescript
// src/app/strategy-analysis/page.tsx に追加

import { trpc } from "@/trpc/client";

export default function StrategyAnalysisPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // セッション作成
  const createSession = trpc.aiSession.create.useMutation({
    onSuccess: (session) => {
      setSessionId(session.id);
    },
  });

  // メッセージ送信
  const sendMessage = trpc.aiSession.sendMessage.useMutation();
  
  // タスク取得
  const { data: tasks } = trpc.aiSession.getTasks.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  // flush()実行
  const flush = trpc.aiSession.flush.useMutation({
    onSuccess: () => {
      // タスクを再取得
      refetch();
    },
  });

  const handleAnalyze = async () => {
    // 1. セッション作成
    const session = await createSession.mutateAsync({
      title: "戦略分析",
    });

    // 2. メッセージ送信
    await sendMessage.mutateAsync({
      sessionId: session.id,
      role: "user",
      content: "市場分析を実行してください",
    });

    // 3. flush()でタスク抽出
    await flush.mutateAsync({
      sessionId: session.id,
      timeoutMs: 30000,
      jobType: "task_extraction",
    });
  };

  return (
    <div>
      <button onClick={handleAnalyze}>分析を実行</button>
      
      {/* タスク表示 */}
      {tasks && tasks.length > 0 && (
        <div>
          <h3>抽出されたタスク</h3>
          {tasks.map((task) => (
            <div key={task.id}>
              <p>{task.description}</p>
              <span>ステータス: {task.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### パターン2: 専用のAcontextダッシュボードページ

Acontext機能専用のダッシュボードページを作成します。

```typescript
// src/app/ai-context/page.tsx を作成

"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";

export default function AcontextDashboardPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // セッション一覧
  const { data: sessions } = trpc.aiSession.list.useQuery({ limit: 20 });

  // メッセージ取得
  const { data: messages } = trpc.aiSession.getMessages.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  // タスク取得
  const { data: tasks } = trpc.aiSession.getTasks.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  // セッション作成
  const createSession = trpc.aiSession.create.useMutation({
    onSuccess: (session) => {
      setSessionId(session.id);
    },
  });

  // メッセージ送信
  const sendMessage = trpc.aiSession.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      // メッセージを再取得
    },
  });

  // flush()実行
  const flush = trpc.aiSession.flush.useMutation({
    onSuccess: () => {
      // タスクを再取得
    },
  });

  const handleSendMessage = async () => {
    if (!sessionId || !message) return;

    await sendMessage.mutateAsync({
      sessionId,
      role: "user",
      content: message,
    });
  };

  const handleFlush = async () => {
    if (!sessionId) return;

    await flush.mutateAsync({
      sessionId,
      timeoutMs: 30000,
      jobType: "task_extraction",
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Acontext Dashboard</h1>

      {/* セッション作成 */}
      <button
        onClick={() => createSession.mutate({ title: "新しいセッション" })}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        新しいセッションを作成
      </button>

      {/* セッション一覧 */}
      {sessions && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">セッション一覧</h2>
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => setSessionId(session.id)}
              className={`p-2 mb-2 border rounded cursor-pointer ${
                sessionId === session.id ? "bg-blue-100" : ""
              }`}
            >
              {session.title || "無題のセッション"}
            </div>
          ))}
        </div>
      )}

      {/* メッセージ送信 */}
      {sessionId && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">メッセージ送信</h2>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border rounded mb-2"
            rows={4}
          />
          <button
            onClick={handleSendMessage}
            className="px-4 py-2 bg-green-500 text-white rounded mr-2"
          >
            送信
          </button>
          <button
            onClick={handleFlush}
            className="px-4 py-2 bg-purple-500 text-white rounded"
          >
            タスク抽出（flush）
          </button>
        </div>
      )}

      {/* メッセージ表示 */}
      {messages && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">メッセージ履歴</h2>
          {messages.map((msg) => (
            <div key={msg.id} className="p-2 mb-2 border rounded">
              <strong>{msg.role}:</strong> {msg.content}
            </div>
          ))}
        </div>
      )}

      {/* タスク表示 */}
      {tasks && tasks.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">抽出されたタスク</h2>
          {tasks.map((task) => (
            <div key={task.id} className="p-2 mb-2 border rounded">
              <p className="font-semibold">{task.description}</p>
              <span className="text-sm text-gray-500">
                ステータス: {task.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 3.2. 既存機能への統合例

#### 戦略分析ページへの統合

```typescript
// src/app/strategy-analysis/page.tsx の既存コードに追加

// 既存の戦略分析処理の後に、Acontextセッションを作成
const handleStrategyAnalysis = async () => {
  // 既存の分析処理...
  
  // Acontextセッションを作成
  const session = await trpc.aiSession.create.mutate({
    title: `戦略分析 - ${new Date().toLocaleDateString()}`,
  });

  // 分析結果をメッセージとして送信
  await trpc.aiSession.sendMessage.mutate({
    sessionId: session.id,
    role: "user",
    content: JSON.stringify({
      type: "strategy_analysis",
      data: analysisResult,
    }),
  });

  // タスク抽出
  await trpc.aiSession.flush.mutate({
    sessionId: session.id,
    timeoutMs: 30000,
    jobType: "task_extraction",
  });
};
```

### 3.3. UIコンポーネントの作成

再利用可能なUIコンポーネントを作成します。

```typescript
// src/components/ai-context/TaskList.tsx

"use client";

import { trpc } from "@/trpc/client";

interface TaskListProps {
  sessionId: string;
}

export function TaskList({ sessionId }: TaskListProps) {
  const { data: tasks, isLoading } = trpc.aiSession.getTasks.useQuery({
    sessionId,
  });

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  if (!tasks || tasks.length === 0) {
    return <div>タスクがありません</div>;
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">抽出されたタスク</h3>
      <ul>
        {tasks.map((task) => (
          <li key={task.id} className="mb-2 p-2 border rounded">
            <p>{task.description}</p>
            <span className="text-sm text-gray-500">
              ステータス: {task.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## トラブルシューティング

### よくある問題と解決方法

#### 1. `OPENAI_API_KEY is not set` エラー

**原因**: 環境変数が設定されていない

**解決方法**:
- `.env`ファイルに`OPENAI_API_KEY`を追加
- サーバーを再起動

#### 2. タイムアウトエラー

**原因**: `flush()`の実行時間が長すぎる

**解決方法**:
- `timeoutMs`を増やす（最大50000ms）
- `jobType: "task_extraction"`を使用（スキル学習をスキップ）

#### 3. データベースエラー

**原因**: マイグレーションが実行されていない

**解決方法**:
```bash
npx prisma db push
npx prisma generate
```

#### 4. Vercel Cron Jobsが動作しない

**原因**: 認証設定やスケジュール設定の問題

**解決方法**:
- `vercel.json`の設定を確認
- `CRON_SECRET`を設定
- VercelダッシュボードでCron Jobsの状態を確認

---

## 次のステップ

1. **パフォーマンス最適化**
   - キャッシュの実装
   - バッチ処理の最適化

2. **エラーハンドリング強化**
   - リトライロジック
   - エラーログの記録

3. **UI/UXの改善**
   - リアルタイム更新
   - 進捗表示
   - エラーメッセージの表示

---

**作成日**: 2025-01-XX
**バージョン**: 1.0

