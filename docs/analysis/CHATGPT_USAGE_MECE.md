# beauty_project内のChatGPT使用箇所 MECE分析

## 概要
本ドキュメントは、`beauty_project`内でChatGPT/OpenAI APIを使用している箇所を、MECE（Mutually Exclusive, Collectively Exhaustive）の原則に基づいて体系的に整理したものです。

**作成日**: 2025年11月28日  
**対象バージョン**: GPT-5.1（最新確認済み）

---

## A. 設定・認証層（Configuration & Authentication）

### A-1. 環境変数設定
**ファイル**: `.env`, `env.vercel.template`, `app.yaml`

**設定項目**:
- `OPENAI_API_KEY`: OpenAI APIキー（必須）
- `OPENAI_MODEL`: 使用モデル名（オプション、デフォルト: `gpt-5.1`）

**使用箇所**:
```typescript
// src/server/services/chatgpt.ts
const apiKey = process.env.OPENAI_API_KEY;
const envModel = process.env.OPENAI_MODEL;
```

### A-2. APIキー管理
**ファイル**: `src/server/api/routers/api-key.ts`

**機能**:
- APIキーの設定・更新
- `.env`ファイルへの書き込み
- 環境変数の検証

**主要関数**:
- `setApiKey`: APIキーを設定
- `getApiKeys`: 設定済みAPIキーを取得
- `validateApiKeys`: APIキーの有効性を検証

---

## B. コアサービス層（Core Service Layer）

### B-1. ChatGPT API呼び出しコア
**ファイル**: `src/server/services/chatgpt.ts`

**主要関数**:
1. **`callChatGPT(prompt, systemPrompt?, maxTokens?)`**
   - ChatGPT APIの直接呼び出し
   - モデル自動選択機能（GPT-5.1 → GPT-5 → GPT-4o → ...）
   - エラーハンドリング・リトライ機能
   - モデル情報の自動付与

2. **`convertClaudePromptToChatGPT(claudePrompt)`**
   - Claude形式プロンプト（`<SYS>`, `<DEV>`, `<USER>`タグ）をChatGPT形式に変換
   - プロンプト互換性の確保

3. **`getCurrentChatGPTModel()`**
   - 現在使用中のモデル名を取得（デバッグ用）

**モデル候補（優先順位順）**:
```typescript
const MODEL_CANDIDATES = [
  "gpt-5.1",      // 最新（2025年11月リリース・確認済み）
  "gpt-5",        // 最新
  "gpt-4o",       // GPT-4o（2024年5月リリース・安定版）
  "gpt-4o-mini",  // GPT-4o-mini（軽量版）
  "gpt-4-turbo",  // GPT-4 Turbo（旧版）
];
```

### B-2. 画像生成サービス（DALL-E）
**ファイル**: `src/server/services/image-generation.ts`

**主要関数**:
1. **`generateImageWithDalle(options, contentText?)`**
   - DALL-E 3を使用した画像生成
   - プリセット対応（Instagram正方形、LPバナー、カスタム）
   - テーマ別プロンプト生成

2. **`generateImage(options, contentText?)`**
   - 画像生成の統一インターフェース
   - 将来的なプロバイダー切り替えに対応

**使用モデル**: `dall-e-3`

### B-3. 統一AI呼び出しサービス
**ファイル**: `src/server/services/strategy/ai-caller.ts`

**主要関数**:
1. **`callAI(provider, prompt)`**
   - 統一インターフェースでAI呼び出し
   - ChatGPTを含む複数AIプロバイダーに対応

2. **`callAIWithTimeout(provider, prompt, timeoutMs?)`**
   - タイムアウト付きAI呼び出し

3. **`callMultipleAIs(providers, prompt, timeoutMs?)`**
   - 複数AIへの並列問い合わせ

**対応プロバイダー**: `["claude", "chatgpt", "gemini", "grok"]`

---

## C. 機能別実装層（Feature Implementation Layer）

### C-1. コンテンツ生成機能

#### C-1-1. テキストコンテンツ生成
**ファイル**: `src/server/services/chatgpt.ts`

**主要関数**:
1. **`generateInstagramLP(campaign, designApproach)`**
   - Instagram用LP案生成
   - Web検索結果を組み込んだ最新トレンド対応

2. **`generateWebsiteArticle(campaign, seoKeywords)`**
   - SEO最適化されたHP記事生成
   - 見出し構造・メタディスクリプション対応

3. **`generateCampaignCopy(campaign, tone)`**
   - キャンペーンコピー生成
   - トーン指定（professional/friendly/trendy）

4. **`generateInstagramPostText(options)`**
   - Instagram投稿文生成（拡張版）
   - 文字数制限・キーワード指定・CTAタイプ指定

5. **`generateAdCopy(options)`**
   - 検索広告用広告文生成
   - 20-100文字の簡潔な広告文

6. **`generateBlogArticle(options)`**
   - ブログ記事生成
   - SEOキーワード・見出し構造対応

**tRPCルーター**: `src/server/api/routers/content-text.ts`
- `generateInstagramLP`
- `generateWebsiteArticle`
- `generateCampaignCopy`
- `generateText`（統一インターフェース）

#### C-1-2. 画像コンテンツ生成
**ファイル**: `src/server/services/image-generation.ts`

**tRPCルーター**: `src/server/api/routers/content-image.ts`
- `generateImage`: DALL-E 3を使用した画像生成

#### C-1-3. バッチコンテンツ生成
**ファイル**: `src/server/api/routers/content-batch.ts`

**機能**:
- 複数コンテンツの一括生成
- ChatGPTを使用したテキスト生成

### C-2. 戦略分析機能

**ファイル**: `src/server/services/chatgpt.ts`

**主要関数**:
1. **`analyzeMarketPosition(clinicProducts, marketData, snsData, location)`**
   - 市場ポジション分析
   - Web検索結果を組み込んだ最新情報分析

2. **`generatePriceRecommendations(products, marketPricing)`**
   - 価格設定提案
   - 市場価格データを基にした推奨価格生成

3. **`generateCampaignProposals(trends, snsData)`**
   - キャンペーン案生成
   - トレンド・SNSデータを基にした提案

4. **`suggestNewTreatments(currentTreatments, marketTrends, snsTrends)`**
   - 新施術提案
   - 市場トレンド・SNSトレンドを基にした提案

**tRPCルーター**: `src/server/api/routers/strategy.ts`
- `analyzeMarketPosition`
- `generatePriceRecommendations`
- `generateCampaignProposals`
- `suggestNewTreatments`

**AIプロバイダー選択ロジック**:
- ユーザー設定に基づく自動選択
- デフォルト: `chatgpt`

### C-3. AI Context機能（Acontext）

**ファイル**:
- `src/server/services/ai-context/task-extraction.ts`
- `src/server/services/ai-context/skill-search.ts`
- `src/server/services/ai-context/skill-learning.ts`
- `src/server/services/ai-context/ai-session.ts`

**機能**:
- タスク抽出（OpenAI API使用）
- スキル検索（OpenAI API使用）
- スキル学習（OpenAI API使用）
- AIセッション管理（OpenAI API使用）

**使用モデル**: `gpt-4o-mini`（デフォルト）

### C-4. プロンプト管理機能

**ファイル**: `src/server/services/prompt-helper.ts`

**ChatGPT用プロンプトテンプレート**:
- `chatgpt_system_prompt`: システムプロンプト
- `chatgpt_generate_instagram_lp`: Instagram LP生成用
- `chatgpt_generate_website_article`: ウェブサイト記事生成用
- `chatgpt_generate_campaign_copy`: キャンペーンコピー生成用

**tRPCルーター**: `src/server/api/routers/prompt.ts`
- プロンプトの取得・更新・管理

---

## D. UI/UX層（User Interface Layer）

### D-1. コンテンツ生成UI
**ファイル**: `src/features/content/content-generation.tsx`

**機能**:
- ChatGPTモデル情報の表示
- AIエージェント選択UI
- 生成結果の表示

**表示内容**:
```typescript
使用AI: CHATGPT (gpt-5.1)
```

### D-2. 戦略分析UI
**ファイル**: 
- `src/features/strategy/strategy-analysis.tsx`
- `src/app/strategy-analysis/page.tsx`
- `src/app/strategy-analysis-council/page.tsx`

**機能**:
- AIプロバイダー選択（ChatGPTを含む）
- 分析結果の表示

**選択肢**:
```typescript
{ label: "ChatGPT", value: "chatgpt" }
```

### D-3. 型定義
**ファイル**:
- `src/types/strategy.ts`: `AIProvider = "claude" | "chatgpt" | "gemini" | "grok"`
- `src/types/ai-council.ts`: `CouncilModel = "claude" | "chatgpt" | "gemini" | "grok"`
- `src/types/ai-context-settings.ts`: `model: "gpt-4o-mini"`

---

## E. データ管理層（Data Management Layer）

### E-1. 生成コンテンツ保存
**ファイル**: `src/server/api/utils/generated-content.ts`

**保存データ**:
- `aiAgent`: `"chatgpt"`（固定）
- `content`: 生成されたコンテンツ
- `metadata`: 生成時のメタデータ

### E-2. データベーススキーマ
**ファイル**: `prisma/schema.prisma`

**関連モデル**:
- `GeneratedContent`: `aiAgent`フィールドに`"chatgpt"`を保存
- `StrategyRecommendation`: `strategyAIProvider`フィールドに`"chatgpt"`を保存

---

## F. 依存関係・パッケージ管理

### F-1. npmパッケージ
**ファイル**: `package.json`, `package-lock.json`

**依存パッケージ**:
- `openai`: `^6.7.0` → `^6.8.1`（最新）

### F-2. インポート箇所
**主要インポート**:
```typescript
import OpenAI from "openai";
import { callChatGPT } from "@/server/services/chatgpt";
```

---

## G. エラーハンドリング・ログ

### G-1. エラーハンドリング
**ファイル**: `src/server/services/chatgpt.ts`

**エラーケース**:
1. APIキー未設定: `OPENAI_API_KEY is not set`
2. モデル未找到: `404 - Model not found`
3. 空レスポンス: `Empty response from model`
4. API呼び出し失敗: `ChatGPT API error`

### G-2. ログ出力
**ログレベル**:
- `console.log`: 正常系の処理ログ
- `console.warn`: 警告（Web検索失敗等）
- `console.error`: エラーログ

---

## H. 統合・連携機能

### H-1. Web検索連携
**ファイル**: `src/server/services/web-search.ts`

**機能**:
- ChatGPT生成前にWeb検索を実行
- 検索結果をプロンプトに組み込み
- 最新トレンド情報の取得

### H-2. コンプライアンスチェック
**ファイル**: `src/server/utils/advertising-guidelines.ts`

**機能**:
- ChatGPT生成後のテキストをコンプライアンスチェック
- 医療広告ガイドライン準拠確認
- 禁止フレーズ検出

---

## まとめ

### ChatGPT使用箇所の統計

| カテゴリ | ファイル数 | 主要関数数 |
|---------|-----------|-----------|
| コアサービス | 3 | 10+ |
| コンテンツ生成 | 4 | 8 |
| 戦略分析 | 2 | 4 |
| AI Context | 4 | 4+ |
| UI/UX | 5 | - |
| 合計 | 18+ | 26+ |

### 主要な使用パターン

1. **テキスト生成**: コンテンツ生成・戦略分析
2. **画像生成**: DALL-E 3によるマーケティング画像生成
3. **データ分析**: 市場分析・価格提案・キャンペーン提案
4. **タスク処理**: AI Context機能でのタスク抽出・スキル学習

### 推奨事項

1. **モデル更新**: GPT-5.1が最新であることを確認済み
2. **エラーハンドリング**: モデル自動フォールバック機能あり
3. **コスト最適化**: モデル選択ロジックでコスト効率を考慮
4. **コンプライアンス**: 生成後のテキストチェック機能あり

---

**最終更新**: 2025年11月28日  
**確認者**: AI Assistant  
**次回レビュー推奨日**: 2026年2月28日（3ヶ月後）

