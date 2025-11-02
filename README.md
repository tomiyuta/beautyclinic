# 美容クリニックAI協調プラットフォーム

美容クリニック向けの包括的なAI協調システム。リサーチから経営戦略立案、LP作成まで一貫して行う統合プラットフォームです。

## 技術スタック

- **フロントエンド**: Next.js 13.5.6 (App Router), React 18.2.0, TypeScript, Tailwind CSS 3.4.17
- **バックエンド**: tRPC 11.7.1, Prisma ORM 6.18.0
- **データベース**: MySQL 9.5
- **状態管理**: TanStack Query 5.90.6 (React Query)
- **AI統合**: 
  - Google Gemini API (市場調査・SNS調査)
  - xAI Grok API (Twitter/X調査)
  - Anthropic Claude API (戦略分析)
  - OpenAI ChatGPT API (コンテンツ生成)
- **エクスポート**: jsPDF 3.0.3, ExcelJS 4.4.0
- **その他**: Zod (データ検証), SuperJSON (データシリアライゼーション), Axios (HTTP通信)

## セットアップ手順

### 1. 前提条件

- Node.js 20以上
- MySQL 9.5以上
- npm または yarn

### 2. 依存関係のインストール

```bash
npm install
```

### 3. データベースのセットアップ

#### MySQLのインストール（macOSの場合）

```bash
brew install mysql
brew services start mysql
```

#### データベースとユーザーの作成

```bash
mysql -u root -p
```

MySQL内で以下を実行：

```sql
CREATE DATABASE ai_clinic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ai_user'@'localhost' IDENTIFIED BY 'TempPass123!';
GRANT ALL PRIVILEGES ON ai_clinic.* TO 'ai_user'@'localhost';
GRANT CREATE, DROP ON *.* TO 'ai_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. 環境変数の設定

`.env`ファイルに以下の内容を設定：

```env
DATABASE_URL="mysql://ai_user:TempPass123!@localhost:3306/ai_clinic"
GEMINI_API_KEY="your-gemini-api-key-here"
GEMINI_MODEL="gemini-1.5-flash-latest"  # オプション: 使用するGeminiモデルを指定（未指定時は自動選択）
GROK_API_KEY="your-grok-api-key-here"
CLAUDE_API_KEY="your-claude-api-key-here"
OPENAI_API_KEY="your-openai-api-key-here"
```

**API キーの取得方法**:

- **Gemini API キー**:
  1. [Google AI Studio](https://makersuite.google.com/app/apikey) にアクセス
  2. 「Create API Key」をクリックしてAPIキーを生成
  3. 生成されたキーを `GEMINI_API_KEY` に設定
  4. （オプション）`GEMINI_MODEL` 環境変数で使用するモデルを指定可能。未指定の場合は自動的に利用可能なモデルを選択します。
     - 利用可能なモデル例: `gemini-1.5-flash-latest`, `gemini-1.5-flash`, `gemini-1.5-pro-latest`, `gemini-1.5-pro`, `gemini-pro`

- **Grok API キー**:
  1. [xAI Platform](https://console.x.ai/) にアクセス
  2. アカウントを作成またはログイン
  3. API KeysセクションでAPIキーを生成
  4. 生成されたキーを `GROK_API_KEY` に設定
  5. （オプション）`GROK_MODEL` 環境変数で使用するモデルを指定可能。デフォルトは `grok-3` です（`grok-beta`は2025-09-15に廃止されました）。

- **Claude API キー**:
  1. [Anthropic Console](https://console.anthropic.com/) にアクセス
  2. アカウントを作成またはログイン
  3. API KeysセクションでAPIキーを生成
  4. 生成されたキーを `CLAUDE_API_KEY` に設定
  5. （オプション）`CLAUDE_MODEL` 環境変数で使用するモデルを指定可能。デフォルトは `claude-3-5-sonnet` です。
     - 利用可能なモデル例: `claude-3-5-sonnet`, `claude-3-5-sonnet-20240620`, `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`, `claude-3-haiku-20240307`
     - 注意: モデル名の利用可否はAPIキーの権限やプランによって異なります

- **OpenAI API キー** (ChatGPT用):
  1. [OpenAI Platform](https://platform.openai.com/) にアクセス
  2. アカウントを作成またはログイン
  3. API KeysセクションでAPIキーを生成
  4. 生成されたキーを `OPENAI_API_KEY` に設定

**注意**: 本番環境では、より強固なパスワードを使用し、APIキーは安全に管理してください。

### 5. データベースマイグレーション

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 6. 開発サーバーの起動

#### 方法1: ワンクリック起動（推奨）

**macOS / Linux:**
```bash
./start.sh
# または
npm run startup
```

**Windows:**
```cmd
start.bat
```

このスクリプトは以下を自動的に実行します：
- MySQLの起動確認（macOS/Linux）
- `.env`ファイルの作成（存在しない場合）
- 依存関係のインストール
- Prismaクライアントの生成
- データベース接続確認
- 開発サーバーの起動

詳細は `QUICK_START.md` を参照してください。

#### 方法2: 手動起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスしてください。

## プロジェクト構成

```
ai-clinic-platform/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/trpc/     # tRPC APIエンドポイント
│   │   ├── layout.tsx    # ルートレイアウト
│   │   └── page.tsx      # ホームページ
│   ├── features/         # 機能別コンポーネント
│   │   └── products/     # 商品管理機能
│   ├── server/           # サーバーサイドロジック
│   │   ├── api/          # tRPCルーター
│   │   │   └── routers/  # APIルーター定義
│   │   └── db.ts         # Prismaクライアント
│   ├── trpc/             # tRPCクライアント設定
│   └── generated/         # Prisma生成ファイル
├── prisma/
│   └── schema.prisma     # データベーススキーマ
└── public/               # 静的ファイル
```

## 主要機能

### 実装済み機能一覧

#### 1. 商品管理機能 (`Requirement 1`)

**概要**: クリニック商品の基本情報を管理する機能

**実装詳細**:
- **商品登録フォーム**: 
  - 商品名、カテゴリ、原価、販売価格、説明文の入力
  - リアルタイムバリデーション（Zodスキーマ使用）
  - 販売価格が原価以上であることを自動検証
- **商品一覧表示**: 
  - 登録済み商品の一覧をテーブル形式で表示
  - 作成日時、更新日時も表示
- **商品削除機能**: 
  - 個別削除機能
  - 削除確認メッセージ表示
- **エラーハンドリング**: 
  - 入力エラー時の詳細メッセージ表示
  - 成功時の確認メッセージ表示

**技術実装**:
- フロントエンド: `src/features/products/product-management.tsx`
- バックエンド: `src/server/api/routers/product.ts`
- データモデル: `ClinicProduct` (Prisma)

---

#### 2. 市場調査機能 (`Requirement 2`)

**概要**: AIを活用した包括的な市場調査機能

**実装詳細**:
- **トレンド分析** (Gemini API):
  - 日本で流行している美容施術の情報収集
  - トレンドキーワード、人気施術、市場規模などの分析
  - JSON形式で構造化された結果を返却
- **価格調査** (Gemini API):
  - 対象都市: 東京、名古屋、大阪、福岡
  - 指定施術の市場価格帯の調査
  - 複数都市の価格比較データ取得
- **競合調査** (Gemini API):
  - 近隣競合クリニックの商品一覧と価格の収集
  - 競合の特徴、強み・弱みの分析
- **データ保存**:
  - 調査結果を`MarketResearchResult`テーブルに保存
  - 生データ(`rawData`)と処理済みデータ(`processedData`)を分けて保存
  - 調査履歴の一覧表示と詳細表示機能

**技術実装**:
- AIサービス: `src/server/services/gemini.ts`
  - 自動モデル選択機能（複数候補から利用可能なモデルを自動選択）
  - JSON抽出・修正機能（Markdownコードブロック除去、不正JSON修正）
- API: `src/server/api/routers/market-research.ts`
- フロントエンド: `src/features/market-research/market-research.tsx`

**特別な機能**:
- **Geminiモデル自動選択**: 環境変数`GEMINI_MODEL`で指定可能、未指定時は自動で利用可能なモデルを選択
- **JSON自動修正**: APIレスポンスの不正なJSON（末尾カンマ、エスケープ文字、Markdownコードブロック）を自動修正

---

#### 3. SNS調査機能 (`Requirement 3`)

**概要**: Twitter/X、Instagram、YouTubeのトレンド分析機能

**実装詳細**:
- **Twitter/X調査** (Grok API):
  - ハッシュタグ分析（使用回数、トレンド傾向）
  - 影響力のあるアカウントやインフルエンサー分析
  - 人気コンテンツの特徴分析
  - エンゲージメント傾向（いいね、リツイート、コメント）
- **Instagram調査** (Gemini API):
  - ビジュアルトレンド分析
  - エンゲージメント分析
  - 人気の投稿スタイル分析
- **YouTube調査** (Gemini API):
  - 動画トレンド分析
  - 人気チャンネル分析
  - 動画コンテンツの特徴分析
- **調査期間指定**:
  - 過去1週間、過去1ヶ月、過去3ヶ月から選択可能
- **エラーハンドリング**:
  - 調査エラー時の自動エラーログ記録
  - エラータイプ、スタックトレース、コンテキスト情報を保存
  - 管理者通知機能（実装済み、通知ロジックは拡張可能）

**技術実装**:
- AIサービス: 
  - `src/server/services/grok.ts` (Twitter調査)
  - `src/server/services/gemini.ts` (Instagram/YouTube調査)
- API: `src/server/api/routers/sns-research.ts`
- エラーログ: `src/server/services/error-logger.ts`
- フロントエンド: `src/features/sns-research/sns-research.tsx`
- データモデル: `SNSResearchResult`, `ErrorLog` (Prisma)

**特別な機能**:
- **Grokモデル設定**: 環境変数`GROK_MODEL`で指定可能（デフォルト: `grok-3`）
- **エンドポイント設定**: 環境変数`GROK_API_URL`でカスタムエンドポイント指定可能
- **エラーログ自動記録**: API呼び出し失敗時に自動でエラーログをデータベースに保存

---

#### 4. 戦略分析機能 (`Requirement 4`)

**概要**: AIによる包括的な戦略分析と提案機能

**実装詳細**:
- **総合分析** (Claude API):
  - 市場調査データとSNS調査データの統合分析
  - SWOT分析（強み・弱み・機会・脅威）の自動生成
  - 市場ポジショニングの分析
- **価格設定提案** (Claude API):
  - 自院商品と市場価格データの比較
  - 最適価格の提案（現状価格との差分、理由、優先度付き）
  - リスク要因と機会要因の分析
- **キャンペーン案生成** (Claude API):
  - 月次キャンペーン案を2つ以上自動生成
  - 各案に含まれる情報: タイトル、説明、ターゲット層、実施期間、プロモーション内容、期待される効果
  - SNS戦略とチャンネルも提案
- **新施術導入提案** (Claude API):
  - 未導入の有望施術の提案
  - 市場需要、トレンド状況、想定価格、競争力、投資対効果の分析
  - 導入方法・スケジュールの提案
- **戦略提案履歴**:
  - すべての提案を履歴として保存
  - フィードバック機能（提案に対する評価とコメント記録）
  - 実装ステータス管理（未着手/進行中/完了）

**技術実装**:
- AIサービス: `src/server/services/claude.ts`
  - 自動モデルフォールバック機能（404エラー時に複数モデルを順に試行）
  - モデルキャッシュ機能（成功したモデルを再利用）
- API: `src/server/api/routers/strategy.ts`
- フロントエンド: `src/features/strategy/strategy-analysis.tsx`
- データモデル: `StrategyRecommendation` (Prisma)

**特別な機能**:
- **Claudeモデル自動選択**: 環境変数`CLAUDE_MODEL`で指定可能、未指定時は複数候補から自動選択
- **フォールバック機能**: モデル404エラー時に自動で次のモデルを試行（最大6モデルまで）

---

#### 5. コンテンツ生成機能 (`Requirement 5`)

**概要**: マーケティング用コンテンツの自動生成機能

**実装詳細**:
- **Instagram用LP案生成** (ChatGPT API):
  - 複数案の同時生成（1-5件指定可能）
  - デザインアプローチ: ミニマル、大胆、エレガント、トレンディから選択
  - 各案に含まれる要素: タイトル、ヘッドライン、説明文、キーポイント、特典、コールトゥアクション、ハッシュタグ、デザイン指示、カラースキーム
  - **視覚的プレビュー機能**: Instagram投稿風の見た目で表示
- **HP記事生成** (ChatGPT API):
  - SEO最適化された記事コンテンツ作成
  - SEOキーワードの指定可能（複数指定可）
  - HTML形式で記事本文を生成
- **キャンペーンコピー生成** (ChatGPT API):
  - トーン指定可能: プロフェッショナル、親しみやすい、トレンディ
  - ヘッドライン、本文、コールトゥアクションボタンの生成
- **プレビュー機能**:
  - 生成直後にプレビュー表示
  - Instagram LPは視覚的な投稿風プレビュー（ヘッダー、コンテンツ、フッター付き）
  - その他はJSON形式で表示
- **コンテンツ履歴管理**:
  - 生成履歴の一覧表示
  - ステータス管理: 下書き、承認済み、公開済み
  - タイトル、作成日時、ステータスの表示

**技術実装**:
- AIサービス: `src/server/services/chatgpt.ts`
- API: `src/server/api/routers/content.ts`
- フロントエンド: `src/features/content/content-generation.tsx`
  - `InstagramLPPreview`コンポーネント（視覚的プレビュー）
- データモデル: `GeneratedContent` (Prisma)

**特別な機能**:
- **視覚的プレビュー**: Instagram LPはInstagram投稿風のUIで表示（プロフィール画像、コンテンツ、ハッシュタグ、いいねボタンなど）

---

#### 6. ワークフロー管理機能 (`Requirement 6`)

**概要**: 複数のAIエージェントを統合的に利用するワークフロー実行機能

**実装詳細**:
- **AIエージェントヘルスチェック**:
  - システム起動時に全AI APIの接続状態を自動確認
  - 各エージェントの状態を表示（正常/異常/未設定）
  - ヘルスチェック結果の履歴表示
- **統合分析ワークフロー**:
  - 市場調査 → SNS調査 → 総合分析 の順で自動実行
  - 各ステップの依存関係を自動管理
  - 中間結果を自動保存
- **タスク割り振り**:
  - 適切なAIエージェントへの自動割り当て
  - タスクタイプに応じた最適エージェント選択
  - エージェント利用不可時の代替手段提示
- **エラーハンドリング**:
  - ステップ失敗時の詳細エラー情報記録
  - 代替エージェントへの自動切り替え
  - 処理停止機能
- **ワークフロー実行履歴**:
  - 実行履歴の一覧表示
  - 各ステップの実行状態表示
  - エラー発生時の詳細情報表示

**技術実装**:
- ワークフロー管理: `src/server/services/workflow-orchestrator.ts`
- AIヘルスチェック: `src/server/services/ai-health-check.ts`
- サーバー起動時チェック: `src/instrumentation.ts`
- API: `src/server/api/routers/workflow.ts`
- フロントエンド: `src/features/workflow/workflow-management.tsx`
- データモデル: `WorkflowExecution` (Prisma)

**特別な機能**:
- **サーバー起動時自動チェック**: Next.jsの`instrumentation.ts`を使用して起動時に自動実行

---

#### 7. 戦略管理機能 (`Requirement 7`)

**概要**: 戦略提案の管理、フィードバック、エクスポート機能

**実装詳細**:
- **戦略提案履歴管理**:
  - すべての戦略提案を履歴として保存・表示
  - 提案日時、関連する市場調査/SNS調査データの表示
  - 提案内容の詳細表示（価格提案、キャンペーン案、新施術提案、マーケティング戦略）
- **フィードバック機能**:
  - 提案に対する評価とコメントの記録
  - `userFeedback`フィールドに保存（学習データとして活用可能）
- **実装ステータス管理**:
  - 未着手、進行中、完了のステータス管理
  - ステータス更新機能
- **エクスポート機能**:
  - PDF形式での戦略書出力（jsPDF使用）
  - Excel形式での戦略書出力（ExcelJS使用）
  - 戦略提案の全内容を構造化して出力
- **関連データ表示**:
  - 提案に関連する生成コンテンツの自動取得
  - 関連コンテンツ数の要約表示
  - 提案と成果データの関連付け表示

**技術実装**:
- API: `src/server/api/routers/strategy-management.ts`
- エクスポートサービス: `src/server/services/export-service.ts`
- フロントエンド: `src/features/strategy/strategy-management.tsx`
- データモデル: `StrategyRecommendation` (Prisma)

**特別な機能**:
- **PDF/Excel出力**: 戦略提案の全内容を構造化されたドキュメントとして出力可能

---

#### 8. APIキー管理機能

**概要**: ブラウザからAPIキーを設定・管理する機能

**実装詳細**:
- **APIキー設定**:
  - ブラウザから直接APIキーを入力・設定可能
  - 対象API: Gemini, Grok, Claude, OpenAI (ChatGPT)
  - 設定されたキーは`.env`ファイルに自動保存
- **APIキー状態表示**:
  - 各APIキーの設定状態を表示（設定済み/未設定）
  - セキュリティのため、キー値自体は表示しない

**技術実装**:
- API: `src/server/api/routers/api-key.ts`
- フロントエンド: `src/features/api-key/api-key-management.tsx`
- ページ: `src/app/api-key/page.tsx`

**注意事項**:
- APIキー設定後はサーバーの再起動が必要
- `.env`ファイルに直接書き込まれるため、権限管理に注意

---

#### 9. エラーログ機能

**概要**: システムエラーの記録と管理機能

**実装詳細**:
- **エラーログ記録**:
  - エラータイプ、エラーメッセージ、スタックトレースの記録
  - エラー発生時のコンテキスト情報（ユーザーID、モジュール、AIエージェントなど）の記録
  - データベースに自動保存
- **管理者通知**:
  - 重要なエラー（API_ERRORなど）発生時の自動通知機能
  - 通知済みフラグと通知日時の記録
- **エラー解決管理**:
  - エラーの解決フラグと解決日時の記録
  - エラー履歴の一覧表示

**技術実装**:
- エラーロガー: `src/server/services/error-logger.ts`
- データモデル: `ErrorLog` (Prisma)

---

#### 10. UI/UX改善機能

**概要**: ユーザビリティ向上のためのUI改善

**実装詳細**:
- **入力フィールドの視認性向上**:
  - 入力文字を黒色で表示（デフォルトの薄いグレーから変更）
  - プレースホルダーは適切なグレーで表示
- **結果表示の視認性向上**:
  - JSON結果表示部分の文字色を黒に設定
  - 背景色とのコントラストを確保
- **Instagram LP視覚的プレビュー**:
  - JSON形式ではなく、Instagram投稿風の見た目で表示
  - プロフィールヘッダー、コンテンツ、ハッシュタグ、フッターを含む完全なプレビュー

**技術実装**:
- グローバルCSS: `src/app/globals.css`
- コンポーネント: 各機能コンポーネントに`text-zinc-900`クラス追加

---

#### 11. エラーハンドリング・堅牢性機能

**概要**: システムの安定性向上のための機能

**実装詳細**:
- **AIモデル自動選択**:
  - Gemini: 複数候補から自動選択、環境変数で上書き可能
  - Claude: 404エラー時に複数モデルを順に試行、自動フォールバック
  - Grok: 環境変数でモデル名とエンドポイントを指定可能
- **JSON修正機能**:
  - Gemini APIレスポンスのMarkdownコードブロックを自動除去
  - 不正なJSON（末尾カンマ、エスケープ文字、不完全な構造）を自動修正
  - 複数回の修正パスで確実にパース可能なJSONに変換
- **エラーレトライ機能**:
  - JSONパース失敗時の自動リトライ（最大3回）
  - 不足している閉じ括弧の自動補完
- **tRPCエラーハンドリング**:
  - サーバー側エラーログの自動記録
  - クライアント側でのHTMLレスポンス検出とエラー表示
- **エラー境界**:
  - Next.js App Router用のエラー境界コンポーネント
  - `error.tsx`, `not-found.tsx`, `global-error.tsx`を実装

**技術実装**:
- JSON修正: `src/server/services/gemini.ts`の`extractJSONFromResponse`関数
- モデル選択: 各AIサービスのモデル選択ロジック
- エラーハンドリング: 各APIルーターとtRPC設定

## 開発コマンド

```bash
# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# プロダクション起動
npm start

# Lint
npm run lint

# Prismaクライアントの生成
npx prisma generate

# データベースマイグレーション
npx prisma migrate dev

# Prisma Studio（データベースGUI）
npx prisma studio
```

## データベーススキーマ

主要なテーブル：

- **`clinicProducts`**: クリニック商品情報
  - 商品名、カテゴリ、原価、販売価格、説明、有効/無効フラグ
  
- **`marketResearchResults`**: 市場調査結果
  - ユーザーID、場所、調査タイプ（トレンド分析/価格調査/競合調査）、AIエージェント、生データ、処理済みデータ
  
- **`snsResearchResults`**: SNS調査結果
  - ユーザーID、プラットフォーム（Twitter/Instagram/YouTube）、キーワード、AIエージェント、トレンドデータ
  
- **`strategyRecommendations`**: 戦略提案
  - ユーザーID、市場ポジション分析、価格提案、キャンペーン案、新施術提案、マーケティング戦略、フィードバック、実装ステータス
  
- **`generatedContents`**: 生成コンテンツ
  - ユーザーID、戦略ID、コンテンツタイプ、タイトル、コンテンツ、メタデータ、ステータス、AIエージェント
  
- **`workflowExecutions`**: ワークフロー実行履歴
  - ユーザーID、ワークフロータイプ、ステータス、実行結果、エラーメッセージ
  
- **`errorLogs`**: エラーログ
  - ユーザーID、モジュール、エラータイプ、エラーメッセージ、スタックトレース、コンテキスト、AIエージェント、通知状態、解決状態

詳細は `prisma/schema.prisma` を参照してください。

## 環境変数一覧

### 必須環境変数
- `DATABASE_URL`: MySQLデータベース接続URL
- `GEMINI_API_KEY`: Google Gemini APIキー
- `GROK_API_KEY`: xAI Grok APIキー
- `CLAUDE_API_KEY`: Anthropic Claude APIキー
- `OPENAI_API_KEY`: OpenAI APIキー

### オプション環境変数
- `GEMINI_MODEL`: 使用するGeminiモデル名（未指定時は自動選択）
- `GROK_API_URL`: Grok APIエンドポイント（デフォルト: `https://api.x.ai/v1/chat/completions`）
- `GROK_MODEL`: 使用するGrokモデル名（デフォルト: `grok-3`）
- `CLAUDE_MODEL`: 使用するClaudeモデル名（未指定時は自動選択）

## 注意事項

- **ユーザー認証**: 現在、ユーザー認証は実装されていません。`userId`は固定値（1）を使用しています。本番環境では適切な認証システムの実装が必要です。
- **APIキー管理**: APIキーはブラウザから設定可能ですが、本番環境では環境変数ファイルの適切な権限管理が必要です。
- **セキュリティ**: `.env`ファイルはGitにコミットしないでください。`.gitignore`に追加することを推奨します。
- **モデル選択**: AIモデルの利用可否はAPIキーの権限やプランによって異なります。環境変数でモデルを指定するか、自動フォールバック機能に任せることができます。
- **エラーハンドリング**: エラー発生時は自動でエラーログに記録されます。定期的にエラーログを確認することを推奨します。

## トラブルシューティング

### よくあるエラーと解決方法

1. **Gemini API 404エラー**
   - 解決方法: `GEMINI_MODEL`環境変数を未指定にするか、利用可能なモデル名に変更
   - 自動フォールバック機能が利用可能なモデルを選択します

2. **Claude API 404エラー**
   - 解決方法: `CLAUDE_MODEL`環境変数を未指定にするか、利用可能なモデル名に変更
   - 自動フォールバック機能が複数モデルを順に試行します

3. **Grok API 404エラー**
   - 解決方法: `GROK_MODEL`環境変数を`grok-3`に設定（`grok-beta`は廃止済み）
   - エンドポイントも`GROK_API_URL`で確認

4. **JSON解析エラー**
   - 解決方法: 自動修正機能が実装済みですが、それでもエラーが出る場合はサーバーログを確認
   - Gemini APIのレスポンスが不正な場合、自動で修正を試みます

5. **ポート競合エラー**
   - 解決方法: `pkill -9 -f "next dev"`で既存プロセスを停止
   - または別のポートで起動（Next.jsが自動で次の空きポートを探します）

6. **「missing required error components」エラー**
   - 解決方法: `.next`ディレクトリを削除して再起動
   - `error.tsx`, `not-found.tsx`, `global-error.tsx`が正しく配置されているか確認

## 実装の完全性

### MECE検証結果

本システムは、要件定義書に記載されたすべての要件をMECE（Mutually Exclusive, Collectively Exhaustive）に実装しています。

- **Mutually Exclusive (相互排他性)**: 各要件は明確に分離されており、機能の重複なし
- **Collectively Exhaustive (網羅性)**: 要件定義書の全7要件と、計28個のAcceptance Criteriaがすべて実装済み
- **実装の完全性**: 機能、API、UI、データベーススキーマすべてが実装済み

詳細なチェックリストは `REQUIREMENTS_CHECKLIST.md` を参照してください。

## 変更履歴

### 主要な実装と改善

1. **AIモデル自動選択機能**: Gemini、Claudeモデルの404エラーに対応する自動フォールバック機能を実装
2. **JSON修正機能**: Gemini APIレスポンスの不正JSONを自動修正する高度な機能を実装
3. **視覚的プレビュー**: Instagram LPを実際の投稿風に表示する機能を追加
4. **APIキー管理UI**: ブラウザからAPIキーを設定できるUIを実装
5. **エラーログ機能**: システムエラーの詳細記録と管理機能を実装
6. **UI改善**: 入力フィールドと結果表示の視認性向上
7. **エラーハンドリング強化**: tRPC、Next.js App Router用の包括的なエラーハンドリング実装

## ライセンス

このプロジェクトはプライベートプロジェクトです。
