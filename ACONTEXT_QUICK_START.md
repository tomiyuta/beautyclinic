# Acontext クイックスタートガイド

## ステップ1: 環境変数の設定（5分）

### 1. `.env`ファイルを開く

beauty projectのルートディレクトリにある`.env`ファイルを開きます。

### 2. 以下の環境変数を追加

```bash
# OpenAI API（必須）
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# オプション: S3ストレージ（大ファイル用）
# AI_STORAGE_TYPE=s3
# AI_STORAGE_S3_BUCKET=your-bucket-name
# AI_STORAGE_S3_REGION=ap-northeast-1
# AI_STORAGE_S3_ACCESS_KEY_ID=your-access-key-id
# AI_STORAGE_S3_SECRET_ACCESS_KEY=your-secret-access-key

# オプション: Vercel Cron Jobs認証
# CRON_SECRET=your-random-secret-string
```

**重要**: `OPENAI_API_KEY`は必須です。他の設定は後で追加できます。

### 3. サーバーを再起動

```bash
npm run dev
```

---

## ステップ2: 動作確認（10分）

### 方法1: ブラウザで確認（推奨）

1. **Acontextダッシュボードにアクセス**
   - `http://localhost:3000/ai-context` を開く

2. **セッションを作成**
   - 「新しいセッションを作成」ボタンをクリック

3. **メッセージを送信**
   - テキストエリアにメッセージを入力（例: "市場分析を実行してください"）
   - 「送信」ボタンをクリック

4. **タスク抽出を実行**
   - 「タスク抽出」ボタンをクリック
   - 5-10秒待つ

5. **結果を確認**
   - 右側の「抽出されたタスク」セクションにタスクが表示される

### 方法2: ブラウザのコンソールで確認

1. **開発者ツールを開く**（F12）

2. **コンソールで以下を実行**

```javascript
// セッション作成
const session = await window.trpc?.aiSession.create.mutate({
  title: "テストセッション",
});
console.log("セッション:", session);

// メッセージ送信
await window.trpc?.aiSession.sendMessage.mutate({
  sessionId: session.id,
  role: "user",
  content: "市場分析を実行してください",
});

// タスク抽出
await window.trpc?.aiSession.flush.mutate({
  sessionId: session.id,
  timeoutMs: 30000,
  jobType: "task_extraction",
});

// タスク取得
const tasks = await window.trpc?.aiSession.getTasks.query({
  sessionId: session.id,
});
console.log("タスク:", tasks);
```

---

## ステップ3: UI統合（既存機能への追加）

### 3.1. 戦略分析ページに統合

既存の戦略分析機能にAcontextを統合する例：

```typescript
// src/app/strategy-analysis/page.tsx に追加

import { api } from "@/trpc/react";

// 既存の分析処理の後に追加
const handleAnalyze = async () => {
  // 既存の分析処理...
  
  // Acontextセッションを作成
  const session = await api.aiSession.create.mutate({
    title: `戦略分析 - ${new Date().toLocaleDateString()}`,
  });

  // 分析結果をメッセージとして送信
  await api.aiSession.sendMessage.mutate({
    sessionId: session.id,
    role: "user",
    content: JSON.stringify(analysisResult),
  });

  // タスク抽出
  await api.aiSession.flush.mutate({
    sessionId: session.id,
    timeoutMs: 30000,
    jobType: "task_extraction",
  });
};
```

### 3.2. 専用ページの作成

既に`/ai-context`ページが作成されています。このページを使用するか、カスタマイズしてください。

---

## トラブルシューティング

### エラー: `OPENAI_API_KEY is not set`

**解決方法**:
1. `.env`ファイルに`OPENAI_API_KEY`を追加
2. サーバーを再起動

### エラー: タイムアウト

**解決方法**:
- `timeoutMs`を増やす（最大50000ms）
- `jobType: "task_extraction"`を使用（スキル学習をスキップ）

### エラー: データベースエラー

**解決方法**:
```bash
npx prisma db push
npx prisma generate
```

### ページが表示されない

**解決方法**:
- `http://localhost:3000/ai-context` にアクセス
- サーバーが起動しているか確認

---

## 次のステップ

1. **環境変数の設定** ✅
2. **動作確認** ✅
3. **UI統合** ✅

完了しました！Acontext機能を使用できます。

詳細は `ACONTEXT_SETUP_GUIDE.md` を参照してください。

