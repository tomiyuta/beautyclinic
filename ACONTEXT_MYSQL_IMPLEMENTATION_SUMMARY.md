# Acontext MySQL実装要件定義書 理解サマリー

## 📋 ドキュメント概要

この要件定義書は、**Acontextの機能をbeauty projectの既存技術スタック（MySQL + Prisma + tRPC）上にネイティブ実装する**ための完全な仕様書です。

**重要なポイント**: Acontextサーバーを別途デプロイするのではなく、**beauty project内にAcontextの機能を完全に実装**するアプローチです。

---

## 🎯 実装アプローチの違い

### 以前のアプローチ（外部統合）
- Acontextサーバーを別ホストにデプロイ
- beauty projectからHTTP APIで接続
- 2つのシステムを管理

### この要件定義書のアプローチ（ネイティブ実装）
- Acontextの機能をbeauty project内に実装
- 既存のMySQL + Prisma + tRPCを使用
- 単一システムで管理

**メリット:**
- ✅ Vercelで完全に動作（追加インフラ不要）
- ✅ 単一データベース（MySQL）で管理
- ✅ 既存技術スタックとの完全な統合
- ✅ カスタマイズが容易

---

## 🏗️ 機能マップ（MECE分類）

```
Acontext機能
├── Store（保存）
│   ├── Session（会話管理）
│   └── Disk（アーティファクト管理）
│
├── Observe（監視）
│   ├── Task抽出
│   ├── 状態遷移管理
│   ├── 進捗追跡
│   └── ユーザー嗜好抽出
│
├── Learn（学習）
│   ├── Space管理
│   ├── Skill Block生成
│   └── Skill検索（fast/agentic）
│
├── Dashboard（可視化）
│   ├── メッセージビューア
│   ├── タスクビューア
│   ├── アーティファクトビューア
│   ├── スキルビューア
│   └── メトリクス
│
└── Infrastructure（基盤）
    ├── ヘルスチェック
    ├── 認証・認可
    └── プロバイダー設定
```

---

## 📊 データモデル（主要テーブル）

### 1. **AiSpace** - 知識リポジトリ
- スキル・経験を保存するNotionライクな構造
- セッション、スキル、ディスクを関連付け

### 2. **AiSession** - 会話セッション
- 会話のコンテナ
- Spaceに関連付けることで学習を有効化
- ステータス: `active`, `completed`, `abandoned`
- Experience Agent処理状態: `pending`, `processing`, `completed`, `failed`, `skipped`

### 3. **AiMessage** - メッセージ
- セッション内の会話メッセージ
- OpenAI/Anthropic形式をサポート
- ツール呼び出し情報も保存

### 4. **AiTask** - タスク
- Experience Agentが自動抽出したタスク
- ステータス: `pending`, `running`, `success`, `failed`, `skipped`
- 進捗履歴、ユーザー嗜好を含む

### 5. **AiSkillBlock** - スキル（SOP）
- 学習された再利用可能な手順
- `use_when`: 発動条件
- `preferences`: 制約・嗜好
- `tool_sops`: 実行手順の配列
- FULLTEXT検索対応

### 6. **AiDisk** / **AiArtifact** - ファイル管理
- アーティファクト（ファイル）の保存
- 1MB未満はDB直接保存、1MB以上はS3/ローカル

### 7. **AiExperienceJob** - バックグラウンドジョブ
- flush()の同期待機を実現
- タスク抽出、スキル学習を管理

### 8. **AiExperienceLog** - 実行ログ
- デバッグ・分析・メトリクス用

### 9. **AiProviderConfig** - LLM設定
- 各用途（タスク抽出、スキル学習等）のLLM設定

### 10. **AiSessionMetrics** - メトリクス集計
- 日次集計データ

---

## 🔑 主要機能の動作フロー

### 1. セッション管理フロー

```
1. セッション作成
   └─> AiSession作成（status: active, experienceStatus: pending）

2. メッセージ送信
   └─> AiMessage保存
   └─> セッションのupdatedAt更新

3. flush()呼び出し（同期待機）
   └─> Experience Agentジョブ作成
   └─> タスク抽出実行
   └─> スキル学習実行（条件満たす場合）
   └─> 完了までポーリング待機

4. タスク取得
   └─> flush()完了後にタスクを取得可能
```

### 2. タスク抽出フロー

```
1. flush()呼び出し
   └─> セッションの全メッセージを取得

2. LLMに送信（タスク抽出プロンプト）
   └─> 会話からタスクを抽出

3. タスクをDBに保存
   └─> AiTask作成（order, description, status, progresses, userPreferences）

4. タスク取得可能に
```

### 3. スキル学習フロー

```
1. タスク抽出完了後
   └─> 成功タスク（status: success）を確認

2. 複雑性判定
   └─> ツール呼び出し2回以上
   └─> ユーザー嗜好1つ以上
   └─> 会話ターン数4以上
   └─> 進捗更新2回以上
   └─> 2つ以上の条件を満たせば「複雑」と判定

3. SOP抽出（LLM）
   └─> use_when, preferences, tool_sopsを生成

4. スキル保存
   └─> AiSkillBlock作成
   └─> searchText生成（FULLTEXT検索用）
```

### 4. スキル検索フロー

```
1. fastモード（FULLTEXT検索）
   └─> MySQLのFULLTEXT検索を使用
   └─> 高速（< 200ms）

2. agenticモード（LLM探索）
   └─> FULLTEXT検索で候補を広く取得
   └─> LLMがクエリとの関連性を評価
   └─> 最適なスキルを選定・組み合わせ
   └─> より高精度（< 5s）
```

---

## 💡 重要な概念

### 1. flush() - 同期待機

**目的**: Experience Agentの処理完了まで待機する

**動作:**
- ブロッキング呼び出し
- Experience Agentジョブを作成・実行
- ポーリングでジョブ完了を待機（デフォルト1秒間隔）
- タイムアウト: デフォルト60秒

**使用例:**
```typescript
// メッセージ送信後、タスクを取得したい場合
await aiSession.sendMessage({ sessionId, blob: {...} });
await aiSession.flush({ sessionId }); // タスク抽出完了まで待機
const tasks = await aiSession.getTasks({ sessionId }); // タスク取得可能
```

### 2. Experience Agent - バックグラウンド処理

**役割:**
- タスクの自動抽出
- スキルの自動学習

**処理タイミング:**
- **同期**: flush()呼び出し時（即座に実行、完了まで待機）
- **非同期**: セッション完了時（ジョブキューに追加、バックグラウンドで処理）

### 3. Space - 知識リポジトリ

**役割:**
- スキルを保存するコンテナ
- セッションに関連付けることで学習を有効化

**構造:**
- Notionライクな階層構造（将来拡張可能）
- 現在はフラットな構造

### 4. Skill Block - 再利用可能なSOP

**構造:**
```typescript
{
  use_when: "このスキルを使う条件（汎用的に記述）",
  preferences: "考慮すべき制約や嗜好",
  tool_sops: [
    { tool_name: "ツール名", action: "実行内容" }
  ]
}
```

**検索:**
- `searchText`フィールドでFULLTEXT検索
- `use_when`フィールドでもFULLTEXT検索

---

## 🔧 技術実装の詳細

### 1. ストレージアダプター

**3つのストレージタイプ:**
- `database`: 1MB未満のファイルをDBに直接保存
- `local`: ローカルファイルシステム
- `s3`: S3互換ストレージ（MinIO等）

**自動選択:**
- ファイルサイズに応じて自動決定
- 設定可能

### 2. FULLTEXT検索

**MySQLのFULLTEXT検索を使用:**
```sql
SELECT 
  id, use_when, preferences, tool_sops,
  MATCH(search_text) AGAINST(? IN NATURAL LANGUAGE MODE) AS score
FROM ai_skill_blocks
WHERE space_id = ?
  AND is_active = true
  AND MATCH(search_text) AGAINST(? IN NATURAL LANGUAGE MODE)
ORDER BY score DESC, usage_count DESC
LIMIT ?
```

**インデックス:**
- `searchText`フィールドにFULLTEXTインデックス
- `use_when`フィールドにもFULLTEXTインデックス

### 3. ジョブキュー

**実装方式:**
- `AiExperienceJob`テーブルで管理
- ポーリングまたはイベント駆動で処理
- リトライ機能（最大3回）

**ジョブタイプ:**
- `task_extraction`: タスク抽出のみ
- `skill_learning`: スキル学習のみ
- `full_processing`: タスク抽出 + スキル学習

### 4. 複雑性判定

**判定条件（2つ以上で「複雑」）:**
1. ツール呼び出しが2回以上
2. ユーザー嗜好が1つ以上
3. 会話ターン数が4以上
4. 進捗更新が2回以上

**理由**: 単純すぎるタスクは学習しない（ノイズを減らす）

---

## 🎨 既存機能との統合

### 統合ヘルパー関数

```typescript
// withAiSession: 既存機能をAcontextでラップ
const { result, sessionId } = await withAiSession(
  {
    spaceId: userSpaceId,
    enableLearning: true,
    searchSkills: true,
  },
  { analysisType: 'comprehensive', ...input },
  async (enhancedContext) => {
    // スキルをプロンプトに反映
    const prompt = enhancedContext._learnedSkills
      ? buildPromptWithSkills(input, enhancedContext._learnedSkills)
      : buildPrompt(input);
    
    // 既存の分析ロジック実行
    return runAnalysis(prompt);
  }
);
```

**動作:**
1. セッション作成
2. ユーザー要求を記録
3. スキル検索（オプション）
4. 既存ロジック実行（スキルを反映）
5. 結果を記録
6. セッション完了 & 学習トリガー

---

## 📈 実装優先度

### P0（必須）
- Session, Message, Task, Space, Skill
- Experience Agent
- flush同期待機

### P1（重要）
- Disk（アーティファクト管理）
- Dashboard基本機能

### P2（推奨）
- agenticモード検索
- メトリクス集計

### P3（将来）
- Infrastructure完全版

---

## 🗂️ ファイル構成

### APIルーター
```
src/server/api/routers/
├── ai-session.ts      // Session管理
├── ai-task.ts         // Task管理
├── ai-space.ts        // Space管理
├── ai-skill.ts        // Skill管理
├── ai-disk.ts         // Disk管理
├── ai-experience.ts   // Experience Agent
├── ai-metrics.ts      // メトリクス
└── ai-infra.ts        // Infrastructure
```

### サービス層
```
src/server/services/
├── ai-session/
│   ├── index.ts              // セッション管理
│   └── message-parser.ts     // メッセージ形式変換
├── ai-experience/
│   ├── index.ts              // エントリポイント
│   ├── task-extractor.ts     // タスク抽出
│   ├── skill-learner.ts      // スキル学習
│   ├── skill-searcher.ts     // スキル検索
│   ├── complexity-checker.ts // 複雑性判定
│   ├── job-processor.ts      // ジョブ処理
│   └── prompts.ts            // LLMプロンプト定義
├── ai-disk/
│   ├── index.ts              // ディスク管理
│   └── storage-adapter.ts    // ストレージ抽象化
├── ai-metrics/
│   └── index.ts              // メトリクス集計
└── ai-infra/
    └── index.ts              // ヘルスチェック等
```

### UI（Dashboard）
```
src/app/ai-dashboard/
├── sessions/          # セッション一覧・詳細
├── tasks/             # タスク一覧
├── spaces/            # Space一覧・詳細
├── disks/             # ディスク一覧
└── metrics/           # メトリクスダッシュボード
```

---

## ⚙️ 環境変数

```env
# Experience Agent設定
AI_EXPERIENCE_ENABLED=true
AI_EXPERIENCE_MODEL=claude-sonnet-4-20250514
AI_EXPERIENCE_TIMEOUT_MS=60000

# タスク抽出設定
AI_TASK_EXTRACTION_MODEL=claude-sonnet-4-20250514

# スキル学習設定
AI_SKILL_LEARNING_MODEL=claude-sonnet-4-20250514
AI_SKILL_LEARNING_MIN_COMPLEXITY=2

# ストレージ設定
AI_STORAGE_TYPE=local  # local | s3
AI_STORAGE_LOCAL_PATH=./storage/ai-artifacts
AI_STORAGE_DB_THRESHOLD=1048576  # 1MB
```

---

## 📝 実装チェックリスト（10フェーズ）

1. **Phase 1: 基盤**（1-2日）
   - Prismaスキーマ追加
   - マイグレーション実行
   - FULLTEXTインデックス追加

2. **Phase 2: Session/Message**（1日）
   - セッション管理
   - メッセージ送信・取得

3. **Phase 3: Task抽出**（1-2日）
   - タスク抽出ロジック
   - LLMプロンプト調整

4. **Phase 4: flush/同期待機**（1日）
   - ジョブ処理
   - ポーリング待機

5. **Phase 5: Space/Skill**（1-2日）
   - スキル学習
   - スキル検索（fastモード）

6. **Phase 6: Disk**（1日）
   - ストレージアダプター
   - アーティファクト管理

7. **Phase 7: agenticモード**（1日）
   - LLM探索実装

8. **Phase 8: 統合**（1-2日）
   - 既存機能との統合
   - ヘルパー関数

9. **Phase 9: Dashboard**（2-3日）
   - UI実装

10. **Phase 10: テスト・調整**（1-2日）
    - テスト
    - プロンプト調整

**合計: 約2-3週間**

---

## 🎯 このアプローチのメリット

### 1. Vercelで完全動作
- ✅ 追加インフラ不要
- ✅ サーバーレス関数で動作
- ✅ バックグラウンド処理はジョブキューで管理

### 2. 単一データベース
- ✅ MySQLのみで管理
- ✅ 既存のPrismaスキーマに追加
- ✅ データの整合性が保証

### 3. 完全な統合
- ✅ 既存のtRPC APIに統合
- ✅ 既存のUIに統合可能
- ✅ カスタマイズが容易

### 4. コスト削減
- ✅ 追加のホスティング費用なし
- ✅ 既存のインフラを活用

---

## ⚠️ 注意点

### 1. バックグラウンド処理
- Vercelのサーバーレス関数はリクエスト駆動
- ジョブ処理は**ポーリング方式**で実装
- または、**Vercel Cron Jobs**を使用

### 2. ストレージ
- ローカルストレージはVercelでは使えない
- S3互換ストレージ（MinIO等）を使用
- または、小ファイルはDBに直接保存

### 3. パフォーマンス
- flush()はLLM呼び出しを含むため時間がかかる
- タイムアウト設定が必要
- 非同期処理も検討

---

## 📚 次のステップ

1. **要件確認**: この要件定義書の内容を確認
2. **技術検証**: 実装可能性の検証
3. **PoC実装**: Phase 1-4を実装して動作確認
4. **段階的実装**: Phase 5以降を順次実装

---

**作成日**: 2025-01-XX
**バージョン**: 1.0

