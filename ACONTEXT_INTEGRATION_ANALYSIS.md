# Acontext統合可能性分析レポート

## 概要

このドキュメントは、Acontextシステムをbeauty projectに統合する可能性を検討した分析レポートです。

## 1. 両システムの比較

### beauty projectの現状

**アーキテクチャ:**
- Next.js + tRPC + Prisma + MySQL
- 複数AIエージェント（Gemini、Grok、Claude、ChatGPT）の協調
- データベースに直接保存（MarketResearchResult、SNSResearchResult、StrategyRecommendation、GeneratedContent）

**データ保存方式:**
- 会話履歴: 保存されていない（各リクエストは独立）
- タスク管理: WorkflowExecutionテーブルで簡易的な管理
- 学習機能: なし（過去の経験を活用する仕組みがない）

**課題:**
1. 会話コンテキストの永続化がない
2. タスクの進捗追跡が限定的
3. 過去の成功パターンの学習・再利用がない
4. コンテキストエンジニアリング（圧縮、削減）の機能がない

### Acontextの特徴

**アーキテクチャ:**
- Python (FastAPI) + Go (REST API) + Next.js (Dashboard)
- PostgreSQL + RabbitMQ + S3
- セッション管理、タスク抽出、スキル学習

**主要機能:**
1. **Session**: マルチモーダル対応の会話スレッド保存
2. **Task Agent**: バックグラウンドでタスク進捗を自動追跡
3. **Space**: Notionライクなスキル（SOP）保存・検索
4. **Experience Agent**: 過去の経験から学習

## 2. 統合のメリット

### 2.1 会話コンテキストの永続化

**現状の問題:**
- 各AIリクエストが独立しており、前後の文脈が失われる
- ユーザーとの対話履歴が保存されない

**Acontext統合による改善:**
- セッションごとに会話履歴を保存
- 過去の対話を参照してより適切な回答を生成
- マルチターン対話の実現

**実装イメージ:**
```typescript
// 既存のコード
const result = await claudeAnalyzeMarketPosition(...);

// Acontext統合後
const session = await acontextClient.sessions.create({
  space_id: userSpaceId // ユーザー専用のSpace
});

// メッセージを保存
await acontextClient.sessions.send_message(session.id, {
  role: "user",
  content: userQuery
});

// AI応答を保存
await acontextClient.sessions.send_message(session.id, {
  role: "assistant",
  content: result
});
```

### 2.2 タスクの自動追跡と進捗管理

**現状の問題:**
- WorkflowExecutionは手動でステータスを更新
- タスクの詳細な進捗やユーザーフィードバックが記録されない

**Acontext統合による改善:**
- Task Agentが自動的にタスクを抽出・追跡
- 進捗更新、ユーザーフィードバック、好みを自動記録
- ダッシュボードで成功率を可視化

**実装イメージ:**
```typescript
// 戦略分析の実行
const session = await acontextClient.sessions.create({
  space_id: strategySpaceId
});

// メッセージを送信（タスクが自動抽出される）
await acontextClient.sessions.send_message(session.id, {
  role: "user",
  content: "市場分析と価格設定提案をしてほしい"
});

await acontextClient.sessions.send_message(session.id, {
  role: "assistant",
  content: "1. 市場データを収集\n2. 競合分析\n3. 価格提案を生成",
  tool_calls: [...]
});

// タスクの状態を取得
const tasks = await acontextClient.sessions.get_tasks(session.id);
// tasks.items[0].status: "success" | "pending" | "failed"
// tasks.items[0].data.progresses: 進捗更新の配列
// tasks.items[0].data.user_preferences: ユーザーの好み
```

### 2.3 スキル学習と再利用

**現状の問題:**
- 過去の成功パターンが再利用されない
- 同じような分析を毎回一から実行
- ベストプラクティスが蓄積されない

**Acontext統合による改善:**
- 成功した戦略分析パターンをSOPとして保存
- 類似のリクエスト時に過去のスキルを検索・適用
- 時間の経過とともに精度が向上

**実装イメージ:**
```typescript
// Spaceを作成（ユーザーまたは組織単位）
const space = await acontextClient.spaces.create();

// セッションをSpaceに接続
const session = await acontextClient.sessions.create({
  space_id: space.id
});

// 分析を実行（完了後、自動的にスキルが抽出される）
// ...

// 次回、類似のリクエスト時にスキルを検索
const skills = await acontextClient.spaces.experience_search(
  space.id,
  "市場分析と価格設定提案",
  mode: "agentic" // または "fast"
);

// 検索されたスキルをプロンプトに組み込む
const prompt = `
過去の成功パターン:
${skills.map(s => s.use_when).join("\n")}

現在のリクエスト: ${userQuery}
`;
```

### 2.4 コンテキストエンジニアリング

**現状の問題:**
- 長い会話履歴をそのまま送信（トークンコストが高い）
- 重要な情報と不要な情報の区別がない

**Acontext統合による改善:**
- タスクベースのコンテキスト圧縮
- ディスクへのコンテキストオフロード
- トークン数の削減とコスト最適化

## 3. 統合の課題と解決策

### 3.1 データベースの違い

**課題:**
- beauty project: MySQL
- Acontext: PostgreSQL

**解決策:**
1. **オプション1: Acontextを別サービスとして運用**
   - Acontextを独立したサービスとして起動（Docker Compose）
   - API経由で統合
   - メリット: 既存のMySQL構造を維持
   - デメリット: 2つのデータベースを管理

2. **オプション2: AcontextのデータをMySQLに保存**
   - AcontextのスキーマをMySQLに移植
   - メリット: 単一データベース
   - デメリット: Acontextのコード修正が必要

3. **オプション3: ハイブリッドアプローチ**
   - セッション・タスク・スキルはAcontext（PostgreSQL）で管理
   - ビジネスロジック（商品、戦略、コンテンツ）はMySQLで管理
   - メリット: 各システムの強みを活かせる
   - デメリット: データの整合性管理が必要

**推奨: オプション1（別サービスとして運用）**

### 3.2 アーキテクチャの違い

**課題:**
- beauty project: tRPC（型安全なAPI）
- Acontext: REST API

**解決策:**
- AcontextのSDK（Python/TypeScript）を使用
- tRPCルーター内でAcontextクライアントを呼び出し
- 型安全性はTypeScriptの型定義で確保

**実装イメージ:**
```typescript
// src/server/services/acontext-client.ts
import { AcontextClient } from "@acontext/acontext";

export const acontextClient = new AcontextClient({
  base_url: process.env.ACONTEXT_BASE_URL || "http://localhost:8029/api/v1",
  api_key: process.env.ACONTEXT_API_KEY || "sk-ac-your-root-api-bearer-token"
});

// src/server/api/routers/strategy.ts
import { acontextClient } from "@/server/services/acontext-client";

export const strategyRouter = router({
  analyzeMarketPosition: publicProcedure
    .input(...)
    .mutation(async ({ input }) => {
      // セッション作成
      const session = await acontextClient.sessions.create({
        space_id: await getUserSpaceId(input.userId)
      });

      // 既存のロジック + Acontext統合
      const result = await claudeAnalyzeMarketPosition(...);

      // メッセージを保存
      await acontextClient.sessions.send_message(session.id, {
        role: "user",
        content: input.location
      });
      await acontextClient.sessions.send_message(session.id, {
        role: "assistant",
        content: result
      });

      return { ...result, sessionId: session.id };
    })
});
```

### 3.3 依存関係の追加

**必要な追加:**
- `@acontext/acontext` (TypeScript SDK)
- Acontextサーバー（Docker Composeで起動）

**package.jsonへの追加:**
```json
{
  "dependencies": {
    "@acontext/acontext": "^0.0.4"
  }
}
```

### 3.4 既存機能への影響

**影響が少ない統合ポイント:**
1. **戦略分析**: セッション管理を追加するだけ
2. **コンテンツ生成**: 生成履歴をセッションに保存
3. **市場調査/SNS調査**: 調査結果をセッションに保存

**注意が必要なポイント:**
- 既存のデータベーススキーマとの整合性
- 既存のAPIレスポンス形式の維持

## 4. 統合実装の段階的アプローチ

### フェーズ1: 基盤構築（1-2週間）

1. Acontextサーバーのセットアップ
   - Docker Composeで起動
   - 環境変数の設定
   - ヘルスチェックの実装

2. SDKの統合
   - `@acontext/acontext`のインストール
   - クライアントサービスの作成
   - エラーハンドリングの実装

3. 基本的なセッション管理
   - セッション作成・保存の実装
   - メッセージ送信の実装

### フェーズ2: タスク追跡の統合（2-3週間）

1. 戦略分析への統合
   - セッション作成
   - メッセージ保存
   - タスク抽出の確認

2. コンテンツ生成への統合
   - 生成プロセスをセッションに記録
   - タスクの進捗を追跡

3. ダッシュボードの確認
   - Acontextダッシュボードでセッション・タスクを確認

### フェーズ3: スキル学習の統合（3-4週間）

1. Spaceの作成
   - ユーザー単位または組織単位のSpace
   - Spaceとセッションの紐付け

2. スキル検索の実装
   - 類似リクエスト時に過去のスキルを検索
   - プロンプトへの組み込み

3. スキルの品質向上
   - スキルの評価・フィルタリング
   - ベストプラクティスの抽出

### フェーズ4: 高度な機能（4週間以降）

1. コンテキストエンジニアリング
   - コンテキスト圧縮
   - ディスクへのオフロード

2. カスタマイズ
   - beauty project特有の要件への対応
   - UI統合（Acontextダッシュボードの埋め込み）

## 5. 統合のメリット・デメリットまとめ

### メリット

1. **会話コンテキストの永続化**
   - マルチターン対話の実現
   - ユーザー体験の向上

2. **タスクの自動追跡**
   - 進捗管理の自動化
   - 成功率の可視化

3. **スキル学習と再利用**
   - 過去の成功パターンの活用
   - 時間の経過とともに精度向上

4. **コンテキストエンジニアリング**
   - トークンコストの削減
   - パフォーマンスの向上

5. **オープンソース**
   - カスタマイズ可能
   - コミュニティサポート

### デメリット

1. **追加のインフラ**
   - Acontextサーバーの運用
   - PostgreSQLの追加（オプション1の場合）

2. **学習コスト**
   - Acontextの概念理解
   - 統合方法の習得

3. **初期設定の複雑さ**
   - Docker Composeの設定
   - 環境変数の管理

4. **データベースの分離**
   - 2つのデータベースを管理（オプション1の場合）
   - データの整合性管理

## 6. 推奨事項

### 統合を推奨する理由

1. **長期的な価値**
   - スキル学習により、時間の経過とともにシステムが改善
   - ユーザーごとの最適化が可能

2. **スケーラビリティ**
   - コンテキスト管理の自動化
   - タスク追跡の自動化

3. **開発効率**
   - 既存の機能を活用
   - 自前実装のコスト削減

### 実装の優先順位

1. **高優先度: フェーズ1-2**
   - セッション管理とタスク追跡
   - 即座に価値を提供

2. **中優先度: フェーズ3**
   - スキル学習
   - 長期的な価値

3. **低優先度: フェーズ4**
   - 高度な機能
   - 必要に応じて実装

## 7. 次のステップ

1. **PoC（概念実証）の実施**
   - 小規模な機能で統合を試す
   - 例: 戦略分析の1機能のみ統合

2. **技術検証**
   - Acontextサーバーの起動確認
   - SDKの動作確認
   - データフローの確認

3. **設計の詳細化**
   - データモデルの設計
   - API設計
   - エラーハンドリング設計

4. **段階的な実装**
   - フェーズ1から順次実装
   - 各フェーズで動作確認

## 8. 参考資料

- [Acontext公式ドキュメント](https://docs.acontext.io/)
- [Acontext GitHub](https://github.com/memodb-io/Acontext)
- [Acontext Examples](https://github.com/memodb-io/Acontext-Examples)

---

**作成日**: 2025-01-XX
**作成者**: AI Assistant
**バージョン**: 1.0


