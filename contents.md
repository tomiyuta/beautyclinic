# コンテンツ生成機能 完全ドキュメント

このドキュメントでは、クリマケのコンテンツ生成機能について、コード、プロンプト、データフローを含めて詳細に説明します。

## 目次

1. [概要](#概要)
2. [アーキテクチャ](#アーキテクチャ)
3. [バックエンド実装](#バックエンド実装)
4. [フロントエンド実装](#フロントエンド実装)
5. [プロンプト詳細](#プロンプト詳細)
6. [Web検索統合](#web検索統合)
7. [データベース保存](#データベース保存)
8. [データフロー](#データフロー)
9. [使用方法](#使用方法)

---

## 概要

コンテンツ生成機能は、ChatGPT APIを使用して以下の3種類のマーケティングコンテンツを自動生成します：

1. **Instagram用LP案** - Instagram投稿用のランディングページ案
2. **HP記事** - SEO最適化されたWebサイト記事
3. **キャンペーンコピー** - キャンペーン用のコピーライティング

### 主な特徴

- **Web検索統合**: 最新のトレンド情報を取得してコンテンツに反映
- **プロンプト管理**: データベースまたはデフォルトプロンプトを使用
- **視覚的プレビュー**: Instagram LPをInstagram風UIで表示
- **画像エクスポート**: html2canvasを使用して画像としてダウンロード可能
- **履歴管理**: 生成したコンテンツをデータベースに保存し、履歴として確認可能

---

## アーキテクチャ

### システム構成

```
┌─────────────────────────────────────┐
│  フロントエンド                      │
│  (content-generation.tsx)            │
│  - フォーム入力                       │
│  - プレビュー表示                     │
│  - 履歴表示                           │
└──────────────┬──────────────────────┘
               │ tRPC
               ↓
┌─────────────────────────────────────┐
│  tRPCルーター                        │
│  (content.ts)                        │
│  - generateInstagramLP               │
│  - generateWebsiteArticle            │
│  - generateCampaignCopy              │
│  - list / getById / updateStatus     │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│  ChatGPTサービス                    │
│  (chatgpt.ts)                        │
│  - generateInstagramLP()            │
│  - generateWebsiteArticle()         │
│  - generateCampaignCopy()           │
│  - callChatGPT()                    │
└──────────────┬──────────────────────┘
               │
               ├─→ Web検索サービス
               │   (web-search.ts)
               │
               └─→ プロンプト管理
                   (prompt-helper.ts)
                   ├─→ データベース
                   │   (PromptTemplate)
                   └─→ デフォルトプロンプト
                       ↓
┌─────────────────────────────────────┐
│  データベース保存                    │
│  (GeneratedContent)                 │
└─────────────────────────────────────┘
```

### ファイル構成

```
src/
├── app/
│   └── content/
│       └── page.tsx                 # コンテンツ生成ページ
├── features/
│   └── content/
│       └── content-generation.tsx   # メインUIコンポーネント
└── server/
    ├── api/
    │   └── routers/
    │       └── content.ts           # tRPCルーター
    └── services/
        ├── chatgpt.ts               # ChatGPT API統合
        ├── prompt-helper.ts         # プロンプト管理
        └── web-search.ts            # Web検索機能
```

---

## バックエンド実装

### 1. tRPCルーター (`src/server/api/routers/content.ts`)

#### 1.1 Instagram LP生成 (`generateInstagramLP`)

**エンドポイント**: `content.generateInstagramLP`

**入力パラメータ**:
```typescript
{
  userId: number;                    // 必須: ユーザーID
  strategyId?: number;                // オプション: 関連する戦略ID
  campaignTitle: string;             // 必須: キャンペーン名（最小1文字）
  campaignDescription: string;        // 必須: キャンペーン説明（最小1文字）
  targetAudience?: string;           // オプション: ターゲット層
  promotion?: string;                 // オプション: プロモーション内容
  designApproach?: "minimal" | "bold" | "elegant" | "trendy";  // オプション: デザインアプローチ（デフォルト: "trendy"）
  count?: number;                    // オプション: 生成件数（1-5、デフォルト: 3）
}
```

**処理フロー**:
1. `designApproach`に基づいて複数パターンを生成（最大5件）
2. 各パターンごとに`generateInstagramLP`関数を呼び出し
3. 生成結果をデータベースに保存（`contentType: "instagram_lp"`）
4. メタデータに`designApproach`を保存
5. 生成されたLP案を配列で返す

**戻り値**:
```typescript
{
  results: Array<{
    id: number;                      // データベースID
    approach: "minimal" | "bold" | "elegant" | "trendy";
    result: string;                  // 生成されたLP案（テキスト）
  }>;
  message: string;                   // 成功メッセージ
}
```

**エラーハンドリング**:
- エラー発生時は`TRPCError`をスロー
- エラーメッセージを詳細にログ出力

#### 1.2 HP記事生成 (`generateWebsiteArticle`)

**エンドポイント**: `content.generateWebsiteArticle`

**入力パラメータ**:
```typescript
{
  userId: number;                    // 必須: ユーザーID
  strategyId?: number;              // オプション: 関連する戦略ID
  campaignTitle: string;             // 必須: キャンペーン名
  campaignDescription: string;        // 必須: キャンペーン説明
  targetAudience?: string;           // オプション: ターゲット層
  seoKeywords?: string[];           // オプション: SEOキーワード配列
}
```

**処理フロー**:
1. `generateWebsiteArticle`関数を呼び出し
2. SEOキーワードを考慮した記事を生成
3. データベースに保存（`contentType: "website_article"`）
4. メタデータに`keywords`を保存

**戻り値**:
```typescript
{
  id: number;                        // データベースID
  result: string;                    // 生成された記事（HTML形式）
  message: string;                   // 成功メッセージ
}
```

#### 1.3 キャンペーンコピー生成 (`generateCampaignCopy`)

**エンドポイント**: `content.generateCampaignCopy`

**入力パラメータ**:
```typescript
{
  userId: number;                    // 必須: ユーザーID
  strategyId?: number;              // オプション: 関連する戦略ID
  campaignTitle: string;             // 必須: キャンペーン名
  campaignDescription: string;        // 必須: キャンペーン説明
  targetAudience?: string;           // オプション: ターゲット層
  promotion?: string;                // オプション: プロモーション内容
  tone?: "professional" | "friendly" | "trendy";  // オプション: トーン（デフォルト: "friendly"）
}
```

**処理フロー**:
1. `generateCampaignCopy`関数を呼び出し
2. 指定されたトーンでコピーを生成
3. データベースに保存（`contentType: "campaign_copy"`）
4. メタデータに`tone`を保存

**戻り値**:
```typescript
{
  id: number;                        // データベースID
  result: string;                    // 生成されたコピー
  message: string;                   // 成功メッセージ
}
```

#### 1.4 その他のエンドポイント

**履歴一覧取得 (`list`)**:
```typescript
// 入力
{
  userId: number;
  contentType?: "instagram_lp" | "website_article" | "campaign_copy";
}

// 戻り値: GeneratedContent[]
```

**ID指定取得 (`getById`)**:
```typescript
// 入力
{
  id: number;
  userId: number;
}

// 戻り値: GeneratedContent（メタデータをJSONパース）
```

**ステータス更新 (`updateStatus`)**:
```typescript
// 入力
{
  id: number;
  userId: number;
  status: "draft" | "approved" | "published";
}

// 戻り値: Updated GeneratedContent
```

---

### 2. ChatGPTサービス (`src/server/services/chatgpt.ts`)

#### 2.1 `generateInstagramLP`関数

**関数シグネチャ**:
```typescript
export async function generateInstagramLP(
  campaign: {
    title: string;
    description: string;
    targetAudience?: string;
    promotion?: string;
  },
  designApproach: "minimal" | "bold" | "elegant" | "trendy" = "trendy",
): Promise<string>
```

**処理の流れ**:

1. **現在日付の取得**
   ```typescript
   const currentDate = new Date();
   const currentYear = currentDate.getFullYear();
   const currentMonth = currentDate.getMonth() + 1;
   const currentDateStr = `${currentYear}年${currentMonth}月`;
   ```

2. **デザインアプローチのテキスト変換**
   ```typescript
   const approachText = {
     minimal: "シンプルでミニマルなデザイン",
     bold: "大胆で目を引くデザイン",
     elegant: "エレガントで洗練されたデザイン",
     trendy: "トレンディで現代的なデザイン",
   }[designApproach];
   ```

3. **Web検索の実行**
   ```typescript
   const searchQuery = generateInstagramLPSearchQuery(
     campaign.title, 
     currentYear, 
     currentMonth
   );
   const searchResults = await performWebSearch(searchQuery, 10);
   const webSearchResults = formatSearchResults(searchResults);
   ```
   - エラー時は警告メッセージを追加して処理を継続

4. **プロンプトテンプレートの取得**
   ```typescript
   const template = await getPrompt(
     "chatgpt_generate_instagram_lp", 
     defaultPrompt
   );
   ```

5. **プレースホルダーの置換**
   ```typescript
   const prompt = replacePlaceholders(template, {
     campaignTitle: campaign.title,
     campaignDescription: campaign.description,
     targetAudience: campaign.targetAudience || "美容に興味のある20-50代の女性",
     promotion: campaign.promotion || "特典あり",
     approachText,
     currentDate: currentDateStr
   });
   ```

6. **ChatGPT API呼び出し**
   ```typescript
   return callChatGPT(prompt);
   ```

**デフォルトプロンプト**:
```
以下のキャンペーン情報を基に、${approachText}のInstagram用LP案を作成してください。

【キャンペーン情報】
タイトル: ${campaignTitle}
説明: ${campaignDescription}
ターゲット層: ${targetAudience}
プロモーション内容: ${promotion}

【重要】以下のWeb検索結果を基に、最新のトレンドを取り入れたLP案を作成してください。
現在の日付は${currentDate}です。${currentYear}年${currentMonth}月時点の最新情報を優先的に使用してください。

${webSearchResults}

【作成指示】
以下の情報を含めて、上記のWeb検索結果を参考に、わかりやすく読みやすい形式で提案してください：

- LPのタイトル
- メインヘッドライン
- 説明文（3-4文程度）
- 主要ポイント（3つ程度）
- メリット（2つ程度）
- 行動喚起文（例：「今すぐ予約する」）
- 推奨ハッシュタグ（3つ程度）
- デザイン要素の詳細な指示
- 推奨カラースキーム
- トーン（例：親しみやすい、高級感のある）

【重要】
- Web検索結果に含まれる最新のトレンド情報を活用してください
- 2024年以前の古い情報は使用しないでください
- 情報の出典（URL）を可能な限り明記してください
```

#### 2.2 `generateWebsiteArticle`関数

**関数シグネチャ**:
```typescript
export async function generateWebsiteArticle(
  campaign: {
    title: string;
    description: string;
    targetAudience?: string;
  },
  seoKeywords: string[] = [],
): Promise<string>
```

**処理の流れ**:

1. **現在日付の取得**
2. **SEOキーワードの処理**
   ```typescript
   const keywords = seoKeywords.length > 0 
     ? seoKeywords.join(", ") 
     : "美容, 美容皮膚科, 施術";
   ```

3. **Web検索の実行**
   ```typescript
   const searchQuery = generateWebsiteArticleSearchQuery(
     campaign.title,
     seoKeywords.length > 0 ? seoKeywords : ["美容", "美容皮膚科"],
     currentYear,
     currentMonth
   );
   ```

4. **プロンプトテンプレートの取得と置換**
5. **ChatGPT API呼び出し**

**デフォルトプロンプト**:
```
以下のキャンペーン情報を基に、SEO最適化されたHP記事を作成してください。

【キャンペーン情報】
タイトル: ${campaignTitle}
説明: ${campaignDescription}
ターゲット層: ${targetAudience}

【SEOキーワード】
${keywords}

【重要】以下のWeb検索結果を基に、最新の情報を含めたSEO最適化記事を作成してください。
現在の日付は${currentDate}です。${currentYear}年${currentMonth}月時点の最新情報を優先的に使用してください。

${webSearchResults}

【作成指示】
以下の要件を満たしてください：
- 見出しタグ（h1, h2, h3）を適切に使用
- SEOキーワードを自然に含める
- 読みやすく、情報価値の高い内容
- 800-1200文字程度
- 構造化されたHTML形式
- Web検索結果に含まれる最新の情報を活用してください
- 2024年以前の古い情報は使用しないでください

記事タイトル、メタディスクリプション（150文字以内）、主要キーワード、記事本文（HTML形式）、記事の要約（2-3文）を含めてください。
```

#### 2.3 `generateCampaignCopy`関数

**関数シグネチャ**:
```typescript
export async function generateCampaignCopy(
  campaign: {
    title: string;
    description: string;
    targetAudience?: string;
    promotion?: string;
  },
  tone: "professional" | "friendly" | "trendy" = "friendly",
): Promise<string>
```

**処理の流れ**:

1. **現在日付の取得**
2. **トーンのテキスト変換**
   ```typescript
   const toneText = {
     professional: "プロフェッショナルで信頼感のある",
     friendly: "親しみやすく親近感のある",
     trendy: "トレンディで現代的な",
   }[tone];
   ```

3. **Web検索の実行**
4. **プロンプトテンプレートの取得と置換**
5. **ChatGPT API呼び出し**

**デフォルトプロンプト**:
```
以下のキャンペーン情報を基に、${toneText}トーンのキャンペーンコピーを作成してください。

【キャンペーン情報】
タイトル: ${campaignTitle}
説明: ${campaignDescription}
ターゲット層: ${targetAudience}
プロモーション内容: ${promotion}

【重要】以下のWeb検索結果を基に、最新のトレンドを取り入れたキャンペーンコピーを作成してください。
現在の日付は${currentDate}です。${currentYear}年${currentMonth}月時点の最新情報を優先的に使用してください。

${webSearchResults}

【作成指示】
以下の情報を含めて、上記のWeb検索結果を参考に、わかりやすく読みやすい形式で提案してください：

- メインキャッチコピー
- サブキャッチコピー
- 本文（3-4段落）
- 行動喚起文
- キャッチフレーズ
- 主要メッセージ（3つ程度）

【重要】
- Web検索結果に含まれる最新のトレンド情報を活用してください
- 2024年以前の古い情報は使用しないでください
- 情報の出典（URL）を可能な限り明記してください
```

#### 2.4 `callChatGPT`関数

**関数シグネチャ**:
```typescript
export async function callChatGPT(
  prompt: string,
  systemPrompt?: string,
  maxTokens: number = 4096,
): Promise<string>
```

**処理の流れ**:

1. **APIキーの確認**
   ```typescript
   if (!openai) {
     throw new Error("OpenAI API key is not configured...");
   }
   ```

2. **プロンプトの検証**
   ```typescript
   if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
     throw new Error("Prompt is empty or invalid");
   }
   ```

3. **メッセージの構築**
   ```typescript
   const messages: Array<{ role: "system" | "user"; content: string }> = [];
   
   // systemプロンプトを追加
   const finalSystemPrompt = systemPrompt?.trim() || 
     "あなたは美容クリニックのマーケティングコンテンツ作成の専門家です...";
   
   if (finalSystemPrompt) {
     messages.push({
       role: "system",
       content: finalSystemPrompt,
     });
   }
   
   // userプロンプトを追加
   messages.push({
     role: "user",
     content: prompt.trim(),
   });
   ```

4. **ChatGPT API呼び出し**
   ```typescript
   const completion = await openai.chat.completions.create({
     model: "gpt-4o",
     messages: messages,
     temperature: 0.7,
     max_tokens: maxTokens,
   });
   ```

5. **レスポンスの検証**
   ```typescript
   const responseText = completion.choices[0]?.message?.content || "";
   
   if (!responseText || responseText.trim().length === 0) {
     throw new Error("ChatGPT API returned empty response text");
   }
   ```

6. **結果を返す**

**使用モデル**: `gpt-4o`
**Temperature**: `0.7`（創造性と一貫性のバランス）
**Max Tokens**: `4096`（デフォルト）

---

### 3. プロンプト管理 (`src/server/services/prompt-helper.ts`)

#### 3.1 デフォルトプロンプト定義

**プロンプトタイプ**:
```typescript
type PromptType =
  | "chatgpt_system_prompt"
  | "chatgpt_generate_instagram_lp"
  | "chatgpt_generate_website_article"
  | "chatgpt_generate_campaign_copy";
```

**デフォルトプロンプト一覧**:

1. **`chatgpt_system_prompt`**
   ```
   あなたは美容クリニックのマーケティングコンテンツ作成の専門家です。魅力的で効果的なマーケティング素材を作成してください。
   ```

2. **`chatgpt_generate_instagram_lp`**
   ```
   以下のキャンペーン情報を基に、${approachText}のInstagram用LP案を作成してください。

   【キャンペーン情報】
   タイトル: ${campaignTitle}
   説明: ${campaignDescription}
   ターゲット層: ${targetAudience}
   プロモーション内容: ${promotion}

   以下の情報を含めて、わかりやすく読みやすい形式で提案してください：

   - LPのタイトル
   - メインヘッドライン
   - 説明文（3-4文程度）
   - 主要ポイント（3つ程度）
   - メリット（2つ程度）
   - 行動喚起文（例：「今すぐ予約する」）
   - 推奨ハッシュタグ（3つ程度）
   - デザイン要素の詳細な指示
   - 推奨カラースキーム
   - トーン（例：親しみやすい、高級感のある）
   ```

3. **`chatgpt_generate_website_article`**
   ```
   以下のキャンペーン情報を基に、SEO最適化されたHP記事を作成してください。

   【キャンペーン情報】
   タイトル: ${campaignTitle}
   説明: ${campaignDescription}
   ターゲット層: ${targetAudience}

   【SEOキーワード】
   ${keywords}

   以下の要件を満たしてください：
   - 見出しタグ（h1, h2, h3）を適切に使用
   - SEOキーワードを自然に含める
   - 読みやすく、情報価値の高い内容
   - 800-1200文字程度
   - HTML形式

   記事タイトル、メタディスクリプション（150文字以内）、主要キーワード、記事本文（HTML形式）、記事の要約（2-3文）を含めてください。
   ```

4. **`chatgpt_generate_campaign_copy`**
   ```
   以下のキャンペーン情報を基に、${toneText}トーンのキャンペーンコピーを作成してください。

   【キャンペーン情報】
   タイトル: ${campaignTitle}
   説明: ${campaignDescription}
   ターゲット層: ${targetAudience}
   プロモーション内容: ${promotion}

   以下の情報を含めて、わかりやすく読みやすい形式で提案してください：

   - メインキャッチコピー
   - サブキャッチコピー
   - 本文（3-4段落）
   - 行動喚起文
   - キャッチフレーズ
   - 主要メッセージ（3つ程度）
   ```

#### 3.2 Web検索指示の自動追加

**`addWebResearchInstruction`関数**:

すべてのプロンプトの先頭に、Web検索を実施するよう指示するテキストを自動的に追加します。

**追加される指示**:
```
【重要】Webリサーチの実施について
現在の日付は${currentYear}年${currentMonth}月です。このタスクを実行する前に、必ず最新の情報を取得するためにWebリサーチを行ってください。

- 現在の日付は${currentYear}年${currentMonth}月です。必ず${currentYear}年${currentMonth}月時点の最新情報を取得してください
- 2024年以前の古い情報は使用しないでください。必ず${currentYear}年${currentMonth}月時点の最新情報を使用してください
- 最新のトレンド、ニュース、統計データをWeb検索で取得してください
- 信頼性の高い情報源（公式サイト、ニュースサイト、業界レポートなど）を優先してください
- 検索結果を基に、最新かつ正確な情報を提供してください
- 情報の出典や日付を可能な限り明記してください
- 古い情報や不確実な情報は使用しないでください
- 特にトレンド分析や価格調査の場合は、必ず最新の市場データを検索してください
- 調査結果には必ず「${currentYear}年${currentMonth}月時点の調査結果」と明記してください

上記のWebリサーチを実施した上で、以下の指示に従って回答してください。
```

#### 3.3 プロンプト取得関数 (`getPrompt`)

**関数シグネチャ**:
```typescript
export async function getPrompt(
  promptType: PromptType,
  defaultPrompt?: string,
): Promise<string>
```

**処理の流れ**:

1. **データベースからプロンプトを取得**
   ```typescript
   const promptTemplate = await db.promptTemplate.findUnique({
     where: { promptType: promptType as any },
   });
   ```

2. **アクティブなプロンプトがあれば使用**
   ```typescript
   if (promptTemplate && promptTemplate.isActive) {
     return addWebResearchInstruction(promptTemplate.prompt);
   }
   ```

3. **デフォルトプロンプトを取得**
   ```typescript
   const fallbackPrompt = defaultPrompt ?? DEFAULT_PROMPTS[promptType] ?? "";
   ```

4. **Web検索指示を追加して返す**
   ```typescript
   return addWebResearchInstruction(fallbackPrompt);
   ```

#### 3.4 プレースホルダー置換 (`replacePlaceholders`)

**関数シグネチャ**:
```typescript
export function replacePlaceholders(
  template: string,
  placeholders: Record<string, string | number | unknown>,
): string
```

**処理の流れ**:

1. テンプレート内の`${key}`形式のプレースホルダーを検索
2. 対応する値を置換
3. オブジェクトの場合はJSON文字列化

**使用例**:
```typescript
const prompt = replacePlaceholders(template, {
  campaignTitle: "11月限定キャンペーン",
  campaignDescription: "ダーマペン施術を20%OFF",
  targetAudience: "20-50代の女性",
  approachText: "トレンディで現代的なデザイン",
  currentDate: "2025年1月"
});
```

---

## フロントエンド実装

### 1. メインコンポーネント (`src/features/content/content-generation.tsx`)

#### 1.1 状態管理

**主要な状態変数**:
```typescript
const [contentType, setContentType] = useState<
  "instagram_lp" | "website_article" | "campaign_copy" | ""
>("");

const [campaignTitle, setCampaignTitle] = useState("");
const [campaignDescription, setCampaignDescription] = useState("");
const [targetAudience, setTargetAudience] = useState("");
const [promotion, setPromotion] = useState("");

// Instagram LP用
const [designApproach, setDesignApproach] = useState<
  "minimal" | "bold" | "elegant" | "trendy"
>("trendy");
const [lpCount, setLpCount] = useState(3);

// HP記事用
const [seoKeywords, setSeoKeywords] = useState<string[]>([]);
const [keywordInput, setKeywordInput] = useState("");

// キャンペーンコピー用
const [tone, setTone] = useState<"professional" | "friendly" | "trendy">(
  "friendly"
);

// プレビューとフィードバック
const [previewContent, setPreviewContent] = useState<{
  type: string;
  data: unknown;
} | null>(null);
const [feedback, setFeedback] = useState<{
  type: "success" | "error" | null;
  message: string;
}>({ type: null, message: "" });
```

#### 1.2 tRPC Mutation

**Instagram LP生成**:
```typescript
const instagramLPMutation = api.content.generateInstagramLP.useMutation({
  onSuccess: () => {
    setFeedback({
      type: "success",
      message: "Instagram LP案が生成されました",
    });
    setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
    resetForm();
  },
  onError: (error: unknown) => {
    const message = error instanceof Error ? error.message : "エラーが発生しました";
    setFeedback({ type: "error", message });
    setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
  },
});
```

**HP記事生成**:
```typescript
const articleMutation = api.content.generateWebsiteArticle.useMutation({
  onSuccess: () => {
    setFeedback({
      type: "success",
      message: "HP記事が生成されました",
    });
    setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
    resetForm();
  },
  onError: (error: unknown) => {
    const message = error instanceof Error ? error.message : "エラーが発生しました";
    setFeedback({ type: "error", message });
    setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
  },
});
```

**キャンペーンコピー生成**:
```typescript
const copyMutation = api.content.generateCampaignCopy.useMutation({
  onSuccess: () => {
    setFeedback({
      type: "success",
      message: "キャンペーンコピーが生成されました",
    });
    setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
    void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
    resetForm();
  },
  onError: (error: unknown) => {
    const message = error instanceof Error ? error.message : "エラーが発生しました";
    setFeedback({ type: "error", message });
    setTimeout(() => setFeedback({ type: null, message: "" }), 5000);
  },
});
```

#### 1.3 フォーム送信処理

**`handleSubmit`関数**:
```typescript
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setFeedback({ type: null, message: "" });
  setPreviewContent(null);

  // バリデーション
  if (!contentType) {
    setFeedback({
      type: "error",
      message: "コンテンツタイプを選択してください",
    });
    return;
  }

  if (!campaignTitle.trim() || !campaignDescription.trim()) {
    setFeedback({
      type: "error",
      message: "キャンペーン名と説明を入力してください",
    });
    return;
  }

  try {
    if (contentType === "instagram_lp") {
      const result = await instagramLPMutation.mutateAsync({
        userId: USER_ID_PLACEHOLDER,
        campaignTitle: campaignTitle.trim(),
        campaignDescription: campaignDescription.trim(),
        targetAudience: targetAudience.trim() || undefined,
        promotion: promotion.trim() || undefined,
        designApproach,
        count: lpCount,
      });
      setPreviewContent({
        type: "instagram_lp",
        data: result,
      });
    } else if (contentType === "website_article") {
      const result = await articleMutation.mutateAsync({
        userId: USER_ID_PLACEHOLDER,
        campaignTitle: campaignTitle.trim(),
        campaignDescription: campaignDescription.trim(),
        targetAudience: targetAudience.trim() || undefined,
        seoKeywords: seoKeywords.length > 0 ? seoKeywords : undefined,
      });
      setPreviewContent({
        type: "website_article",
        data: result,
      });
    } else if (contentType === "campaign_copy") {
      const result = await copyMutation.mutateAsync({
        userId: USER_ID_PLACEHOLDER,
        campaignTitle: campaignTitle.trim(),
        campaignDescription: campaignDescription.trim(),
        targetAudience: targetAudience.trim() || undefined,
        promotion: promotion.trim() || undefined,
        tone,
      });
      setPreviewContent({
        type: "campaign_copy",
        data: result,
      });
    }
  } catch (error) {
    if (error instanceof TRPCClientError) {
      setFeedback({ type: "error", message: error.message });
    }
  }
};
```

#### 1.4 Instagram LPプレビューコンポーネント

**`InstagramLPPreview`コンポーネント**:

AI生成テキストを解析して、Instagram風のUIで表示します。

**解析処理**:
```typescript
const parseContent = (text: string) => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  let title = '';
  let headline = '';
  let description = '';
  const keyPoints: string[] = [];
  const benefits: string[] = [];
  let callToAction = '';
  const hashtags: string[] = [];
  
  let currentSection = '';
  
  // セクションごとに解析
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    
    if (line.includes('タイトル') || line.includes('タイトル:')) {
      currentSection = 'title';
      title = line.replace(/.*[:：]\s*/, '').trim() || lines[i + 1]?.trim() || '';
      if (title) i++;
      continue;
    }
    // ... 他のセクションも同様に解析
  }
  
  return { title, headline, description, keyPoints, benefits, callToAction, hashtags };
};
```

**表示要素**:
- ヘッダー（アバター、クリニック名）
- タイトル/ヘッドライン
- 説明文
- 主要ポイント（チェックマーク付き）
- 特典（グラデーション背景）
- 行動喚起ボタン（グラデーション）
- ハッシュタグ
- フッター（いいね、コメント、シェアアイコン）

**画像エクスポート機能**:
```typescript
const handleExportImage = async (element: HTMLElement) => {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
      useCORS: true,
    });
    
    const url = canvas.toDataURL("image/png", 1.0);
    const link = document.createElement("a");
    link.download = `instagram-lp-${Date.now()}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("画像出力エラー:", error);
  }
};
```

#### 1.5 生成履歴表示

**履歴取得**:
```typescript
const contentsQuery = api.content.list.useQuery({
  userId: USER_ID_PLACEHOLDER,
});
```

**表示内容**:
- コンテンツタイプ（バッジ）
- 作成日時
- ステータス（下書き/承認済み/公開済み）
- タイトル
- 折りたたみ可能な詳細表示
  - Instagram LP: 視覚的プレビュー
  - その他: テキスト表示

---

## Web検索統合

### 1. Web検索の実行タイミング

各コンテンツ生成関数で、ChatGPT API呼び出し前にWeb検索を実行します。

### 2. 検索クエリの生成

**Instagram LP用** (`generateInstagramLPSearchQuery`):
```typescript
// キャンペーンタイトルと日付から検索クエリを生成
// 例: "美容クリニック Instagram LP ダーマペン 2025年1月 トレンド"
```

**HP記事用** (`generateWebsiteArticleSearchQuery`):
```typescript
// キャンペーンタイトル、SEOキーワード、日付から検索クエリを生成
// 例: "美容クリニック SEO ダーマペン 2025年1月 記事"
```

**キャンペーンコピー用** (`generateCampaignCopySearchQuery`):
```typescript
// キャンペーンタイトルと日付から検索クエリを生成
// 例: "美容クリニック キャンペーンコピー 2025年1月 トレンド"
```

### 3. Web検索結果のフォーマット

**`formatSearchResults`関数**:
検索結果を以下の形式で整形します：

```
【Web検索結果】

1. [タイトル]
   URL: https://...
   日付: 2025-01-XX
   概要: ...

2. [タイトル]
   URL: https://...
   ...
```

### 4. エラーハンドリング

Web検索が失敗した場合でも、処理を継続します：

```typescript
try {
  const searchResults = await performWebSearch(searchQuery, 10);
  webSearchResults = formatSearchResults(searchResults);
} catch (error) {
  console.warn("[コンテンツ生成] Web検索に失敗しましたが、続行します:", error);
  webSearchResults = `【注意】Web検索APIが設定されていないため、最新情報の取得に制限があります。\n${error instanceof Error ? error.message : "Unknown error"}\n`;
}
```

---

## データベース保存

### 1. GeneratedContentモデル

**スキーマ** (`prisma/schema.prisma`):
```prisma
model GeneratedContent {
  id          Int       @id @default(autoincrement())
  userId      Int
  strategyId  Int?
  contentType ContentType  // "instagram_lp" | "website_article" | "campaign_copy"
  title       String
  content     String        // 生成されたコンテンツ（テキスト形式）
  metadata    String?       // JSON形式のメタデータ
  aiAgent     AiAgent       // "chatgpt"
  status      ContentStatus @default(draft)  // "draft" | "approved" | "published"
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@map("generatedContent")
}
```

### 2. 保存されるデータ

**Instagram LP生成時**:
```typescript
{
  userId: number,
  strategyId: number | 0,
  contentType: "instagram_lp",
  title: campaignTitle,
  content: result,  // 生成されたLP案（テキスト）
  metadata: JSON.stringify({
    designApproach: "trendy" | "minimal" | "bold" | "elegant"
  }),
  aiAgent: "chatgpt",
  status: "draft"
}
```

**HP記事生成時**:
```typescript
{
  userId: number,
  strategyId: number | 0,
  contentType: "website_article",
  title: campaignTitle,
  content: result,  // 生成された記事（HTML形式）
  metadata: JSON.stringify({
    keywords: ["美容", "美容皮膚科", ...]
  }),
  aiAgent: "chatgpt",
  status: "draft"
}
```

**キャンペーンコピー生成時**:
```typescript
{
  userId: number,
  strategyId: number | 0,
  contentType: "campaign_copy",
  title: campaignTitle,
  content: result,  // 生成されたコピー
  metadata: JSON.stringify({
    tone: "friendly" | "professional" | "trendy"
  }),
  aiAgent: "chatgpt",
  status: "draft"
}
```

---

## データフロー

### 1. 完全なデータフロー図

```
┌─────────────────────────────────────────────────────────────┐
│  1. ユーザーがフォームに入力                                 │
│     - コンテンツタイプ選択                                    │
│     - キャンペーン情報入力                                    │
│     - タイプ別オプション設定                                  │
└────────────────────┬────────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  2. フロントエンドがフォーム送信                             │
│     - handleSubmit()実行                                     │
│     - バリデーション                                          │
│     - tRPC mutation呼び出し                                  │
└────────────────────┬────────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  3. tRPCルーターがリクエストを受信                          │
│     - 入力パラメータの検証（Zod）                            │
│     - ChatGPTサービス関数を呼び出し                          │
└────────────────────┬────────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  4. ChatGPTサービス関数の処理                               │
│                                                              │
│  4.1 現在日付の取得                                          │
│      const currentDate = new Date();                         │
│                                                              │
│  4.2 Web検索の実行                                           │
│      ├─→ generateInstagramLPSearchQuery()                   │
│      ├─→ performWebSearch()                                 │
│      └─→ formatSearchResults()                              │
│                                                              │
│  4.3 プロンプトテンプレートの取得                            │
│      ├─→ getPrompt()                                        │
│      │   ├─→ データベースから取得（PromptTemplate）         │
│      │   └─→ デフォルトプロンプトを使用                      │
│      └─→ addWebResearchInstruction()                       │
│          （Web検索指示を自動追加）                           │
│                                                              │
│  4.4 プレースホルダーの置換                                  │
│      └─→ replacePlaceholders()                              │
│          - ${campaignTitle} → 実際のタイトル                 │
│          - ${campaignDescription} → 実際の説明              │
│          - ${webSearchResults} → Web検索結果                 │
│          - など                                               │
│                                                              │
│  4.5 ChatGPT API呼び出し                                     │
│      └─→ callChatGPT()                                     │
│          ├─→ OpenAI API呼び出し                            │
│          │   - model: "gpt-4o"                              │
│          │   - temperature: 0.7                             │
│          │   - max_tokens: 4096                             │
│          └─→ レスポンス検証と返却                            │
└────────────────────┬────────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  5. 生成結果をデータベースに保存                              │
│     - GeneratedContent.create()                              │
│     - メタデータをJSON形式で保存                             │
└────────────────────┬────────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  6. フロントエンドに結果を返す                                │
│     - プレビュー表示                                          │
│     - 履歴を自動更新（invalidate）                           │
└─────────────────────────────────────────────────────────────┘
```

### 2. 各ステップの詳細

#### ステップ1: ユーザー入力

**入力フィールド**:
- **コンテンツタイプ**: Instagram LP / HP記事 / キャンペーンコピー
- **キャンペーン名**: 必須
- **キャンペーン説明**: 必須
- **ターゲット層**: オプション
- **プロモーション内容**: オプション（Instagram LP、キャンペーンコピー用）
- **デザインアプローチ**: オプション（Instagram LP用、デフォルト: trendy）
- **生成件数**: オプション（Instagram LP用、1-5、デフォルト: 3）
- **SEOキーワード**: オプション（HP記事用）
- **トーン**: オプション（キャンペーンコピー用、デフォルト: friendly）

#### ステップ2: フォーム送信

**バリデーション**:
1. コンテンツタイプが選択されているか
2. キャンペーン名が入力されているか
3. キャンペーン説明が入力されているか

**エラー時**: フィードバックメッセージを表示

#### ステップ3: tRPCルーター処理

**Zodスキーマによる検証**:
- 型チェック
- 必須フィールドの確認
- 値の範囲チェック（count: 1-5など）

**エラー時**: `TRPCError`をスロー

#### ステップ4: ChatGPTサービス処理

**4.1 現在日付の取得**
```typescript
const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;
const currentDateStr = `${currentYear}年${currentMonth}月`;
```

**4.2 Web検索の実行**
```typescript
// 検索クエリを生成
const searchQuery = generateInstagramLPSearchQuery(
  campaign.title,
  currentYear,
  currentMonth
);

// Web検索を実行（最大10件）
const searchResults = await performWebSearch(searchQuery, 10);

// 結果をフォーマット
const webSearchResults = formatSearchResults(searchResults);
```

**4.3 プロンプトテンプレートの取得**
```typescript
// データベースから取得を試みる
const template = await getPrompt(
  "chatgpt_generate_instagram_lp",
  defaultPrompt  // フォールバック用
);

// Web検索指示が自動的に追加される
// → "【重要】Webリサーチの実施について..."
```

**4.4 プレースホルダーの置換**
```typescript
const prompt = replacePlaceholders(template, {
  campaignTitle: "11月限定キャンペーン",
  campaignDescription: "ダーマペン施術を20%OFF",
  targetAudience: "20-50代の女性",
  promotion: "初回20%OFF",
  approachText: "トレンディで現代的なデザイン",
  currentDate: "2025年1月",
  webSearchResults: "[Web検索結果がここに挿入]"
});
```

**4.5 ChatGPT API呼び出し**
```typescript
const messages = [
  {
    role: "system",
    content: "あなたは美容クリニックのマーケティングコンテンツ作成の専門家です..."
  },
  {
    role: "user",
    content: "[置換済みプロンプト]"
  }
];

const completion = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: messages,
  temperature: 0.7,
  max_tokens: 4096,
});

const result = completion.choices[0]?.message?.content || "";
```

#### ステップ5: データベース保存

**保存処理**:
```typescript
const saved = await db.generatedContent.create({
  data: {
    userId: input.userId,
    strategyId: input.strategyId || 0,
    contentType: "instagram_lp",
    title: input.campaignTitle,
    content: result,  // 生成されたコンテンツ
    metadata: JSON.stringify({
      designApproach: approach,
    }),
    aiAgent: "chatgpt",
    status: "draft",
  },
});
```

#### ステップ6: フロントエンド表示

**プレビュー表示**:
- Instagram LP: `InstagramLPPreview`コンポーネントで視覚的に表示
- HP記事: HTML形式で表示
- キャンペーンコピー: テキスト形式で表示

**履歴更新**:
```typescript
void utils.content.list.invalidate({ userId: USER_ID_PLACEHOLDER });
```

---

## 使用方法

### 1. Instagram LP生成

1. **コンテンツタイプを選択**: "Instagram用LP案"
2. **キャンペーン情報を入力**:
   - キャンペーン名（必須）
   - キャンペーン説明（必須）
   - ターゲット層（オプション）
   - プロモーション内容（オプション）
3. **デザインオプションを設定**:
   - デザインアプローチ: トレンディ / ミニマル / 大胆 / エレガント
   - 生成件数: 1-5件
4. **「コンテンツを生成」ボタンをクリック**
5. **プレビューで確認**:
   - Instagram風UIで表示
   - 画像としてダウンロード可能
6. **履歴から確認**: 生成履歴セクションで過去のLP案を確認

### 2. HP記事生成

1. **コンテンツタイプを選択**: "HP記事"
2. **キャンペーン情報を入力**:
   - キャンペーン名（必須）
   - キャンペーン説明（必須）
   - ターゲット層（オプション）
3. **SEOキーワードを追加**（オプション）:
   - キーワードを入力して「追加」ボタンをクリック
   - 複数のキーワードを追加可能
4. **「コンテンツを生成」ボタンをクリック**
5. **プレビューで確認**: HTML形式で表示
6. **履歴から確認**: 生成履歴セクションで過去の記事を確認

### 3. キャンペーンコピー生成

1. **コンテンツタイプを選択**: "キャンペーンコピー"
2. **キャンペーン情報を入力**:
   - キャンペーン名（必須）
   - キャンペーン説明（必須）
   - ターゲット層（オプション）
   - プロモーション内容（オプション）
3. **トーンを選択**:
   - 親しみやすい / プロフェッショナル / トレンディ
4. **「コンテンツを生成」ボタンをクリック**
5. **プレビューで確認**: テキスト形式で表示
6. **履歴から確認**: 生成履歴セクションで過去のコピーを確認

---

## プロンプト詳細

### 1. 実際に使用されるプロンプトの構造

#### 1.1 Instagram LP生成プロンプト（完全版）

```
【重要】Webリサーチの実施について
現在の日付は2025年1月です。このタスクを実行する前に、必ず最新の情報を取得するためにWebリサーチを行ってください。

- 現在の日付は2025年1月です。必ず2025年1月時点の最新情報を取得してください
- 2024年以前の古い情報は使用しないでください。必ず2025年1月時点の最新情報を使用してください
- 最新のトレンド、ニュース、統計データをWeb検索で取得してください
- 信頼性の高い情報源（公式サイト、ニュースサイト、業界レポートなど）を優先してください
- 検索結果を基に、最新かつ正確な情報を提供してください
- 情報の出典や日付を可能な限り明記してください
- 古い情報や不確実な情報は使用しないでください
- 特にトレンド分析や価格調査の場合は、必ず最新の市場データを検索してください
- 調査結果には必ず「2025年1月時点の調査結果」と明記してください

上記のWebリサーチを実施した上で、以下の指示に従って回答してください。

以下のキャンペーン情報を基に、トレンディで現代的なデザインのInstagram用LP案を作成してください。

【キャンペーン情報】
タイトル: [実際のキャンペーン名]
説明: [実際のキャンペーン説明]
ターゲット層: [実際のターゲット層]
プロモーション内容: [実際のプロモーション内容]

【重要】以下のWeb検索結果を基に、最新のトレンドを取り入れたLP案を作成してください。
現在の日付は2025年1月です。2025年1月時点の最新情報を優先的に使用してください。

【Web検索結果】

1. [検索結果1のタイトル]
   URL: https://...
   日付: 2025-01-XX
   概要: ...

2. [検索結果2のタイトル]
   URL: https://...
   ...

【作成指示】
以下の情報を含めて、上記のWeb検索結果を参考に、わかりやすく読みやすい形式で提案してください：

- LPのタイトル
- メインヘッドライン
- 説明文（3-4文程度）
- 主要ポイント（3つ程度）
- メリット（2つ程度）
- 行動喚起文（例：「今すぐ予約する」）
- 推奨ハッシュタグ（3つ程度）
- デザイン要素の詳細な指示
- 推奨カラースキーム
- トーン（例：親しみやすい、高級感のある）

【重要】
- Web検索結果に含まれる最新のトレンド情報を活用してください
- 2024年以前の古い情報は使用しないでください
- 情報の出典（URL）を可能な限り明記してください
```

#### 1.2 HP記事生成プロンプト（完全版）

```
【重要】Webリサーチの実施について
[上記と同じWeb検索指示]

以下のキャンペーン情報を基に、SEO最適化されたHP記事を作成してください。

【キャンペーン情報】
タイトル: [実際のキャンペーン名]
説明: [実際のキャンペーン説明]
ターゲット層: [実際のターゲット層]

【SEOキーワード】
美容, 美容皮膚科, ダーマペン, [その他のキーワード]

【重要】以下のWeb検索結果を基に、最新の情報を含めたSEO最適化記事を作成してください。
現在の日付は2025年1月です。2025年1月時点の最新情報を優先的に使用してください。

【Web検索結果】
[Web検索結果がここに挿入]

【作成指示】
以下の要件を満たしてください：
- 見出しタグ（h1, h2, h3）を適切に使用
- SEOキーワードを自然に含める
- 読みやすく、情報価値の高い内容
- 800-1200文字程度
- 構造化されたHTML形式
- Web検索結果に含まれる最新の情報を活用してください
- 2024年以前の古い情報は使用しないでください

記事タイトル、メタディスクリプション（150文字以内）、主要キーワード、記事本文（HTML形式）、記事の要約（2-3文）を含めてください。
```

#### 1.3 キャンペーンコピー生成プロンプト（完全版）

```
【重要】Webリサーチの実施について
[上記と同じWeb検索指示]

以下のキャンペーン情報を基に、親しみやすく親近感のあるトーンのキャンペーンコピーを作成してください。

【キャンペーン情報】
タイトル: [実際のキャンペーン名]
説明: [実際のキャンペーン説明]
ターゲット層: [実際のターゲット層]
プロモーション内容: [実際のプロモーション内容]

【重要】以下のWeb検索結果を基に、最新のトレンドを取り入れたキャンペーンコピーを作成してください。
現在の日付は2025年1月です。2025年1月時点の最新情報を優先的に使用してください。

【Web検索結果】
[Web検索結果がここに挿入]

【作成指示】
以下の情報を含めて、上記のWeb検索結果を参考に、わかりやすく読みやすい形式で提案してください：

- メインキャッチコピー
- サブキャッチコピー
- 本文（3-4段落）
- 行動喚起文
- キャッチフレーズ
- 主要メッセージ（3つ程度）

【重要】
- Web検索結果に含まれる最新のトレンド情報を活用してください
- 2024年以前の古い情報は使用しないでください
- 情報の出典（URL）を可能な限り明記してください
```

---

## 技術的な詳細

### 1. 使用技術

- **フロントエンド**: React, Next.js, Atlassian Design System
- **バックエンド**: tRPC, Prisma
- **AI API**: OpenAI ChatGPT API (gpt-4o)
- **Web検索**: SerpAPI / Google Custom Search API
- **画像処理**: html2canvas

### 2. エラーハンドリング

**フロントエンド**:
- フォームバリデーション
- tRPCエラーのキャッチと表示
- ユーザーフレンドリーなエラーメッセージ

**バックエンド**:
- Zodスキーマによる入力検証
- ChatGPT APIエラーの詳細ログ
- Web検索失敗時のフォールバック
- TRPCErrorによる適切なエラー返却

### 3. パフォーマンス

- **キャッシュ**: React Queryによる自動キャッシュ
- **無効化**: 生成後の自動履歴更新
- **非同期処理**: async/awaitによる非ブロッキング処理

### 4. セキュリティ

- **入力検証**: Zodスキーマによる厳密な検証
- **SQLインジェクション対策**: Prismaによる型安全なクエリ
- **APIキー管理**: 環境変数による安全な管理

---

## まとめ

コンテンツ生成機能は、ChatGPT APIを使用して3種類のマーケティングコンテンツを自動生成します。Web検索統合により最新のトレンド情報を反映し、プロンプト管理により柔軟なカスタマイズが可能です。視覚的なプレビューと履歴管理により、実用的なマーケティングツールとして機能します。

### 主な特徴の再確認

1. ✅ **Web検索統合**: 最新トレンドを自動取得
2. ✅ **プロンプト管理**: データベースまたはデフォルトプロンプト
3. ✅ **視覚的プレビュー**: Instagram LPをInstagram風UIで表示
4. ✅ **画像エクスポート**: html2canvasで画像化
5. ✅ **履歴管理**: データベースに保存して確認可能
6. ✅ **エラーハンドリング**: 堅牢なエラー処理
7. ✅ **型安全性**: TypeScript + Zodによる完全な型安全性

---

## 参考リンク

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [tRPC Documentation](https://trpc.io/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Atlassian Design System](https://atlassian.design/)
- [html2canvas Documentation](https://html2canvas.hertzen.com/)

