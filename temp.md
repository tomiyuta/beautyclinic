# Claude向けコンテキスト: beautyclinic における Acontext 実装状況

以下は、**現時点ですでに実装済みの Acontext 関連機能**を、Claude に伝えるための要約です。
（要件定義書ベースで「何を、どこまで作ったか」を整理しています）

---

## 1. データモデル（Prisma / MySQL）

Prisma の `schema.prisma` に、Acontext 向けのモデル・Enum を追加済みです。

### 1.1 モデル

- **AiSpace**  
  スペース（ワークスペース/プロジェクト）単位のメタ情報。`id`, `userId`, `name`, `description`, `metadata`, `createdAt`, `updatedAt` を保持します。

- **AiSession**  
  会話セッション。`id`, `spaceId`, `title`, `status`(enum), `context`(Json), `experienceStatus`(enum), `createdAt`, `updatedAt`, `completedAt` などを持ちます。`AiSpace` と 1:n です。

- **AiMessage**  
  セッション内メッセージ。`id`, `sessionId`, `role`("user"/"assistant"/"system"), `content`, `metadata`, `createdAt` を持ち、`AiSession` に紐付きます。

- **AiTask**  
  会話から抽出されたタスク。`id`, `sessionId`, `order`, `description`, `status`(enum), `progresses`(Json), `userPreferences`(Json), `createdAt`, `updatedAt`, `completedAt` などを保持します。

- **AiSkill**  
  学習された SOP/スキル。`id`, `spaceId`, `name`, `description`, `steps`(Json), `complexity`(enum), `tags`(Json), `usageCount`, `successRate`, `createdAt`, `updatedAt` を持ちます。

- **AiExperienceJob**  
  バックグラウンドジョブ（Experience Agent 用）。`id`, `sessionId`, `jobType`(string: `"task_extraction" | "skill_learning" | "full_processing"`), `status`(enum), `input`(Json), `output`(Json), `error`, `createdAt`, `updatedAt`, `completedAt` などを保持します。

- **AiArtifact**  
  アーティファクト（Disk 相当）。`id`, `sessionId`, `name`, `storageType`(enum: `database | s3 | local`), `path`, `size`, `mimeType`, `metadata`, `createdAt`, `updatedAt` を持ちます。

- **AiMetric**  
  メトリクス（集計データ）。`id`, `spaceId`, `metricType`(例: `"daily" | "weekly" | "monthly"`), `date`, `data`(Json), `createdAt` を持ちます。

### 1.2 Enum

- `AiSessionStatus`: `active | completed | archived`
- `AiExperienceStatus`: `pending | processing | completed | failed`
- `AiTaskStatus`: `pending | running | success | failed`
- `AiStorageType`: `database | s3 | local`（実運用では `database` + `s3` を想定）
- `AiSkillComplexity`: `simple | medium | complex`

---

## 2. サービス層（`src/server/services/ai-context`）

`src/server/services/ai-context/` 以下に、Use Case ごとのサービスを実装済みです。すべて Node/TypeScript + OpenAI SDK で動作します（Acontextネイティブ版で、Anthropic ではなく OpenAI を使用）。

### 2.1 セッション管理（`ai-session.ts`）

- `createSession({ spaceId?, title?, context? })`
  - `AiSession` を作成。`status = "active"`, `experienceStatus = "pending"` で初期化。

- `sendMessage({ sessionId, role, content, metadata? })`
  - `AiMessage` を作成し、会話履歴として保存。

- `getMessages({ sessionId, limit?, offset? })`
  - 指定セッションのメッセージを、`createdAt` 昇順で取得。

- `getTasks(sessionId)`
  - セッションに紐づく `AiTask` の一覧を `order` 昇順で取得。

- `getSession(sessionId)` / `listSessions(spaceId?, limit?)`
  - セッション詳細（space, messages, tasks）およびセッション一覧（メッセージ数・タスク数のカウント付き）を取得。

- `completeSession(sessionId)`
  - セッションを `status = "completed"` にし、`completedAt` を更新。
  - 併せて `AiExperienceJob` を enqueue（`jobType = "full_processing"`, `status = "pending"`）。

#### flush（同期タスク抽出＋オプションでスキル学習）

- `flush({ sessionId, timeoutMs = 50000, jobType = "task_extraction" | "full_processing" })`
  - セッション中のメッセージを全件取得し、`"role: content"` 形式で連結して `conversation` 文字列を生成。
  - `extractTasks(conversation)` を呼び出し、LLM からタスク配列を取得。
  - 得られたタスクを `AiTask` に保存。
  - `jobType === "full_processing"` かつ残り時間が十分ある場合、`learnSkill(completedTasks)` を同期的に実行し、スキルを `AiSkill` に保存。
  - 時間が足りない、またはエラー時には、`AiExperienceJob` に `jobType = "skill_learning"` のジョブを enqueue してフォールバック。
  - 戻り値として `{ success: true, tasks, message }` を返却。

### 2.2 タスク抽出（`task-extraction.ts`）

- `extractTasks(conversation: string, { timeoutMs? })`
  - OpenAI `gpt-4o-mini` を使用。
  - 要件定義書ベースの日本語プロンプト（TASK_EXTRACTION）を利用し、タスク配列を JSON 形式で生成させる。
  - 出力形式の揺れ（`[ ... ]` だけでなく `{ tasks: [...] }` など）にも対応できるよう、パースロジックを実装済み。
  - 正規化された Task 型: `{ order: number, description: string, status: "pending" | "running" | "success" | "failed", progresses?: string[], userPreferences?: string[] }`。

### 2.3 スキル学習（`skill-learning.ts`）

- `learnSkill(completedTasks: Task[], { timeoutMs? })`
  - `status = "success"` なタスクをまとめてテキスト化（説明・進捗・ユーザーの好みなどを含める）。
  - OpenAI `gpt-4o-mini` + SKILL_LEARNING プロンプトで SOP/スキルを抽出。
  - 単一オブジェクト or 配列 or `{ skills: [...] }` などのフォーマットの揺れに対応しつつ、
    - `name`, `description`, `steps[{ order, action, tool?, description }]`, `complexity`, `tags?`
    を正規化して返す。

### 2.4 スキル検索（`skill-search.ts`）

- `searchSkillsFast(query, spaceId?, limit)`
  - LIKE 検索で `name` / `description` を対象に高速検索（将来的に FULLTEXT に差し替え可能な設計）。

- `searchSkillsAgentic(query, spaceId?, limit)`
  - 代表的な既存スキルを LLM に渡し、関連キーワード・タグ・検索クエリを生成。
  - それらをもとに `searchSkillsFast` を複数回呼び出し、スコアリングして上位のスキルを返す。

- `searchSkills({ query, spaceId?, mode = "fast" | "agentic", limit? })`
  - 上記2モードを統一するフロント関数。

### 2.5 ストレージアダプター（`storage-adapter.ts`）

- `saveArtifact({ sessionId?, name, data, mimeType?, metadata? })`
  - `Buffer` 長と `AI_STORAGE_TYPE`（および `AI_STORAGE_DB_THRESHOLD`）に応じて、`database` か `s3` に保存先を振り分け。
  - `AiArtifact` に `storageType`, `path`, `size`, `mimeType`, `metadata` を保存。

- `getArtifact({ artifactId })`
  - `AiArtifact` を見て、`database` or `s3` から実データを取得。
  - 現実装では s3 パスを使った取得部分を実装済み（Cloudflare R2 / S3 想定）。

- `listArtifacts(sessionId?, limit)`
  - セッション単位または全体でアーティファクト一覧を返す。

### 2.6 Experience Agent（`experience-agent.ts`）

- `processExperienceJobs(limit)`
  - `status = "pending"` の `AiExperienceJob` を古い順に最大 `limit` 件取得。
  - `jobType` に応じて以下を実行：
    - `"task_extraction"` : セッションにタスクがなければ `extractTasks`→`AiTask` 保存。
    - `"skill_learning"` : セッションの完了タスクを `learnSkill`→`AiSkill` 保存。
    - `"full_processing"` : 上記2つを両方実行。
  - 成功時は `status = "completed"`, `completedAt` 更新。失敗時は `status = "failed"` と `error` にメッセージ保存。

---

## 3. tRPCルーター / API

### 3.1 tRPCルーター（`src/server/api/routers/ai-session.ts`）

`aiSession` 名前空間として、以下のエンドポイントを公開しています：

- `aiSession.create` — セッション作成
- `aiSession.sendMessage` — メッセージ送信
- `aiSession.getMessages` — メッセージ一覧取得
- `aiSession.flush` — タスク抽出（＋条件付きでスキル学習）
- `aiSession.getTasks` — タスク一覧取得
- `aiSession.get` — セッション詳細取得
- `aiSession.list` — セッション一覧取得
- `aiSession.complete` — セッション完了＋ジョブenqueue
- `aiSession.searchSkills` — スキル検索（fast / agentic）
- `aiSession.saveArtifact` / `aiSession.getArtifact` / `aiSession.listArtifacts` — アーティファクトの保存・取得・一覧

`src/server/api/root.ts` の `appRouter` に `aiSession: aiSessionRouter` を追加済みです。

### 3.2 Cron 用 HTTP エンドポイント（Next.js Route Handlers）

- `src/app/api/cron/process-experience-jobs/route.ts`
  - GET で `processExperienceJobs(10)` を実行。
  - `Authorization: Bearer ${CRON_SECRET}` による簡易認証実装済み。

- `src/app/api/cron/aggregate-metrics/route.ts`
  - 「昨日」の `AiSession` / `AiTask` / `AiSkill` を集計し、`AiMetric(metricType = "daily")` に保存。

---

## 4. フロントエンド / UI

### 4.1 Acontextダッシュボード `/ai-context`

- ファイル: `src/app/ai-context/page.tsx`
- 技術スタック: Next.js App Router + Atlassian UI コンポーネント（Button, Badge, TextField, Spinner, EmptyState など）

**ページ構成:**

- 上部ヘッダー
  - タイトル「Acontextダッシュボード」
  - OpenAIキーが API Key 設定画面から共有されていることの説明テキスト

- セッション作成
  - 「新しいセッションを作成」ボタン → `aiSession.create` 実行 → 新規セッションをアクティブに選択

- 左カラム: セッション一覧
  - `aiSession.list` の結果をカード風UIで表示（タイトル・作成日時・メッセージ数）
  - クリックで `sessionId` を選択し、右カラムの内容が切り替わる

- 右上: メッセージ送信＋履歴
  - TextField でメッセージ入力 → 送信ボタン or ⌘/Ctrl+Enter で `aiSession.sendMessage`
  - 下にメッセージ履歴を吹き出し形式（ユーザーは右寄せ・青系、アシスタントは左寄せ・グレー系）で表示
  - 「タスク抽出」ボタン → `aiSession.flush({ jobType: "task_extraction" })` を呼び出し、同期的にタスク抽出

- 右下: 抽出タスク一覧
  - `aiSession.getTasks` の結果をカード一覧として表示
  - 各タスクについて: 説明文、順序（#1, #2...）、ステータス Badge（success / running / failed / pending）、進捗メモ（あればリスト表示）を表示

### 4.2 ナビゲーション統合

- `src/components/Navigation.tsx`
  - 既存メニュー（商品管理、市場調査、SNS調査、戦略分析、戦略管理、コンテンツ生成、ワークフロー管理、APIキー設定、プロンプト管理）に加えて、
  - `🧠 Acontextダッシュボード (/ai-context)` をメニュー項目として追加済み。

---

## 5. インフラ / 環境変数

### 5.1 Vercel Cron Jobs（`vercel.json`）

- `crons` セクションで以下を設定：
  - `*/1 * * * *` → `/api/cron/process-experience-jobs`
  - `0 1 * * *` → `/api/cron/aggregate-metrics`

### 5.2 環境変数

- 既存の API Key 設定画面から `.env` に書き込まれる値：
  - `OPENAI_API_KEY` — Acontext のすべての OpenAI 呼び出しで使用

- Acontext 用として設計上考慮しているが、現時点ではオプション扱いの値：
  - `AI_STORAGE_TYPE`（`database` or `s3`。Vercel 本番では `s3` を想定）
  - `AI_STORAGE_S3_BUCKET`, `AI_STORAGE_S3_REGION`, `AI_STORAGE_S3_ACCESS_KEY_ID`, `AI_STORAGE_S3_SECRET_ACCESS_KEY`
  - `AI_STORAGE_DB_THRESHOLD`（database に保存する最大バイト数、デフォルト 1MB）
  - `CRON_SECRET`（Cron エンドポイント用の Bearer トークン）

---

## 6. まだ実装していない / 簡略化している部分

Claude に「今後の設計・実装を手伝ってほしいポイント」として、現状のギャップも共有しておきます：

- `AiSpace` の UI（スペースごとの切り替え、スペース管理画面など）は未実装
- `AiSkill` の UI（スキル一覧・詳細・検索画面）は未実装（バックエンドの検索APIはあり）
- `AiMetric` の可視化ダッシュボード（グラフやカード表示）は未実装
- タスクの手動編集 UI（ステータス変更、progresses / userPreferences の更新）は未実装
- Acontext 専用の設定画面（タイムアウト値、モデル指定、ストレージポリシーなど）は未実装
- テストコード（ユニットテスト / E2E テスト）はまだ用意していない
- `AI_TASK_EXTRACTION_MODEL` などのモデル指定用 env は未使用で、現状は `gpt-4o-mini` をハードコード

---

このドキュメントを前提として、
- 追加で必要なデータモデルの拡張、
- スキル/メトリクスダッシュボードの詳細設計、
- エラー/ジョブ監視UI、
- テスト戦略や運用設計

などについて、要件定義や設計のブラッシュアップを依頼したいと考えています。
