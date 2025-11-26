# Acontext統合によるUI/UX変更点

## 概要

このドキュメントは、Acontextをbeauty projectに統合した場合のUI/UXの変更点を詳細に説明します。

## 1. 変更の基本方針

### 1.1. 設計原則

1. **既存UIの維持**: 既存のUI/UXを可能な限り維持
2. **段階的な追加**: Acontext機能は段階的に追加（PoCでは最小限）
3. **オプション機能**: Acontext関連の機能はオプションとして提供
4. **グレースフルデグラデーション**: Acontextが利用不可でも既存機能は動作

### 1.2. 変更の段階

- **PoC段階**: 最小限の変更（バックグラウンドでの動作）
- **フェーズ2**: タスク進捗表示の追加
- **フェーズ3**: セッション履歴表示の追加
- **フェーズ4**: スキル検索UIの追加

---

## 2. 戦略分析ページ（`/strategy-analysis`）の変更

### 2.1. 現在のUI（変更前）

```
┌─────────────────────────────────────────┐
│  戦略分析                                │
├─────────────────────────────────────────┤
│  AI選択: [Claude ▼]                     │
│                                         │
│  ┌─ 総合分析 ─────────────────────┐    │
│  │ 場所: [____________]            │    │
│  │ 商品: [全商品 ▼]                │    │
│  │ ☑ 市場データを含める            │    │
│  │ ☑ SNSデータを含める             │    │
│  │ [分析を実行]                    │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌─ 分析結果 ─────────────────────┐    │
│  │ 市場ポジション: ...             │    │
│  │ 強み: ...                       │    │
│  │ 弱み: ...                       │    │
│  │ ...                            │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### 2.2. PoC段階のUI（最小限の変更）

**変更点:**
- 視覚的な変更は最小限
- バックグラウンドでAcontextが動作
- ユーザーには明示的な変更なし

```
┌─────────────────────────────────────────┐
│  戦略分析                                │
├─────────────────────────────────────────┤
│  AI選択: [Claude ▼]                     │
│                                         │
│  ┌─ 総合分析 ─────────────────────┐    │
│  │ 場所: [____________]            │    │
│  │ 商品: [全商品 ▼]                │    │
│  │ ☑ 市場データを含める            │    │
│  │ ☑ SNSデータを含める             │    │
│  │ [分析を実行]                    │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌─ 分析結果 ─────────────────────┐    │
│  │ 市場ポジション: ...             │    │
│  │ 強み: ...                       │    │
│  │ 弱み: ...                       │    │
│  │ ...                            │    │
│  │                                 │    │
│  │ ℹ️ セッションID: abc-123...     │    │
│  │    (Acontextで会話履歴を確認)    │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**追加要素:**
- 分析結果の下部にセッションIDを表示（オプション、折りたたみ可能）
- クリックでAcontextダッシュボードを開く（新しいタブ）

### 2.3. フェーズ2のUI（タスク進捗表示）

**追加機能:**
- タスク進捗のリアルタイム表示
- タスクのステータス表示

```
┌─────────────────────────────────────────┐
│  戦略分析                                │
├─────────────────────────────────────────┤
│  AI選択: [Claude ▼]                     │
│                                         │
│  ┌─ 総合分析 ─────────────────────┐    │
│  │ 場所: [____________]            │    │
│  │ 商品: [全商品 ▼]                │    │
│  │ ☑ 市場データを含める            │    │
│  │ ☑ SNSデータを含める             │    │
│  │ [分析を実行]                    │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌─ タスク進捗 ───────────────────┐    │
│  │ 📋 タスク #1: 市場データ収集     │    │
│  │    ✅ 完了                      │    │
│  │                                 │    │
│  │ 📋 タスク #2: 競合分析          │    │
│  │    ⏳ 進行中...                 │    │
│  │    └─ データ取得中...           │    │
│  │                                 │    │
│  │ 📋 タスク #3: 戦略提案生成      │    │
│  │    ⏸️ 待機中                    │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌─ 分析結果 ─────────────────────┐    │
│  │ 市場ポジション: ...             │    │
│  │ ...                            │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**UIコンポーネント:**
- タスクリスト（折りたたみ可能）
- 各タスクのステータスバッジ（完了/進行中/待機中/失敗）
- 進捗更新の表示（オプション）
- 自動更新（5秒ごと）

### 2.4. 実装例（PoC段階）

```typescript
// src/features/strategy/strategy-analysis.tsx の変更例

export function StrategyAnalysis() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showSessionInfo, setShowSessionInfo] = useState(false);

  const marketPositionMutation =
    api.strategy.analyzeMarketPosition.useMutation({
      onSuccess: (data) => {
        toast.showSuccess("総合分析が完了しました");
        
        // セッションIDを保存（Acontext統合時）
        if (data.sessionId) {
          setSessionId(data.sessionId);
        }
        
        void utils.strategy.list.invalidate({ userId: USER_ID_PLACEHOLDER });
        setLocation("");
      },
      // ...
    });

  return (
    <div>
      {/* 既存のUI（変更なし） */}
      
      {/* 分析結果表示 */}
      {marketPositionMutation.data && (
        <div>
          {/* 既存の結果表示 */}
          
          {/* Acontextセッション情報（オプション） */}
          {sessionId && (
            <div style={{ marginTop: "16px", padding: "12px", background: "#F4F5F7", borderRadius: "4px" }}>
              <Button
                appearance="subtle"
                onClick={() => setShowSessionInfo(!showSessionInfo)}
              >
                {showSessionInfo ? "▼" : "▶"} セッション情報
              </Button>
              
              {showSessionInfo && (
                <div style={{ marginTop: "8px", fontSize: "12px", color: "#6B778C" }}>
                  <div>セッションID: {sessionId}</div>
                  <div style={{ marginTop: "4px" }}>
                    <Link
                      href={`${process.env.NEXT_PUBLIC_ACONTEXT_DASHBOARD_URL}/sessions/${sessionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Acontextダッシュボードで詳細を確認 →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 3. ナビゲーションの変更

### 3.1. 現在のナビゲーション

```
[商品管理] [市場調査] [SNS調査] [戦略分析] [戦略管理] [コンテンツ生成] [ワークフロー管理] [APIキー設定] [プロンプト管理]
```

### 3.2. Acontext統合後のナビゲーション（オプション）

**フェーズ2以降:**

```
[商品管理] [市場調査] [SNS調査] [戦略分析] [戦略管理] [コンテンツ生成] [ワークフロー管理] [APIキー設定] [プロンプト管理] [Acontextダッシュボード]
```

**または、既存の「ワークフロー管理」に統合:**

```
[商品管理] [市場調査] [SNS調査] [戦略分析] [戦略管理] [コンテンツ生成] [ワークフロー管理] [APIキー設定] [プロンプト管理]
                                                                    │
                                                                    └─ Acontextセッション
                                                                    └─ タスク管理
                                                                    └─ スキル管理
```

### 3.3. 実装例

```typescript
// src/components/Navigation.tsx の変更例

const navigationItems = [
  { href: "/", label: "商品管理", icon: "📦" },
  { href: "/market-research", label: "市場調査", icon: "📊" },
  { href: "/sns-research", label: "SNS調査", icon: "📱" },
  { href: "/strategy-analysis", label: "戦略分析", icon: "🎯" },
  { href: "/strategy-management", label: "戦略管理", icon: "📋" },
  { href: "/content", label: "コンテンツ生成", icon: "✨" },
  { href: "/workflow", label: "ワークフロー管理", icon: "🔄" },
  // オプション: Acontextダッシュボードへのリンク
  ...(process.env.NEXT_PUBLIC_ACONTEXT_DASHBOARD_URL ? [
    { 
      href: process.env.NEXT_PUBLIC_ACONTEXT_DASHBOARD_URL, 
      label: "Acontext", 
      icon: "🧠",
      external: true // 外部リンク
    }
  ] : []),
  { href: "/api-key", label: "APIキー設定", icon: "🔑" },
  { href: "/prompt", label: "プロンプト管理", icon: "💬" },
];
```

---

## 4. 戦略管理ページ（`/strategy-management`）の変更

### 4.1. 現在のUI

```
┌─────────────────────────────────────────┐
│  戦略管理                                │
├─────────────────────────────────────────┤
│  ┌─ 戦略一覧 ─────────────────────┐    │
│  │ [日付] [分析タイプ] [ステータス] │    │
│  │ 2025-01-15 総合分析 完了       │    │
│  │ 2025-01-14 価格提案 進行中     │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌─ 戦略詳細 ─────────────────────┐    │
│  │ 分析日: 2025-01-15             │    │
│  │ 市場ポジション: ...            │    │
│  │ ...                           │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### 4.2. Acontext統合後のUI

**追加要素:**
- セッションIDの表示
- Acontextダッシュボードへのリンク
- タスク進捗の表示（オプション）

```
┌─────────────────────────────────────────┐
│  戦略管理                                │
├─────────────────────────────────────────┤
│  ┌─ 戦略一覧 ─────────────────────┐    │
│  │ [日付] [分析タイプ] [ステータス] [セッション] │
│  │ 2025-01-15 総合分析 完了 [🔗] │    │
│  │ 2025-01-14 価格提案 進行中 [🔗] │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌─ 戦略詳細 ─────────────────────┐    │
│  │ 分析日: 2025-01-15             │    │
│  │ セッションID: abc-123...       │    │
│  │ [Acontextで詳細を確認]         │    │
│  │                                 │    │
│  │ 市場ポジション: ...            │    │
│  │ ...                           │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## 5. ワークフロー管理ページ（`/workflow`）の変更

### 5.1. 現在のUI

```
┌─────────────────────────────────────────┐
│  ワークフロー管理                         │
├─────────────────────────────────────────┤
│  ┌─ ワークフロー一覧 ───────────────┐    │
│  │ [タイプ] [ステータス] [開始日時] │    │
│  │ 統合分析 完了 2025-01-15 10:00  │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### 5.2. Acontext統合後のUI（フェーズ2以降）

**追加機能:**
- Acontextセッション一覧
- タスク管理
- スキル管理（フェーズ3以降）

```
┌─────────────────────────────────────────┐
│  ワークフロー管理                         │
├─────────────────────────────────────────┤
│  [タブ: ワークフロー | Acontextセッション | タスク | スキル] │
│                                         │
│  ┌─ Acontextセッション ────────────┐    │
│  │ [セッションID] [作成日] [タスク数] │    │
│  │ abc-123... 2025-01-15 3        │    │
│  │ def-456... 2025-01-14 2        │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌─ タスク一覧 ────────────────────┐    │
│  │ [タスク] [ステータス] [セッション] │    │
│  │ 市場データ収集 完了 abc-123...  │    │
│  │ 競合分析 進行中 abc-123...      │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## 6. 新規UIコンポーネント

### 6.1. セッション情報コンポーネント

```typescript
// src/components/AcontextSessionInfo.tsx

interface AcontextSessionInfoProps {
  sessionId: string;
  compact?: boolean;
}

export function AcontextSessionInfo({ sessionId, compact = false }: AcontextSessionInfoProps) {
  const [expanded, setExpanded] = useState(false);
  const dashboardUrl = process.env.NEXT_PUBLIC_ACONTEXT_DASHBOARD_URL;

  return (
    <div style={{ 
      padding: "12px", 
      background: "#F4F5F7", 
      borderRadius: "4px",
      fontSize: "12px"
    }}>
      <Button
        appearance="subtle"
        onClick={() => setExpanded(!expanded)}
        style={{ padding: "4px 8px" }}
      >
        {expanded ? "▼" : "▶"} セッション情報
      </Button>
      
      {expanded && (
        <div style={{ marginTop: "8px" }}>
          <div style={{ color: "#6B778C", marginBottom: "4px" }}>
            セッションID: <code style={{ background: "#FFFFFF", padding: "2px 4px", borderRadius: "2px" }}>{sessionId}</code>
          </div>
          {dashboardUrl && (
            <Link
              href={`${dashboardUrl}/sessions/${sessionId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#0052CC", textDecoration: "none" }}
            >
              Acontextダッシュボードで詳細を確認 →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
```

### 6.2. タスク進捗コンポーネント（フェーズ2）

```typescript
// src/components/AcontextTaskProgress.tsx

interface Task {
  id: string;
  order: number;
  status: "pending" | "success" | "failed";
  data: {
    task_description: string;
    progresses?: string[];
    user_preferences?: string[];
  };
}

interface AcontextTaskProgressProps {
  sessionId: string;
}

export function AcontextTaskProgress({ sessionId }: AcontextTaskProgressProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // タスクを取得（5秒ごとに更新）
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch(`/api/trpc/acontext.getSessionTasks?input=${JSON.stringify({ sessionId })}`);
        const data = await response.json();
        setTasks(data.result?.data?.items || []);
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  if (loading) {
    return <Spinner size="small" />;
  }

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: "16px" }}>
      <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
        📋 タスク進捗
      </h3>
      {tasks.map((task) => (
        <div
          key={task.id}
          style={{
            padding: "12px",
            background: "#FFFFFF",
            border: "1px solid #DFE1E6",
            borderRadius: "4px",
            marginBottom: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontWeight: 600 }}>タスク #{task.order}:</span>
            <span>{task.data.task_description}</span>
            <Badge
              appearance={
                task.status === "success" ? "success" :
                task.status === "failed" ? "error" :
                "inprogress"
              }
            >
              {task.status === "success" ? "完了" :
               task.status === "failed" ? "失敗" :
               "進行中"}
            </Badge>
          </div>
          {task.data.progresses && task.data.progresses.length > 0 && (
            <div style={{ marginTop: "8px", paddingLeft: "16px", fontSize: "12px", color: "#6B778C" }}>
              {task.data.progresses.map((progress, i) => (
                <div key={i}>└─ {progress}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## 7. ユーザー体験の変化

### 7.1. PoC段階（最小限の変更）

**ユーザーが感じる変化:**
- ✅ 既存の操作フローは変わらない
- ✅ 分析結果の下部にセッション情報が表示される（オプション）
- ✅ Acontextダッシュボードで詳細を確認できる

**メリット:**
- 学習コストが低い
- 既存ユーザーへの影響が最小限
- 段階的に機能を追加可能

### 7.2. フェーズ2（タスク進捗表示）

**ユーザーが感じる変化:**
- ✅ 分析実行中にタスクの進捗が可視化される
- ✅ 各タスクのステータスが分かる
- ✅ より透明性の高いプロセス

**メリット:**
- ユーザーが何が進行中か理解できる
- 待ち時間のストレスが軽減
- 問題発生時の原因特定が容易

### 7.3. フェーズ3以降（スキル学習）

**ユーザーが感じる変化:**
- ✅ 過去の成功パターンが自動的に活用される
- ✅ 時間の経過とともに分析の精度が向上
- ✅ カスタマイズされた提案が可能

**メリット:**
- 長期的な価値の向上
- ユーザーごとの最適化
- 運用コストの削減

---

## 8. レスポンシブデザイン

### 8.1. モバイル対応

**PoC段階:**
- セッション情報は折りたたみ可能
- リンクはタップしやすいサイズ

**フェーズ2:**
- タスク進捗は縦スクロール可能
- ステータスバッジは小さめに表示

### 8.2. タブレット対応

- デスクトップと同様のレイアウト
- タッチ操作に対応

---

## 9. アクセシビリティ

### 9.1. キーボード操作

- すべてのインタラクティブ要素がキーボードで操作可能
- フォーカスインジケーターが明確

### 9.2. スクリーンリーダー

- セマンティックなHTMLを使用
- ARIAラベルを適切に設定

---

## 10. パフォーマンス

### 10.1. 読み込み時間

**PoC段階:**
- セッション情報の表示は遅延読み込み
- Acontext API呼び出しは非同期

**フェーズ2:**
- タスク進捗の更新は5秒間隔
- 必要に応じてポーリングを停止

### 10.2. バンドルサイズ

- Acontext SDKは約50KB（gzip圧縮後）
- 既存のバンドルサイズへの影響は最小限

---

## 11. エラーハンドリング

### 11.1. Acontextが利用不可の場合

**UIの表示:**
- セッション情報は表示しない
- エラーメッセージは表示しない（グレースフルデグラデーション）
- 既存機能は正常に動作

### 11.2. ネットワークエラー

- リトライロジックを実装
- ユーザーには明示的なエラーを表示しない
- ログに記録

---

## 12. 実装の優先順位

### 12.1. PoC段階（必須）

1. ✅ セッションIDの表示（オプション、折りたたみ可能）
2. ✅ Acontextダッシュボードへのリンク
3. ✅ グレースフルデグラデーション

### 12.2. フェーズ2（推奨）

1. ⚠️ タスク進捗の表示
2. ⚠️ タスクステータスの表示
3. ⚠️ 自動更新機能

### 12.3. フェーズ3以降（将来）

1. 🔮 セッション履歴の表示
2. 🔮 スキル検索UI
3. 🔮 スキル管理UI

---

## 13. デザインシステム

### 13.1. 既存コンポーネントの活用

- Atlassian Design Systemのコンポーネントを使用
- 既存のスタイルガイドに準拠

### 13.2. 新しいコンポーネント

- Acontext関連のコンポーネントは既存のデザインシステムに統合
- 一貫性のあるUI/UXを維持

---

## 14. まとめ

### 14.1. 変更の概要

**PoC段階:**
- 視覚的な変更は最小限
- 既存のUI/UXを維持
- オプション機能として追加

**フェーズ2以降:**
- タスク進捗の可視化
- より透明性の高いプロセス
- ユーザー体験の向上

### 14.2. ユーザーへの影響

**最小限:**
- 既存の操作フローは変わらない
- 学習コストが低い
- 段階的に機能を追加可能

**長期的な価値:**
- より透明性の高いプロセス
- 過去の成功パターンの活用
- 時間の経過とともに精度が向上

---

**作成日**: 2025-01-XX
**バージョン**: 1.0


