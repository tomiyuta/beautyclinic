# ChatGPTモデル選択戦略

## 概要
用途別にChatGPTモデルを使い分けることで、コスト効率と性能のバランスを最適化します。

**実装日**: 2025年11月28日

---

## モデル選択方針

### ✅ 最新モデル（GPT-5.1）を使用する機能

**戦略分析機能**
- 市場ポジション分析 (`analyzeMarketPosition`)
- 価格設定提案 (`generatePriceRecommendations`)
- キャンペーン案生成 (`generateCampaignProposals`)
- 新施術提案 (`suggestNewTreatments`)

**コンテンツ生成機能**
- Instagram LP生成 (`generateInstagramLP`)
- ウェブサイト記事生成 (`generateWebsiteArticle`)
- キャンペーンコピー生成 (`generateCampaignCopy`)
- Instagram投稿文生成 (`generateInstagramPostText`)
- 広告文生成 (`generateAdCopy`)
- ブログ記事生成 (`generateBlogArticle`)
- バッチコンテンツ生成 (`content-generation.ts`)

**理由**: 
- 高品質な出力が求められる
- 最新のトレンド情報を活用する必要がある
- 複雑な推論・分析が必要

### ✅ GPT-4o-miniを使用する機能

**AI Context機能（Acontext）**
- タスク抽出 (`task-extraction.ts`)
- スキル検索 (`skill-search.ts`)
- スキル学習 (`skill-learning.ts`)
- AIセッション管理 (`ai-session.ts`)

**理由**:
- 構造化されたデータ抽出が主目的
- コスト効率が重要
- GPT-4o-miniで十分な性能

---

## 実装詳細

### `callChatGPT`関数の拡張

**変更前**:
```typescript
export async function callChatGPT(
  prompt: string,
  systemPrompt?: string,
  maxTokens: number = 2000,
): Promise<string>
```

**変更後**:
```typescript
export async function callChatGPT(
  prompt: string,
  systemPrompt?: string,
  maxTokens: number = 2000,
  model?: string, // オプショナル: 明示的にモデルを指定する場合
): Promise<string>
```

**モデル選択ロジック**:
1. **関数引数で指定されたモデル**（最優先）
2. 環境変数`OPENAI_MODEL`で指定されたモデル
3. デフォルト候補リストから順に試行（GPT-5.1 → GPT-5 → GPT-4o → ...）

### 戦略分析・コンテンツ生成での使用例

```typescript
// GPT-5.1を明示的に指定
const result = await callChatGPT(prompt, systemPrompt, 4096, "gpt-5.1");
```

### AI Context機能での使用例

```typescript
// GPT-4o-miniを直接指定（既存実装のまま）
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [...],
});
```

---

## 更新されたファイル

### 1. `src/server/services/chatgpt.ts`
- `callChatGPT`関数に`model`パラメータを追加
- 戦略分析関数（4箇所）で`"gpt-5.1"`を指定
- コンテンツ生成関数（6箇所）で`"gpt-5.1"`を指定

### 2. `src/server/services/content-generation.ts`
- `callChatGPT`呼び出し（3箇所）で`"gpt-5.1"`を指定

### 3. AI Context機能（変更なし）
- `task-extraction.ts`: `gpt-4o-mini`を継続使用
- `skill-search.ts`: `gpt-4o-mini`を継続使用
- `skill-learning.ts`: `gpt-4o-mini`を継続使用
- `ai-session.ts`: 既存実装を維持

---

## モデル使用状況マップ

| 機能カテゴリ | 使用モデル | 呼び出し方法 |
|------------|----------|------------|
| **戦略分析** | GPT-5.1 | `callChatGPT(..., "gpt-5.1")` |
| **コンテンツ生成** | GPT-5.1 | `callChatGPT(..., "gpt-5.1")` |
| **AI Context** | GPT-4o-mini | `openai.chat.completions.create({ model: "gpt-4o-mini" })` |

---

## コスト最適化の効果

### GPT-5.1の価格（100万トークンあたり）
- 入力: $1.25
- 出力: $10.00

### GPT-4o-miniの価格（100万トークンあたり）
- 入力: $0.15
- 出力: $0.60

**効果**: AI Context機能での使用量が多い場合、GPT-4o-miniを使用することで大幅なコスト削減が可能。

---

## 今後の拡張性

### 環境変数による全体制御
環境変数`OPENAI_MODEL`を設定することで、全体のデフォルトモデルを変更可能。

### 個別関数でのモデル指定
各関数で`model`パラメータを指定することで、用途に応じた柔軟なモデル選択が可能。

### モデル候補リストの更新
`MODEL_CANDIDATES`配列を更新することで、新しいモデルリリースに対応可能。

---

## 確認事項

- ✅ ビルドエラーなし
- ✅ 型エラーなし
- ✅ 戦略分析関数でGPT-5.1を指定
- ✅ コンテンツ生成関数でGPT-5.1を指定
- ✅ AI Context機能はGPT-4o-miniを継続使用

---

**最終更新**: 2025年11月28日

