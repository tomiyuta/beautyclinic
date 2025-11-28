# Acontext MySQL実装 状況サマリ

## 1. 実装済み機能（現状）

### 1-1. データモデル / Prisma

**Prismaスキーマに追加済みのモデル**
- セッション系
  - `AiSpace` : スペース（プロジェクト / ワークスペース）メタ情報
  - `AiSession` : 会話セッション（spaceId, status, experienceStatus, timestamps）
  - `AiMessage` : セッション内メッセージ（role, content, metadata）
  - `AiTask` : 抽出されたタスク（order, description, status, progresses, userPreferences）
- スキル・経験系
  - `AiSkill` : 学習されたSOP/スキル（name, description, steps, complexity, tags, usageCount, successRate）
  - `AiExperienceJob` : バックグラウンドジョブ（jobType, status, input/output, error）
- ストレージ / メトリクス系
  - `AiArtifact` : アーティファクト（storageType, path, size, mimeType, metadata）
  - `AiMetric` : メトリクス集計結果（日次など）

**Enum**
- `AiSessionStatus` : `active | completed | archived`
- `AiExperienceStatus` : `pending | processing | completed | failed`
- `AiTaskStatus` : `pending | running | success | failed`
- `AiStorageType` : `database | s3 | local`（実運用では local は使わない）
- `AiSkillComplexity` : `simple | medium | complex`

> 要件定義書の「データモデル（Session / Task / Skill / Space / Artifact / Metric / Job）」はほぼ網羅済み。

---

### 1-2. サービス層（Store / Observe / Learn）

**Session / Message / Task**
- `src/server/services/ai-context/ai-session.ts`
  - `createSession(input)` : セッション作成
  - `sendMessage(input)` : メッセージ保存
  - `getMessages(input)` : メッセージ取得
  - `getTasks(sessionId)` : タスク取得
  - `getSession(sessionId)` / `listSessions(spaceId, limit)` : セッション詳細・一覧
  - `completeSession(sessionId)` : セッション完了＋ExperienceJob作成
  - `flush({ sessionId, timeoutMs, jobType })` : 
    - 会話履歴を取得しLLMでタスク抽出
    - `AiTask` に保存
    - `jobType === "full_processing"` の場合、スキル学習も試行（時間が足りなければJobにフォールバック）

**Task抽出（Observe）**
- `src/server/services/ai-context/task-extraction.ts`
  - `extractTasks(conversation, options)`
  - OpenAI（`OPENAI_API_KEY`）＋専用プロンプトでタスクJSONを抽出

**Skill学習（Learn）**
- `src/server/services/ai-context/skill-learning.ts`
  - `learnSkill(completedTasks, options)`
  - 完了タスクのリスト → LLM → SOP構造（name, description, steps, complexity, tags）→ `AiSkill` へ保存

**Skill検索**
- `src/server/services/ai-context/skill-search.ts`
  - `searchSkillsFast(query, spaceId, limit)` : LIKEベースの高速検索
  - `searchSkillsAgentic(query, spaceId, limit)` : LLMでキーワード展開→fast検索に連結
  - `searchSkills(input)` : モードを切り替える統一インターフェース

**ストレージアダプター（Disk）**
- `src/server/services/ai-context/storage-adapter.ts`
  - `saveArtifact({ sessionId, name, data, mimeType, metadata })`
    - サイズと `AI_STORAGE_TYPE` に応じて `database` / `s3` を選択
  - `getArtifact({ artifactId })`
  - `listArtifacts(sessionId, limit)`

**Experience Agent（バックグラウンド処理）**
- `src/server/services/ai-context/experience-agent.ts`
  - `processExperienceJobs(limit)` : 未処理Jobを順に処理
    - `task_extraction` : タスクが無い場合に後から抽出
    - `skill_learning` : 完了タスクからスキル学習
    - `full_processing` : 両方実行

---

### 1-3. APIレイヤー（tRPC / HTTP）

**tRPCルーター**
- `src/server/api/routers/ai-session.ts`
  - `aiSession.create` : セッション作成
  - `aiSession.sendMessage` : メッセージ送信
  - `aiSession.getMessages` : メッセージ取得
  - `aiSession.flush` : タスク抽出（＆スキル学習オプション）
  - `aiSession.getTasks` : タスク取得
  - `aiSession.get` / `aiSession.list` : セッション取得・一覧
  - `aiSession.complete` : セッション完了トリガー
  - `aiSession.searchSkills` : スキル検索（fast / agentic）
  - `aiSession.saveArtifact` / `getArtifact` / `listArtifacts` : アーティファクト保存・取得

- `src/server/api/root.ts`
  - `aiSession: aiSessionRouter` を `appRouter` に追加済み

**Cron用HTTPエンドポイント**
- `src/app/api/cron/process-experience-jobs/route.ts`
  - Vercel Cron Jobsから呼ばれ、`processExperienceJobs(10)` を実行
- `src/app/api/cron/aggregate-metrics/route.ts`
  - 日次で `AiMetric` にメトリクスを集計

---

### 1-4. インフラ / Vercel対応

- `vercel.json`
  - `crons` 設定済み
    - `*/1 * * * *` → `/api/cron/process-experience-jobs`
    - `0 1 * * *` → `/api/cron/aggregate-metrics`
- Prismaクライアントは `src/generated/prisma` に出力し、Vercel向けバイナリターゲット指定済み
- `OPENAI_API_KEY` は **API Key設定画面から `.env` に書き込まれ、全Acontext機能で共通利用**

---

### 1-5. フロントエンド / UI

**Acontextダッシュボード**
- `src/app/ai-context/page.tsx`
  - Atlaskit + 既存ページと同じレイアウトポリシー
    - グレー背景 (`#F4F5F7`) + 中央の白カード
  - 機能
    - セッション一覧
    - セッション作成ボタン
    - メッセージ入力（TextField, ⌘/Ctrl+Enterで送信）
    - メッセージ履歴表示（ユーザー/アシスタントの吹き出し）
    - 「タスク抽出」ボタン → flush() 呼び出し
    - 抽出されたタスク一覧（ステータスBadge / order / 進捗）

**ナビゲーションへの統合**
- `src/components/Navigation.tsx`
  - メニューに「🧠 Acontextダッシュボード（/ai-context）」を追加済み

**APIキー設定との連携**
- `src/features/api-key/api-key-management.tsx` + `src/server/api/routers/api-key.ts`
  - OpenAIキーを `.env` の `OPENAI_API_KEY` に保存
  - AcontextのLLM呼び出しはこの値を参照（追加設定不要）

---

## 2. これから実装すべき機能（MECE）

### 2-1. Space / Session / Task のUX拡張

- **スペース管理UI**
  - `AiSpace` 単位でのフィルタリング・切り替え
  - スペース作成 / 名前変更 / アーカイブ
- **セッション一覧の絞り込み**
  - Space別・日付別・ステータス別フィルタ
  - 検索（タイトル・テキスト検索）
- **タスク編集UI**
  - タスクの手動ステータス更新（pending → running → success など）
  - 進捗メモの追記・編集
  - ユーザーの好み / 制約の閲覧・編集

### 2-2. Skill（SOP）関連

- **Skill一覧・詳細UI**
  - `AiSkill` のリスト表示（名前・説明・complexity・usageCount・successRate）
  - 詳細モーダルでステップ一覧を表示
- **Skill検索UI**
  - キーワード検索（fastモード）
  - agenticモードでの「おすすめスキル」提示
- **Skillとタスク/セッションの紐付け表示**
  - どのセッション・タスクから学習されたかのトレース

### 2-3. Metric / Dashboard

- **メトリクス可視化画面**
  - 日次/週次のグラフ:
    - 作成セッション数
    - 抽出タスク数
    - スキル作成数
    - タスク完了率
  - フィルタ（期間 / Space）
- **集計ロジックの拡張**
  - 失敗ジョブ数・平均処理時間などのメトリクス追加

### 2-4. エラー / 健康状態モニタリング

- **Acontext専用のヘルスチェックUI**
  - Cron Job実行状況
  - 失敗ジョブ一覧と再実行ボタン
- **詳細ログUI**
  - `AiExperienceJob.error` の閲覧
  - 失敗タスク/スキル抽出ケースの一覧

### 2-5. 設定 / コンフィグUI

- **Acontext設定画面**（例: `/settings/acontext`）
  - タスク抽出のタイムアウト値・最大件数
  - Skill学習を同期/非同期どちらにするかのポリシー
  - S3バケット名・リージョンの確認（実値はマスク）

### 2-6. テスト / 品質保証

- **ユニットテスト**
  - サービス層（`ai-session`, `task-extraction`, `skill-learning`, `skill-search`, `experience-agent`）
  - Prismaレイヤーの基本CRUD検証
- **E2Eテスト**
  - 「セッション作成 → メッセージ送信 → flush() → タスク表示」までの一連の流れ
  - Cron Job実行の擬似テスト（ローカルで直接HTTP叩く）

### 2-7. パフォーマンス / 運用

- **インデックス・クエリ最適化の検証**
  - 大量セッション/タスク時のパフォーマンス確認
- **ログ&監視連携**
  - Vercel / 外部監視（Sentryなど）との連携は未実装

---

## 3. 結論

- **現状**: 要件定義書の「データモデル」「サービス層（Session/Task/Skill）」「Cron & Vercel対応」「最低限のダッシュボードUI」は実装済み。
- **未実装**: Space/Skill/MetricのリッチなUI、設定画面、モニタリングUI、テストコード、パフォーマンス・監視まわり。

今後は上記 2-1〜2-7 の項目をタスク分解して着手していけば、要件定義書に近い「完全版Acontextダッシュボード」に到達できます。
