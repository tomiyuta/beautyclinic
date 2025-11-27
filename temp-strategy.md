# 戦略分析・戦略統合システム完全ドキュメント

## 目次
1. [システム概要](#システム概要)
2. [アーキテクチャ](#アーキテクチャ)
3. [戦略分析（単一AI版）](#戦略分析単一ai版)
4. [戦略統合（Council合議制）](#戦略統合council合議制)
5. [データベーススキーマ](#データベーススキーマ)
6. [APIエンドポイント](#apiエンドポイント)
7. [プロンプトシステム](#プロンプトシステム)
8. [UIコンポーネント](#uiコンポーネント)
9. [エラーハンドリング](#エラーハンドリング)
10. [設定管理](#設定管理)

---

## システム概要

### 2つの分析モード

1. **戦略分析（単一AI版）**
   - 1つのAIモデル（Claude/ChatGPT/Gemini/Grok）を使用
   - 既存の戦略分析機能を拡張
   - 4つの分析タイプに対応

2. **戦略統合（Council合議制）**
   - 複数のAIモデル（2つ以上）が並列で分析
   - ピアレビュー機能（AI同士が相互評価）
   - 議長による最終統合

### 分析タイプ

- `comprehensive`: 総合分析
- `pricing`: 価格設定提案
- `campaign`: キャンペーン案
- `new-treatment`: 新施術導入提案

---

## アーキテクチャ

### ファイル構成

```
src/
├── server/
│   ├── api/
│   │   ├── routers/
│   │   │   └── strategy.ts          # tRPCルーター（既存+新規）
│   │   └── schemas/
│   │       └── council.ts          # Zodスキーマ定義
│   ├── services/
│   │   ├── ai-council/
│   │   │   ├── council.ts          # Councilコアロジック
│   │   │   ├── prompts.ts         # Council用プロンプト
│   │   │   └── index.ts           # エクスポート
│   │   ├── claude.ts              # Claude API呼び出し
│   │   ├── chatgpt.ts            # ChatGPT API呼び出し
│   │   ├── gemini.ts              # Gemini API呼び出し
│   │   ├── grok.ts                # Grok API呼び出し
│   │   └── prompt-helper.ts      # プロンプト管理
│   └── db.ts                      # Prismaクライアント
├── types/
│   └── ai-council.ts             # Council型定義
├── components/
│   └── strategy/
│       ├── CouncilConfigPanel.tsx # Council設定UI
│       └── CouncilResultView.tsx  # Council結果表示UI
└── app/
    ├── strategy-analysis/
    │   └── page.tsx               # 既存の戦略分析ページ
    └── strategy-analysis-council/
        └── page.tsx               # 新規Councilページ
```

---

## 戦略分析（単一AI版）

### 概要

既存の戦略分析機能を拡張し、4つの分析タイプに対応。単一のAIモデルを使用して分析を実行。

### APIエンドポイント

#### `runSingleAnalysis`

**パス**: `api.strategy.runSingleAnalysis`

**入力スキーマ** (`strategySingleInputSchema`):
```typescript
{
  userId: number;                    // 必須: ユーザーID
  query: string;                     // 必須: 分析リクエスト（10文字以上）
  analysisType: "comprehensive" | "pricing" | "campaign" | "new-treatment";
  aiProvider: "claude" | "chatgpt" | "gemini" | "grok";
  marketData?: any;                  // オプション: 市場データ
  snsData?: any;                    // オプション: SNSデータ
  products?: any[];                 // オプション: 商品データ
}
```

**処理フロー**:

1. **クエリ拡張**
   ```typescript
   let enrichedQuery = query;
   
   // 商品情報を追加
   if (products && products.length > 0) {
     const productNames = products.map((p: any) => p.name || p.treatment).join(", ");
     enrichedQuery += `\n\n【当院の施術メニュー】\n${productNames}`;
   }
   
   // 市場データを追加（最大2000文字）
   if (marketData) {
     enrichedQuery += `\n\n【市場データ】\n${JSON.stringify(marketData, null, 2).slice(0, 2000)}`;
   }
   
   // SNSデータを追加（最大2000文字）
   if (snsData) {
     enrichedQuery += `\n\n【SNSトレンドデータ】\n${JSON.stringify(snsData, null, 2).slice(0, 2000)}`;
   }
   ```

2. **システムプロンプト取得**
   ```typescript
   const { STRATEGY_SYSTEM_PROMPTS } = await import("@/server/services/ai-council/prompts");
   const systemPrompt = STRATEGY_SYSTEM_PROMPTS[analysisType] ?? STRATEGY_SYSTEM_PROMPTS.comprehensive;
   ```

3. **AIモデル呼び出し**
   - **Claude**: `callClaude(\`${systemPrompt}\n\n${enrichedQuery}\`)`
   - **ChatGPT**: `callChatGPT(enrichedQuery, systemPrompt)`
   - **Gemini**: `callGemini(\`${systemPrompt}\n\n${enrichedQuery}\`)`
   - **Grok**: `callGrok(\`${systemPrompt}\n\n${enrichedQuery}\`)`

4. **結果保存**
   ```typescript
   await db.strategyRecommendation.create({
     data: {
       userId,
       marketingStrategy: analysisType === "comprehensive" ? result : null,
       priceRecommendations: analysisType === "pricing" ? result : null,
       campaignProposals: analysisType === "campaign" ? result : null,
       newTreatmentSuggestions: analysisType === "new-treatment" ? result : null,
     },
   });
   ```

**戻り値**:
```typescript
{
  content: string;        // AIの回答
  aiProvider: string;    // 使用したAI
  durationMs: number;    // 処理時間（ミリ秒）
}
```

### 既存の戦略分析エンドポイント

#### `analyzeMarketPosition` (総合分析)

**パス**: `api.strategy.analyzeMarketPosition`

**入力**:
```typescript
{
  userId: number;
  location: string;
  productIds?: number[];
  includeMarketData?: boolean;
  includeSNSData?: boolean;
}
```

**処理**:
1. 商品データ取得（`productIds`指定時はそれを使用、未指定時は全商品）
2. 市場データ取得（`includeMarketData`がtrueの場合）
3. SNSデータ取得（`includeSNSData`がtrueの場合）
4. AIプロバイダー決定（ユーザー設定 → 環境変数 → デフォルトChatGPT）
5. プロンプト取得（データベース → デフォルト）
6. Web検索実行（最新情報取得）
7. AI呼び出し
8. 結果保存

**使用するAIサービス関数**:
- Claude: `claudeAnalyzeMarketPosition()`
- ChatGPT: `chatgptAnalyzeMarketPosition()`
- Gemini: `geminiAnalyzeMarketPosition()`

#### `generatePriceRecommendations` (価格設定提案)

**パス**: `api.strategy.generatePriceRecommendations`

**入力**:
```typescript
{
  userId: number;
}
```

**処理**: 商品データと市場価格データを取得して価格提案を生成

#### `generateCampaignProposals` (キャンペーン案)

**パス**: `api.strategy.generateCampaignProposals`

**入力**:
```typescript
{
  userId: number;
}
```

**処理**: トレンドデータとSNSデータを取得してキャンペーン案を生成

#### `suggestNewTreatments` (新施術導入提案)

**パス**: `api.strategy.suggestNewTreatments`

**入力**:
```typescript
{
  userId: number;
}
```

**処理**: 現在の施術、市場トレンド、SNSトレンドから新施術を提案

---

## 戦略統合（Council合議制）

### 概要

複数のAIモデルが並列で分析し、ピアレビューを経て議長が最終統合を行う合議制システム。

### 型定義

#### `CouncilConfig`
```typescript
{
  models: CouncilModel[];           // 参加モデル（2つ以上必須）
  enablePeerReview: boolean;         // ピアレビュー実行するか
  chairmanMode: "auto" | "manual";   // 議長選択モード
  manualChairman?: CouncilModel;    // 手動選択時の議長
  timeoutMs: number;                // タイムアウト（ms、デフォルト120000）
}
```

#### `CouncilResult`
```typescript
{
  query: string;
  config: CouncilConfig;
  stage1: {
    responses: CouncilResponse[];   // 各モデルの回答
    durationMs: number;
  };
  stage2?: {
    reviews: PeerReviewResult[];    // ピアレビュー結果
    labelToModel: Record<string, CouncilModel>;
    aggregateRankings: AggregateRanking[];  // 集計ランキング
    durationMs: number;
  };
  stage3: CouncilFinalResponse;     // 最終統合結果
  totalDurationMs: number;
}
```

### APIエンドポイント

#### `runCouncilAnalysis`

**パス**: `api.strategy.runCouncilAnalysis`

**入力スキーマ** (`strategyCouncilInputSchema`):
```typescript
{
  userId: number;
  query: string;                     // 10文字以上
  analysisType: "comprehensive" | "pricing" | "campaign" | "new-treatment";
  councilConfig: {
    models: ["claude" | "chatgpt" | "gemini" | "grok"];  // 2つ以上
    enablePeerReview: boolean;
    chairmanMode: "auto" | "manual";
    manualChairman?: "claude" | "chatgpt" | "gemini" | "grok";
    timeoutMs: number;              // 30000-300000
  };
  marketData?: any;
  snsData?: any;
  products?: any[];
}
```

**処理フロー**:

1. **クエリ拡張**（単一AI版と同様）
2. **バリデーション**
   - 議長「自動」選択時はピアレビュー必須
   ```typescript
   enablePeerReview: councilConfig.chairmanMode === "auto" 
     ? true 
     : councilConfig.enablePeerReview
   ```
3. **Council実行** (`runCouncil()`)
4. **結果保存**（分析タイプに応じて適切なカラムに保存）

### Council処理フロー

#### Stage 1: 並列クエリ（回答収集）

**関数**: `stage1CollectResponses()`

**処理**:
1. 分析タイプに応じたシステムプロンプト取得
   ```typescript
   const systemPrompt = STRATEGY_SYSTEM_PROMPTS[analysisType] 
     ?? STRATEGY_SYSTEM_PROMPTS.comprehensive;
   ```
2. 全モデルに対して並列でAPI呼び出し
   ```typescript
   const promises = models.map(async (model) => {
     const content = await withTimeout(
       callModel(model, query, systemPrompt),
       timeoutMs,
       `${model} timeout`
     );
     return { model, content, timestamp, durationMs, error? };
   });
   ```
3. エラーハンドリング（エラーが発生したモデルはスキップ）
4. 最低2つの成功が必要（失敗時はエラー）

**戻り値**:
```typescript
{
  responses: CouncilResponse[];
  durationMs: number;
}
```

#### Stage 2: ピアレビュー（オプション）

**関数**: `stage2CollectRankings()`

**処理**:
1. 成功した回答のみを対象
2. 回答を匿名化（Response A, Response B, ...）
   ```typescript
   const labelToModel: Record<string, CouncilModel> = {};
   validResponses.forEach((r, i) => {
     labelToModel[`Response ${RESPONSE_LABELS[i]}`] = r.model;
   });
   ```
3. レビュープロンプト作成
   ```typescript
   const reviewPrompt = PEER_REVIEW_PROMPT
     .replace("{{QUERY}}", query)
     .replace("{{RESPONSES}}", anonymizedResponses);
   ```
4. 各モデルにレビュー依頼（並列）
5. ランキングパース
   - `FINAL RANKING:` セクションを検索
   - `1. Response A - 理由` 形式をパース
6. ランキング集計
   - 各モデルの平均順位を計算
   - 投票数を集計

**戻り値**:
```typescript
{
  reviews: PeerReviewResult[];
  labelToModel: Record<string, CouncilModel>;
  aggregateRankings: AggregateRanking[];
  durationMs: number;
}
```

#### Stage 3: 議長統合

**関数**: `stage3SynthesizeFinal()`

**議長決定ロジック**:
```typescript
if (config.chairmanMode === "auto" && stage2?.aggregateRankings.length) {
  // ピアレビュー1位を議長に
  chairman = stage2.aggregateRankings[0].model;
} else {
  // 手動選択 or フォールバック
  chairman = config.manualChairman ?? config.models[0];
}
```

**処理**:
1. 有効な回答を統合
   ```typescript
   const responsesText = validResponses
     .map((r) => `### ${r.model.toUpperCase()}\n${r.content}`)
     .join("\n\n---\n\n");
   ```
2. ランキング情報を追加（あれば）
3. 議長プロンプト作成
   ```typescript
   const chairmanPrompt = CHAIRMAN_SYNTHESIS_PROMPT
     .replace("{{QUERY}}", query)
     .replace("{{RESPONSES}}", responsesText)
     .replace("{{RANKING_INFO}}", rankingInfo);
   ```
4. 議長モデルで統合実行

**戻り値**:
```typescript
{
  content: string;
  chairman: CouncilModel;
  durationMs: number;
}
```

### モデル呼び出し関数

**関数**: `callModel()`

**実装**:
```typescript
async function callModel(
  model: CouncilModel,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  switch (model) {
    case "claude":
      // ClaudeはsystemPromptを直接受け取らないので、プロンプトに含める
      return await callClaude(systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt);
    
    case "chatgpt":
      // ChatGPTはsystemPromptを直接受け取る
      return await callChatGPT(prompt, systemPrompt);
    
    case "gemini":
      // GeminiはsystemPromptを直接受け取らないので、プロンプトに含める
      return await callGemini(systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt);
    
    case "grok":
      // GrokはsystemPromptを直接受け取らないので、プロンプトに含める
      return await callGrok(systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt);
  }
}
```

---

## データベーススキーマ

### `StrategyRecommendation` テーブル

```prisma
model StrategyRecommendation {
  id                      Int                  @id @default(autoincrement())
  userId                  Int
  analysisDate            DateTime             @default(now())
  priceRecommendations    String?              @db.Text
  campaignProposals       String?              @db.Text
  newTreatmentSuggestions String?              @db.Text
  marketingStrategy       String?              @db.Text
  userFeedback            String?              @db.Text
  implementationStatus    ImplementationStatus @default(pending)
  createdAt               DateTime             @default(now())
  updatedAt               DateTime             @updatedAt

  @@map("strategyRecommendations")
}
```

**保存ロジック**:
- `comprehensive` → `marketingStrategy`
- `pricing` → `priceRecommendations`
- `campaign` → `campaignProposals`
- `new-treatment` → `newTreatmentSuggestions`

---

## APIエンドポイント

### tRPCルーター: `strategyRouter`

#### 既存エンドポイント

1. **`analyzeMarketPosition`** - 総合分析（既存）
2. **`generatePriceRecommendations`** - 価格設定提案（既存）
3. **`generateCampaignProposals`** - キャンペーン案（既存）
4. **`suggestNewTreatments`** - 新施術導入提案（既存）
5. **`list`** - 履歴一覧取得
6. **`getById`** - 履歴詳細取得
7. **`updateFeedback`** - フィードバック更新
8. **`getCurrentModel`** - 現在のモデル情報取得
9. **`getUserSettings`** - ユーザー設定取得
10. **`updateUserSettings`** - ユーザー設定更新

#### 新規エンドポイント

11. **`runCouncilAnalysis`** - Council合議制分析
12. **`runSingleAnalysis`** - 単一AI分析（新規統一API）

---

## プロンプトシステム

### Council用プロンプト

#### 分析タイプ別システムプロンプト

**ファイル**: `src/server/services/ai-council/prompts.ts`

##### 1. 総合分析 (`comprehensive`)
```
あなたは美容クリニックの経営コンサルタントです。
市場データ、SNSトレンド、競合情報を総合的に分析し、
具体的で実行可能な経営戦略を提案してください。

重要な観点:
- 小規模クリニック（スタッフ5名以下）の現実的な制約を考慮
- 翌週から実行可能な具体的アクション
- 投資対効果（ROI）の明示
- 医療広告ガイドラインの遵守
```

##### 2. 価格設定提案 (`pricing`)
```
あなたは美容クリニックの価格戦略コンサルタントです。
市場価格データと競合情報を分析し、最適な価格設定を提案してください。

重要な観点:
- 競合との価格ポジショニング
- 原価率と利益率のバランス
- 顧客の価格感度
- 段階的な価格調整案
```

##### 3. キャンペーン案 (`campaign`)
```
あなたは美容クリニックのマーケティングコンサルタントです。
SNSトレンドと市場動向を分析し、効果的なキャンペーン案を提案してください。

重要な観点:
- 季節性・トレンドとの連動
- ターゲット顧客層の明確化
- 予算と期待効果
- 医療広告ガイドラインの遵守
```

##### 4. 新施術導入提案 (`new-treatment`)
```
あなたは美容クリニックの事業開発コンサルタントです。
市場トレンドと競合分析から、導入すべき新施術を提案してください。

重要な観点:
- 市場成長性と需要予測
- 初期投資と回収期間
- 必要な設備・人材・研修
- リスクと対策
```

#### ピアレビュープロンプト

```
以下は、ユーザーの質問に対する複数のAIの回答です（匿名化されています）。

## ユーザーの質問
{{QUERY}}

## 回答一覧
{{RESPONSES}}

---

## あなたのタスク
各回答を以下の観点で評価し、ランキングを付けてください：

1. **正確性**: 事実に基づいているか、数値の根拠があるか
2. **実用性**: 小規模クリニックで実行可能か、具体的なアクションがあるか
3. **洞察**: 独自の視点や深い分析があるか
4. **ガイドライン遵守**: 医療広告ガイドラインに違反する表現がないか

## 出力形式
必ず以下の形式で出力してください：

### 評価詳細
（各回答の評価を簡潔に記述）

### FINAL RANKING:
1. Response X - （1行で理由）
2. Response Y - （1行で理由）
3. Response Z - （1行で理由）

※必ず「FINAL RANKING:」ヘッダーの後に番号付きリストで全回答を順位付けしてください。
```

#### 議長統合プロンプト

```
あなたはLLM Councilの議長です。
複数のAIモデルがユーザーの質問に回答しました。
{{RANKING_INFO}}

## ユーザーの質問
{{QUERY}}

## 各AIの回答
{{RESPONSES}}

---

## あなたのタスク
全ての回答を統合し、最も価値のある最終回答を作成してください。

統合のガイドライン:
1. 各回答の優れた点を取り入れる
2. 矛盾する情報がある場合は、根拠のある方を採用
3. 具体的な数値や事実は出典を明記
4. 実行可能なアクションを優先
5. 医療広告ガイドラインを遵守

## 出力形式
マークダウン形式で、構造化された回答を作成してください。
セクションには適切な見出しを付けてください。
```

### 既存の戦略分析プロンプト

**ファイル**: `src/server/services/prompt-helper.ts`

プロンプトはデータベースから取得され、未登録時はコード内のデフォルトを使用。

#### 総合分析プロンプト (`claude_analyze_market_position`)

**デフォルトプロンプト**:
```
あなたは美容クリニックの経営戦略コンサルタントです。
以下のデータを総合的に分析し、戦略的な提案を行ってください。

【自院の商品情報】
${clinicProducts}

【市場調査データ】
${marketData}

【SNS調査データ】
${snsData}

【所在地】
${location}

以下の観点から総合分析を行い、わかりやすく読みやすい形式で提案を返してください：

1. 市場ポジション分析
   - 強み
   - 弱み
   - 機会
   - 脅威

2. 価格調整の提案
   - 各商品の現在価格と推奨価格
   - 価格調整の理由
   - 優先度

3. キャンペーン案
   - キャンペーン名と説明
   - ターゲット層
   - 実施期間
   - プロモーション内容
   - 期待される効果
   - 推奨SNSプラットフォーム

4. 新施術提案
   - 施術名
   - 導入理由
   - 市場需要
   - 想定価格
   - 競争力

5. マーケティング戦略
   - 全体的な方向性
   - 主要施策
   - タイムライン
   - 成功指標

6. 分析総括
```

#### 価格設定提案プロンプト (`claude_generate_price_recommendations`)

```
あなたは美容クリニックの価格戦略専門家です。
以下の商品情報と市場価格データを基に、価格設定の提案を行ってください。

【自院商品】
${products}

【市場価格データ】
${marketPricing}

各商品について、以下の情報を含めてわかりやすく提案してください：

- 商品名
- 現在の価格
- 推奨価格
- 価格変動（%増減）
- 価格調整の理由
- 優先度（高/中/低）
- リスク要因
- 機会要因

最後に、価格戦略の総括と全体的な推奨事項を記載してください。
```

#### キャンペーン案プロンプト (`claude_generate_campaign_proposals`)

```
あなたは美容クリニックのマーケティングキャンペーン企画専門家です。
以下のトレンドデータとSNSデータを基に、効果的な月次キャンペーン案を2つ以上提案してください。

【市場トレンド】
${trends}

【SNSトレンド】
${snsData}

各キャンペーン案について、以下の情報を含めてわかりやすく提案してください：

- キャンペーン名
- キャンペーン説明
- ターゲット層
- 実施期間（例：2024年11月）
- プロモーション内容（割引率、特典など）
- 実施チャンネル
- SNS戦略
- 期待される効果
- 予算の目安
- 優先度（高/中/低）

最後に、キャンペーン戦略の総括と推奨実施時期を記載してください。
```

#### 新施術導入提案プロンプト (`claude_suggest_new_treatments`)

```
あなたは美容クリニックの施術開発コンサルタントです。
以下の情報を基に、未導入の有望な施術・治療の導入提案を行ってください。

【現在導入済み施術】
${currentTreatments}

【市場トレンド】
${marketTrends}

【SNSトレンド】
${snsTrends}

各新施術提案について、以下の情報を含めてわかりやすく提案してください：

- 施術名
- カテゴリ
- 導入理由
- 市場需要（高/中/低）
- トレンド状況
- 価格情報
  - 原価の目安
  - 販売価格の目安
  - 市場価格帯
- 競争力の評価
- 導入に必要な投資
- 投資対効果
- 優先度（高/中/低）
- 導入方法・スケジュール

最後に、新施術導入戦略の総括と推奨導入タイムラインを記載してください。
```

### プロンプト管理システム

**関数**: `getPrompt(promptType, defaultPrompt)`

**処理**:
1. データベースからプロンプト取得
2. `isActive`がtrueの場合、そのプロンプトを使用
3. 未登録または非アクティブの場合、デフォルトプロンプトを使用
4. Webリサーチ指示を自動追加

**プレースホルダー置換**:
- `${clinicProducts}` → 商品データ（JSON）
- `${marketData}` → 市場データ（JSON）
- `${snsData}` → SNSデータ（JSON）
- `${location}` → 所在地
- `${products}` → 商品データ（JSON）
- `${marketPricing}` → 市場価格データ（JSON）
- `${trends}` → トレンドデータ（JSON）
- `${currentTreatments}` → 現在の施術（JSON）

---

## UIコンポーネント

### 既存ページ

#### `/strategy-analysis`

**ファイル**: `src/app/strategy-analysis/page.tsx`

**コンポーネント**: `StrategyAnalysis` (`src/features/strategy/strategy-analysis.tsx`)

**機能**:
- 総合分析
- 価格設定提案
- キャンペーン案生成
- 新施術導入提案
- 履歴表示

### 新規ページ

#### `/strategy-analysis-council`

**ファイル**: `src/app/strategy-analysis-council/page.tsx`

**機能**:
- 分析タイプ選択
- 分析モード切り替え（単一AI / Council）
- 単一AI選択
- Council設定
- 結果表示

**主要コンポーネント**:

1. **`CouncilConfigPanel`** (`src/components/strategy/CouncilConfigPanel.tsx`)
   - 参加モデル選択（チェックボックス）
   - ピアレビューON/OFF（Toggle）
   - 議長選択（RadioGroup）
   - 手動議長選択（Select）
   - 処理時間の目安表示

2. **`CouncilResultView`** (`src/components/strategy/CouncilResultView.tsx`)
   - 最終統合結果表示
   - ピアレビュー結果表示（ランキング）
   - 各AIの個別回答（Tabs）
   - エラー表示

---

## エラーハンドリング

### Council処理でのエラー

1. **モデル数不足**
   - エラー: `"Council requires at least 2 models"`
   - 発生条件: `config.models.length < 2`

2. **回答不足**
   - エラー: `"Only X model(s) responded successfully. Council requires at least 2."`
   - 発生条件: 成功した回答が2つ未満

3. **タイムアウト**
   - エラー: `"{model} timeout"`
   - 発生条件: 各ステージでタイムアウト（デフォルト120秒）

4. **モデルエラー**
   - エラー: 各モデルのAPI呼び出しエラー
   - 処理: エラーが発生したモデルはスキップ、他のモデルは継続

### 単一AI処理でのエラー

1. **プロンプト取得失敗**
   - エラー: `"Failed to get prompt template"`
   - フォールバック: デフォルトプロンプトを使用

2. **データベース保存失敗**
   - 警告: `"[Single] Failed to save to database"`
   - 処理: 警告のみ、分析結果は返却

---

## 設定管理

### ユーザー設定

**テーブル**: `UserSettings`

**関連フィールド**:
- `strategyAIProvider`: "claude" | "chatgpt" | "gemini"

**取得ロジック** (`getStrategyAIProvider()`):
1. ユーザー設定から取得
2. 環境変数 `STRATEGY_AI_PROVIDER` を確認
3. デフォルト: "chatgpt"

### 環境変数

- `STRATEGY_AI_PROVIDER`: デフォルトAIプロバイダー
- `CLAUDE_API_KEY`: Claude APIキー
- `OPENAI_API_KEY`: ChatGPT APIキー
- `GEMINI_API_KEY`: Gemini APIキー
- `GROK_API_KEY`: Grok APIキー

### デフォルト設定

#### Council設定

```typescript
const DEFAULT_COUNCIL_CONFIG: CouncilConfig = {
  models: ["claude", "chatgpt", "gemini", "grok"],
  enablePeerReview: true,
  chairmanMode: "manual",
  manualChairman: "claude",
  timeoutMs: 120000, // 2分
};
```

---

## データフロー

### 戦略分析（単一AI版）

```
[UI] → [tRPC] → [Router] → [AI Service] → [AI API]
                                    ↓
                              [Database]
                                    ↓
                              [Response]
```

### 戦略統合（Council）

```
[UI] → [tRPC] → [Router] → [Council Service]
                                    ↓
                            [Stage 1: 並列クエリ]
                         /    |    |    \
                    [Claude] [GPT] [Gemini] [Grok]
                         \    |    |    /
                            [回答収集]
                                    ↓
                            [Stage 2: ピアレビュー]
                         /    |    |    \
                    [Claude] [GPT] [Gemini] [Grok]
                         \    |    |    /
                            [ランキング集計]
                                    ↓
                            [Stage 3: 議長統合]
                                    ↓
                              [議長モデル]
                                    ↓
                              [最終回答]
                                    ↓
                              [Database]
                                    ↓
                              [Response]
```

---

## 処理時間の目安

### Council処理

- **Stage 1（並列クエリ）**: 約30秒
- **Stage 2（ピアレビュー）**: 約30秒（有効時）
- **Stage 3（議長統合）**: 約20秒
- **合計**: 約50秒（ピアレビュー無効） / 約80秒（ピアレビュー有効）

### 単一AI処理

- **処理時間**: 約20-40秒（モデルとクエリの長さによる）

---

## 技術スタック

- **フレームワーク**: Next.js 13.5.6
- **API**: tRPC 11.7.1
- **データベース**: Prisma 6.18.0
- **バリデーション**: Zod 4.1.12
- **UI**: Atlassian Design System
- **AI API**:
  - Claude (Anthropic)
  - ChatGPT (OpenAI)
  - Gemini (Google)
  - Grok (xAI)

---

## 注意事項

1. **議長自動選択**: ピアレビューが必須（`chairmanMode === "auto"`）
2. **最小モデル数**: Councilには2つ以上のモデルが必要
3. **タイムアウト**: デフォルト120秒、最大300秒
4. **データサイズ**: 市場データ・SNSデータは最大2000文字に制限
5. **エラー許容**: 一部のモデルがエラーでも、2つ以上成功すれば継続

---

## 今後の拡張可能性

1. **プロンプトの動的カスタマイズ**: UIからプロンプト編集
2. **結果の比較機能**: 複数の分析結果を比較
3. **履歴からの再実行**: 過去の設定で再分析
4. **バッチ処理**: 複数の分析を一括実行
5. **結果のエクスポート**: PDF/Excel形式での出力

