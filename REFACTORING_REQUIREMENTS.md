# リファクタリング要件定義書

## 1. はじめに

### 1.1 目的
本ドキュメントは、美容クリニック向けAI統合プラットフォーム「クリマケ」のコードベースリファクタリングに関する要件を定義する。
コードの保守性、可読性、パフォーマンスの向上を目的とする。

### 1.2 対象範囲
- ソースコード全体（`src/`ディレクトリ）
- プロジェクトルートのファイル整理
- ドキュメントの整理・統合

### 1.3 現状分析サマリー
| 項目 | 現状 |
|:---|:---|
| 総ファイル数（src内） | 約100ファイル |
| Markdownファイル数 | 81ファイル |
| インラインスタイル使用箇所 | 1,346箇所（50ファイル） |
| 最大ファイル行数 | 2,163行（content-generation.tsx） |
| 重複定数定義 | 16ファイルで`USER_ID_PLACEHOLDER`重複 |

---

## 2. リファクタリング項目

### 2.1 【優先度: 高】不要ファイルの削除

#### 2.1.1 一時ファイルの削除
以下のファイルを削除する：

```
/temp.md
/temp 2.md
/temp-strategy.md
```

#### 2.1.2 重複ドキュメントの削除
以下のファイルを確認し、重複を削除：

```
/DEPLOY_VERCEL.md
/DEPLOY_VERCEL 2.md  ← 削除候補
```

---

### 2.2 【優先度: 高】共通定数の抽出

#### 2.2.1 対象
`USER_ID_PLACEHOLDER`が以下の16ファイルで重複定義されている：

**サーバーサイド（3ファイル）：**
```
src/server/api/routers/ai-space.ts
src/server/api/routers/ai-skill.ts
src/server/api/routers/ai-session.ts
```

**フィーチャー（9ファイル）：**
```
src/features/workflow/workflow-management.tsx
src/features/strategy/strategy-management.tsx
src/features/strategy/strategy-analysis.tsx
src/features/sns-research/sns-research.tsx
src/features/products/product-management.tsx
src/features/market-research/market-research.tsx
src/features/content/hooks/useContentSubmit.ts
src/features/content/hooks/useContentMutations.ts
src/features/content/hooks/useContentFormHandlers.ts
```

**コンテンツ関連（2ファイル）：**
```
src/features/content/content-generator.tsx
src/features/content/content-generation.tsx
```

**ページ（2ファイル）：**
```
src/app/strategy-analysis/page.tsx
src/app/strategy-analysis-council/page.tsx
```

#### 2.2.2 実装要件
1. `src/lib/constants.ts` を新規作成
2. 以下の定数を定義：

```typescript
// src/lib/constants.ts
export const USER_ID_PLACEHOLDER = 1;

// 将来的に認証実装時に置き換える
// export const getCurrentUserId = () => { ... };
```

3. 全16ファイルで import に変更

---

### 2.3 【優先度: 高】巨大ファイルの分割

#### 2.3.1 content-generation.tsx（2,163行）

**現状の問題：**
- 単一ファイルに多くの責務が集中
- テスト困難
- 変更時の影響範囲が広い

**分割案：**
```
src/features/content/
├── content-generation.tsx          # メインコンポーネント（300行以下）
├── components/
│   ├── ContentForm.tsx             # フォーム全体
│   ├── ContentPreview.tsx          # プレビュー表示
│   ├── ContentHistory.tsx          # 履歴表示
│   ├── GenerationProgress.tsx      # 生成進捗
│   └── (既存コンポーネント)
├── hooks/
│   ├── useContentGeneration.ts     # 生成ロジック
│   ├── useContentHistory.ts        # 履歴管理
│   └── (既存hooks)
├── utils/
│   └── content-helpers.ts          # ヘルパー関数
└── types/
    └── content.ts                  # 型定義
```

#### 2.3.2 content-generator.tsx（1,054行）

**分割案：**
- `content-generation.tsx`と統合検討、または同様に分割

#### 2.3.3 strategy-analysis.tsx（796行）

**分割案：**
```
src/features/strategy/
├── strategy-analysis.tsx           # メインコンポーネント
├── components/
│   ├── AnalysisForm.tsx
│   ├── AnalysisResults.tsx
│   └── AnalysisHistory.tsx
└── hooks/
    └── useStrategyAnalysis.ts
```

#### 2.3.4 分割基準
- 1ファイル300行以下を目標
- 単一責任の原則を遵守
- 再利用可能な単位で分割

---

### 2.4 【優先度: 中】インラインスタイルの整理

#### 2.4.1 現状
- 50ファイルで1,346箇所のインラインスタイル使用
- 例：`style={{ padding: "16px", background: "#FFFFFF" }}`

#### 2.4.2 対応方針

**オプションA: Tailwind CSS活用（推奨）**
```tsx
// Before
<div style={{ padding: "16px", background: "#FFFFFF", borderRadius: "8px" }}>

// After
<div className="p-4 bg-white rounded-lg">
```

**オプションB: CSS Modules**
```tsx
// styles.module.css
.container {
  padding: 16px;
  background: #FFFFFF;
  border-radius: 8px;
}

// Component.tsx
import styles from './styles.module.css';
<div className={styles.container}>
```

#### 2.4.3 優先対応ファイル（インラインスタイル数上位）
1. `src/app/page.tsx` - 34箇所
2. `src/components/Navigation.tsx` - 24箇所
3. `src/features/content/content-generation.tsx` - 多数
4. `src/features/api-key/api-key-management.tsx` - 多数

#### 2.4.4 共通スタイル定義
`src/styles/` ディレクトリを作成し、共通スタイルを定義：

```
src/styles/
├── globals.css          # グローバルスタイル（既存）
├── variables.css        # CSS変数
└── components.css       # 共通コンポーネントスタイル
```

---

### 2.5 【優先度: 中】ドキュメント整理

#### 2.5.1 現状のルートディレクトリ
```
/ACONTEXT_*.md (12ファイル)
/DEPLOY_*.md (3ファイル)
/DESIGN_*.md (2ファイル)
/IMPLEMENTATION_*.md (1ファイル)
/その他多数のMarkdownファイル
```

#### 2.5.2 整理後の構造
```
/docs/
├── README.md                    # ドキュメント目次
├── setup/
│   ├── DATABASE_SETUP.md
│   ├── ACONTEXT_SETUP_GUIDE.md
│   └── ACONTEXT_QUICK_START.md
├── deployment/
│   ├── VERCEL_COMPLETE_GUIDE.md # 統合版
│   └── DOCKERFILE.md
├── architecture/
│   ├── PROJECT_STRUCTURE.md
│   └── ACONTEXT_INTEGRATION_ANALYSIS.md
├── api/
│   └── (既存のapi/配下)
├── features/
│   └── (機能別ドキュメント)
└── archive/
    └── (古いドキュメント)
```

#### 2.5.3 ルートに残すファイル
```
/README.md                # プロジェクト概要のみ
/CHANGELOG.md             # 変更履歴（統合版）
/.env.example             # 環境変数テンプレート
```

#### 2.5.4 削除候補ファイル
```
/temp.md
/temp 2.md
/temp-strategy.md
/DEPLOY_VERCEL 2.md
/cleanup-unnecessary-files.sh   # 実行後削除
/execute_migration.sh           # 実行後削除
```

---

### 2.6 【優先度: 中】ディレクトリ構造の最適化

#### 2.6.1 推奨構造
```
src/
├── app/                        # Next.js App Router
│   └── (pages)
├── components/
│   ├── ui/                     # 汎用UIコンポーネント
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   └── ...
│   ├── layout/                 # レイアウト系
│   │   ├── Navigation.tsx
│   │   └── Footer.tsx
│   └── (feature-specific)/     # 機能固有コンポーネント
├── features/                   # 機能モジュール
│   └── [feature-name]/
│       ├── components/
│       ├── hooks/
│       ├── utils/
│       └── types/
├── lib/                        # 共通ライブラリ
│   ├── constants.ts            # 定数
│   ├── utils.ts                # ユーティリティ
│   └── api.ts                  # API関連
├── hooks/                      # グローバルフック
├── styles/                     # スタイル
├── types/                      # グローバル型定義
├── server/                     # サーバーサイド
└── trpc/                       # tRPC設定
```

---

### 2.7 【優先度: 低】型定義の整理

#### 2.7.1 現状
```
src/types/
├── ai-context-settings.ts
├── ai-council.ts
└── strategy.ts
```

#### 2.7.2 推奨構造
```
src/types/
├── index.ts                    # 型のエクスポート
├── api.ts                      # API関連型
├── models/
│   ├── product.ts
│   ├── content.ts
│   └── strategy.ts
└── common.ts                   # 共通型
```

---

### 2.8 【優先度: 低】コード品質向上

#### 2.8.1 ESLint設定強化
`.eslintrc.json` に以下のルールを追加検討：

```json
{
  "rules": {
    "max-lines": ["warn", { "max": 300 }],
    "max-lines-per-function": ["warn", { "max": 50 }],
    "complexity": ["warn", { "max": 10 }]
  }
}
```

#### 2.8.2 Prettier設定
一貫したコードフォーマットのため `.prettierrc` を確認・更新

---

## 3. 実装手順

### Phase 1: クリーンアップ（1-2時間）
1. 一時ファイル削除
2. 重複ドキュメント削除
3. ドキュメント整理（docs/へ移動）

### Phase 2: 共通化（2-3時間）
1. `src/lib/constants.ts` 作成
2. `USER_ID_PLACEHOLDER` の共通化
3. その他重複定数の共通化

### Phase 3: コンポーネント分割（4-6時間）
1. `content-generation.tsx` 分割
2. `content-generator.tsx` 分割/統合
3. `strategy-analysis.tsx` 分割

### Phase 4: スタイル整理（4-6時間）
1. 共通スタイル定義
2. インラインスタイルをTailwind/CSS Modulesに移行
3. 主要コンポーネントから順次対応

### Phase 5: 構造最適化（2-3時間）
1. ディレクトリ構造の調整
2. import パスの更新
3. 型定義の整理

---

## 4. 注意事項

### 4.1 破壊的変更の回避
- 機能に影響を与えないリファクタリングを優先
- 段階的に実施し、各Phase後に動作確認

### 4.2 テスト
- リファクタリング後は必ず動作確認
- 主要機能の手動テスト実施

### 4.3 Git管理
- Phase単位でコミット
- 意味のあるコミットメッセージを記述
- 例：`refactor: extract USER_ID_PLACEHOLDER to constants`

---

## 5. 完了基準

- [ ] 一時ファイル・重複ファイルが削除されている
- [ ] `USER_ID_PLACEHOLDER` が1箇所で定義されている
- [ ] 300行を超えるコンポーネントがない
- [ ] ルートディレクトリのMarkdownファイルが5個以下
- [ ] 全機能が正常に動作する

---

## 6. 参考情報

### 6.1 技術スタック
- Next.js 13.5.6（App Router）
- React 18.2.0
- TypeScript 5.x
- Tailwind CSS 3.x
- Prisma 6.x
- tRPC 11.x
- Atlaskit UI Components

### 6.2 関連ドキュメント
- `/docs/PROJECT_STRUCTURE.md`
- `/docs/README.md`

---

*作成日: 2025年11月28日*
*対象プロジェクト: クリマケ（beauty_project）*

