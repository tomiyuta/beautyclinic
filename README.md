# クリマケ - 美容クリニック向けAI統合プラットフォーム

複数のAIエージェント（Gemini、Grok、Claude、ChatGPT）を協調させて、美容クリニックの経営戦略立案からコンテンツ生成までを支援する統合プラットフォームです。

## 📋 目次

- [概要](#概要)
- [システムアーキテクチャ](#システムアーキテクチャ)
- [主要機能](#主要機能)
- [技術スタック](#技術スタック)
- [プロジェクト構造](#プロジェクト構造)
- [セットアップ](#セットアップ)
- [使用方法](#使用方法)
- [開発ガイド](#開発ガイド)
- [デプロイ](#デプロイ)
- [トラブルシューティング](#トラブルシューティング)
- [関連ドキュメント](#関連ドキュメント)

---

## 概要

### プロジェクトの目的

美容クリニックの経営を支援するため、複数のAIエージェントを統合し、以下の機能を提供します：

1. **市場調査・SNS調査**: 最新のトレンド情報の収集と分析
2. **戦略分析**: 単一AIまたは複数AI協業（Council合議制）による戦略提案
3. **コンテンツ生成**: テキスト・画像・動画の自動生成
4. **会話コンテキスト管理（Acontext）**: AIとの会話からタスクを抽出し、再利用可能なスキルを学習
5. **戦略管理**: 提案の履歴管理と実装状況の追跡

### システムの特徴

1. **複数AI協業アーキテクチャ**
   - 各AIエージェントが専門分野を担当し、結果を統合して総合的な戦略を提案
   - Gemini: 市場調査・SNS調査（Instagram/YouTube）
   - Grok: SNS調査（X/Twitter）
   - Claude/ChatGPT: 戦略統合・コンテンツ生成

2. **Council合議制システム**
   - 複数のAIモデルが並列で分析し、ピアレビューを経て議長が最終統合
   - より高品質で信頼性の高い戦略提案を実現

3. **Acontext会話コンテキスト管理**
   - AIとの会話からタスクを自動抽出
   - 完了したタスクから再利用可能なスキル（SOP）を学習
   - 知識の蓄積と再利用による業務効率化

4. **構造化データの活用**
   - 各AIの出力を`<CONSENSUS_JSON>`（機械処理用）と`<REPORT_MARKDOWN>`（人間可読）の2部構成で統一
   - 構造化データを優先的に使用し、数値やURLなどの根拠を活用

5. **小規模クリニック最適化**
   - 人的・予算・在庫（予約枠）の制約を考慮した実現可能な戦略提案
   - 「翌週から動かせる計画」を重視

6. **医療広告ガイドライン対応**
   - 誇大・断定・比較優良誤認表現の自動チェック・修正
   - 禁止ワードリストによる自動フィルタリング
   - 注意書きの自動付与

7. **最新情報の統合**
   - Web検索機能（SerpAPI/Google Custom Search）による最新トレンド情報の取得
   - 各AI分析に最新データを反映

---

## システムアーキテクチャ

### 1. 複数AI協業アーキテクチャ

各AIエージェントが専門分野を担当し、結果を統合して総合的な戦略を提案します。

#### AIエージェントの役割分担

| AIエージェント | 担当分野 | 使用モデル | 特徴 |
|---|---|---|---|
| **Gemini** | 市場調査、SNS調査（Instagram、YouTube） | Gemini 2.5 Pro / Flash | 最新情報の収集に優れる |
| **Grok** | SNS調査（X/Twitter） | Grok-4 | リアルタイムトレンド分析 |
| **Claude** | 戦略統合分析、価格設定提案、キャンペーン案生成、新施術導入提案 | Claude Opus 4.1 / Sonnet 4.5 | 深い分析と戦略立案 |
| **ChatGPT** | コンテンツ生成（テキスト、画像） | GPT-5.1 / GPT-4o | クリエイティブなコンテンツ生成 |
| **Pika Labs** | 短尺動画生成 | Pika 2.2 | Instagram Reels, TikTok, YouTube Shorts |
| **Synthesia** | 説明動画生成 | - | 施術説明、事前/アフターケア、FAQ |

### 2. Council合議制システム

複数のAIモデルが並列で分析し、ピアレビューを経て議長が最終統合を行う合議制システムです。

#### Council処理フロー

```
[ユーザーリクエスト]
        ↓
[Stage 1: 並列クエリ]
  各AIモデルが独立して分析
  ├─ Claude
  ├─ ChatGPT
  ├─ Gemini
  └─ Grok
        ↓
[Stage 2: ピアレビュー]（オプション）
  各AIが他の回答を評価・ランキング
        ↓
[議長決定]
  自動選択: ピアレビュー1位
  手動選択: ユーザー指定
        ↓
[Stage 3: 議長統合]
  議長が全回答を統合して最終回答を作成
        ↓
[最終結果]
```

#### Council設定オプション

- **参加モデル**: 2つ以上のAIモデルを選択（Claude, ChatGPT, Gemini, Grok）
- **ピアレビュー**: 有効/無効を選択（議長自動選択時は必須）
- **議長選択モード**:
  - **自動**: ピアレビュー1位のモデルを議長に
  - **手動**: ユーザーが議長を指定
- **タイムアウト**: 30秒〜300秒（デフォルト120秒）

#### 分析タイプ

Councilは以下の4つの分析タイプに対応：

1. **総合分析（comprehensive）**: 市場データとSNSデータを統合した総合的な戦略提案
2. **価格設定提案（pricing）**: 市場価格データに基づく価格調整の提案
3. **キャンペーン案（campaign）**: トレンドに基づくキャンペーン案の生成
4. **新施術導入提案（new-treatment）**: 未導入の有望施術の提案（投資対効果含む）

#### Councilのメリット

- **高品質な回答**: 複数のAIの意見を統合することで、より正確で包括的な回答を生成
- **エラー耐性**: 一部のAIがエラーでも、2つ以上成功すれば継続
- **透明性**: 各AIの回答とピアレビュー結果を確認可能
- **柔軟性**: 分析タイプや参加モデルを自由に選択可能

### 3. Acontext会話コンテキスト管理システム

AIとの会話からタスクを自動抽出し、完了したタスクから再利用可能なスキル（SOP）を学習するシステムです。

#### Acontextの3つの主要機能

##### 1. Store（保存）

- **セッション管理**: 会話セッションの作成・管理
- **メッセージ履歴**: ユーザー/アシスタント/システムメッセージの保存
- **スペース管理**: ワークスペース/プロジェクト単位での整理

##### 2. Observe（監視・抽出）

- **タスク抽出**: 会話から自動的にタスクを抽出（LLM利用）
- **ステータス管理**: pending / running / success / failed
- **進捗追跡**: タスクの進捗メモを複数記録
- **ユーザー嗜好抽出**: ユーザーの好みや制約条件を記録

##### 3. Learn（学習）

- **スキル学習**: 完了したタスクから再利用可能なスキル（SOP）を自動生成
- **スキル検索**: Fast検索（LIKE検索）とAgentic検索（LLM利用）
- **統計情報**: 使用回数、成功率、複雑度の追跡

#### Acontext処理フロー

```
[セッション作成]
        ↓
[会話（メッセージ送信）]
        ↓
[タスク抽出（flush）]
  LLMが会話を分析してタスクを抽出
        ↓
[タスク管理]
  ステータス変更、進捗メモ追加
        ↓
[タスク完了]
        ↓
[スキル学習]（バックグラウンド）
  完了タスクから再利用可能な手順（SOP）を抽出
        ↓
[スキル保存]
  データベースに保存
        ↓
[スキル検索・再利用]
  過去の成功パターンを検索して活用
```

#### Acontextのデータモデル

- **AiSpace**: スペース（プロジェクト/ワークスペース）
- **AiSession**: 会話セッション
- **AiMessage**: セッション内メッセージ
- **AiTask**: 抽出されたタスク
- **AiSkill**: 学習されたスキル（SOP）
- **AiExperienceJob**: バックグラウンドジョブ
- **AiArtifact**: アーティファクト（ファイル管理）
- **AiMetric**: メトリクス集計結果

#### Acontextのバックグラウンド処理

- **Vercel Cron Jobs連携**:
  - `/api/cron/process-experience-jobs`: 未処理ジョブ（タスク抽出・スキル学習）を定期実行（1分ごと）
  - `/api/cron/aggregate-metrics`: 日次メトリクス集計（毎日1時）

---

## 主要機能

### 機能分類（MECE）

#### 1. 基本機能群

##### 1.1 商品管理 (`/`)
- クリニックの施術・商品情報の管理
- 価格設定、説明文の編集
- 商品の追加・削除・更新

##### 1.2 APIキー設定 (`/api-key`)
- Gemini、Grok、Claude、OpenAIのAPIキー設定
- Web検索APIキー設定（SerpAPIまたはGoogle Custom Search API）
- API接続確認機能

##### 1.3 プロンプト管理 (`/prompt`)
- 各AIエージェント用のプロンプトテンプレート管理
- プロンプトの編集・有効/無効切り替え

#### 2. 調査機能群

##### 2.1 市場調査 (`/market-research`)
- **トレンド分析**: 美容施術の市場トレンドを調査
- **価格調査**: 複数都市×複数施術の価格相場を比較
- **競合調査**: 周辺エリアの競合クリニックを分析

##### 2.2 SNS調査 (`/sns-research`)
- **Twitter/X調査**: Grokを使用してX上のトレンドを分析
- **Instagram調査**: Geminiを使用してInstagramのトレンドを分析
- **YouTube調査**: Geminiを使用してYouTubeのトレンドを分析

#### 3. 戦略分析機能群

##### 3.1 戦略分析（単一AI版）(`/strategy-analysis`)
- **総合分析**: 市場データとSNSデータを統合して総合的な戦略を提案
- **価格設定提案**: 市場価格データに基づく価格調整の提案
- **キャンペーン案生成**: トレンドに基づくキャンペーン案の生成
- **新施術導入提案**: 未導入の有望施術の提案（投資対効果含む）
- **AI選択機能**: Claude、ChatGPT、Gemini、Grokから選択可能

##### 3.2 戦略統合（Council合議制）(`/strategy-analysis-council`)
- **分析モード切り替え**: 単一AI / Council合議制を選択
- **Council設定**:
  - 参加モデル選択（2つ以上）
  - ピアレビュー有効/無効
  - 議長選択モード（自動/手動）
- **結果表示**:
  - 最終統合結果
  - ピアレビュー結果（ランキング）
  - 各AIの個別回答

##### 3.3 戦略管理 (`/strategy-management`)
- 戦略提案の履歴管理
- フィードバックの記録
- 実装ステータスの管理
- 戦略書のエクスポート（JSON、テキスト、PDF、Excel形式）

#### 4. コンテンツ生成機能群

##### 4.1 コンテンツ生成 (`/content`)
- **テキストコンテンツ**: Instagram投稿、ブログ記事、LPテキスト
- **画像コンテンツ**: DALL·E 3を使用した画像生成（Instagram正方形、LPバナー）
- **動画コンテンツ**: 
  - 短尺動画（Pika Labs）: Instagram Reels, TikTok, YouTube Shorts
  - 説明動画（Synthesia）: 施術説明、事前/アフターケア、FAQ
- **コンプライアンスチェック**: リアルタイムで医療広告ガイドライン違反をチェック
- **テンプレート機能**: よく使う設定をテンプレートとして保存・再利用
- **バッチ生成**: CSVファイルから複数のキャンペーンを一括生成

#### 5. Acontext機能群

##### 5.1 Acontextダッシュボード (`/ai-context`)
- **セッション管理**: 会話セッションの作成・一覧表示・選択
- **メッセージ送信**: ユーザー/アシスタント/システムメッセージの送信
- **メッセージ履歴**: セッションごとの会話履歴を時系列で表示
- **タスク抽出**: 会話から自動的にタスクを抽出（LLM利用）
- **タスク一覧**: 抽出されたタスクの表示（ステータス、進捗、ユーザー嗜好）
- **タスク編集**: タスクカードをクリックして編集モーダルを開く
  - ステータス変更（pending / running / success / failed）
  - 進捗メモの追加・削除
  - ユーザー嗜好の追加・削除

##### 5.2 スペース管理 (`/ai-context/spaces`)
- **スペース作成**: ワークスペース/プロジェクト単位でのセッション・スキル管理
- **スペース一覧**: 全スペースの一覧表示（セッション数・スキル数のカウント付き）
- **スペース詳細**: スペースに紐づくセッション・スキルの表示
- **スペース削除**: スペースと関連データの削除

##### 5.3 スキル管理 (`/ai-context/skills`)
- **スキル一覧**: 学習済みスキル（SOP）の一覧表示
- **スキル検索**: 
  - Fast検索: LIKE検索による高速検索
  - Agentic検索: LLMを利用した関連キーワード抽出＋検索
- **フィルター**: 複雑度（simple/medium/complex）、ソート（使用回数/成功率/作成日）
- **スキル詳細**: 
  - 手順（SOP）の詳細表示
  - 統計情報（使用回数、成功率、ステップ数）
  - タグ表示
  - メタ情報（スペース、作成日、更新日）

##### 5.4 メトリクスダッシュボード (`/ai-context/metrics`)
- **サマリーカード**: 
  - 今日のセッション数
  - 今日のタスク数（成功/失敗の内訳）
  - 総セッション数
  - 学習済みスキル数（タスク成功率付き）
- **グラフ表示**: 
  - セッション数の推移（棒グラフ）
  - タスク数の推移（棒グラフ）
  - 学習スキル数の推移（棒グラフ）
  - タスク成功率の推移（棒グラフ）
- **フィルター**: 
  - スペースフィルター（全スペース/特定スペース）
  - 期間フィルター（過去7日/30日/90日）

##### 5.5 Acontext設定 (`/ai-context/settings`)
- **タスク抽出設定**: 
  - モデル選択（gpt-4o-mini / gpt-4o / gpt-4-turbo / gpt-3.5-turbo）
  - タイムアウト設定（ミリ秒）
- **スキル学習設定**: 
  - 自動スキル学習の有効/無効
  - モデル選択
  - タイムアウト設定
- **Flush設定**: 
  - デフォルトタイムアウト
  - デフォルトジョブタイプ（タスク抽出のみ / フル処理）
- **ストレージ設定**: 
  - ストレージタイプ（Database / S3）
  - DBしきい値（この値を超えるファイルはS3に保存）
- **環境変数リファレンス**: 設定内容を環境変数形式で表示

#### 6. その他機能群

##### 6.1 ワークフロー管理 (`/workflow`)
- AIエージェント間の協調動作管理
- 統合分析ワークフローの実行
- AIエージェントのヘルスチェック

---

## 技術スタック

### フロントエンド
- **Next.js 13.5.6**: App Routerを使用したReactフレームワーク
- **React 18.2.0**: UIライブラリ
- **TypeScript 5**: 型安全性
- **Atlassian Design System**: UIコンポーネントライブラリ
- **@tanstack/react-query**: データフェッチング・キャッシュ管理
- **@trpc/react-query**: tRPCクライアント

### バックエンド
- **tRPC 11.7.1**: 型安全なAPI層
- **Prisma 6.18.0**: ORM（MySQL）
- **Zod 4.1.12**: スキーマバリデーション
- **superjson 2.2.5**: JSONシリアライゼーション

### AI統合
- **OpenAI SDK 6.7.0**: ChatGPT (GPT-5.1/GPT-4o) + DALL·E 3
- **@anthropic-ai/sdk 0.68.0**: Claude (Claude Opus 4.1 / Sonnet 4.5)
- **@google/generative-ai 0.24.1**: Gemini (Gemini 2.5 Pro/Flash)
- **axios 1.13.1**: Grok API統合
- **@fal-ai/client 1.7.2**: Pika Labs API統合（動画生成）
- **Synthesia API**: 説明動画生成

### その他
- **html2canvas 1.4.1**: フロントエンド画像エクスポート
- **jspdf 3.0.3**: PDF生成
- **exceljs 4.4.0**: Excelエクスポート

### データベース
- **MySQL**: リレーショナルデータベース
- **Prisma Client**: 型安全なデータベースアクセス

---

## プロジェクト構造

```
beautyproject/
├── src/                          # ソースコード
│   ├── app/                      # Next.js App Router
│   │   ├── api/trpc/             # tRPCエンドポイント
│   │   ├── api/cron/             # Cron用エンドポイント
│   │   │   ├── process-experience-jobs/  # バックグラウンドジョブ処理
│   │   │   └── aggregate-metrics/        # メトリクス集計
│   │   ├── ai-context/           # Acontext機能群
│   │   │   ├── page.tsx          # ダッシュボード（セッション・メッセージ・タスク）
│   │   │   ├── spaces/           # スペース管理
│   │   │   │   ├── page.tsx      # スペース一覧
│   │   │   │   └── [id]/page.tsx # スペース詳細
│   │   │   ├── skills/            # スキル管理
│   │   │   │   ├── page.tsx      # スキル一覧
│   │   │   │   └── [id]/page.tsx # スキル詳細
│   │   │   ├── metrics/          # メトリクス
│   │   │   │   └── page.tsx      # メトリクスダッシュボード
│   │   │   └── settings/         # 設定
│   │   │       └── page.tsx       # Acontext設定
│   │   ├── strategy-analysis/     # 戦略分析（単一AI版）
│   │   ├── strategy-analysis-council/  # 戦略統合（Council合議制）
│   │   ├── api-key/               # APIキー管理ページ
│   │   ├── content/               # コンテンツ生成ページ
│   │   ├── market-research/       # 市場調査ページ
│   │   ├── prompt/                # プロンプト管理ページ
│   │   ├── sns-research/          # SNS調査ページ
│   │   ├── strategy-management/   # 戦略管理ページ
│   │   └── workflow/              # ワークフローページ
│   ├── components/                # 共通コンポーネント
│   │   ├── ai-context/            # Acontext用コンポーネント
│   │   │   └── TaskEditor.tsx     # タスク編集コンポーネント
│   │   ├── strategy/              # 戦略分析用コンポーネント
│   │   │   ├── CouncilConfigPanel.tsx  # Council設定UI
│   │   │   └── CouncilResultView.tsx   # Council結果表示UI
│   │   └── Navigation.tsx        # ナビゲーション
│   ├── features/                  # 機能別モジュール
│   │   ├── api-key/               # APIキー管理機能
│   │   ├── content/               # コンテンツ生成機能
│   │   ├── market-research/       # 市場調査機能
│   │   ├── products/              # 商品管理機能
│   │   ├── prompt/                # プロンプト管理機能
│   │   ├── sns-research/          # SNS調査機能
│   │   ├── strategy/              # 戦略機能
│   │   └── workflow/              # ワークフロー機能
│   ├── generated/prisma/          # Prisma生成ファイル
│   ├── server/                    # サーバーサイドコード
│   │   ├── api/                   # APIルーター
│   │   │   ├── routers/           # tRPCルーター（用途別に分割）
│   │   │   │   ├── ai-session.ts  # Acontextセッション・タスク管理
│   │   │   │   ├── ai-space.ts     # スペース管理
│   │   │   │   ├── ai-skill.ts    # スキル管理
│   │   │   │   ├── strategy.ts    # 戦略分析（単一AI / Council）
│   │   │   │   ├── content.ts     # 統合ルーター
│   │   │   │   ├── content-text.ts
│   │   │   │   ├── content-image.ts
│   │   │   │   ├── content-video.ts
│   │   │   │   ├── content-template.ts
│   │   │   │   ├── content-batch.ts
│   │   │   │   └── ...（その他）
│   │   │   ├── schemas/           # Zodスキーマ
│   │   │   │   └── council.ts     # Council用スキーマ
│   │   │   └── utils/             # ユーティリティ
│   │   ├── services/              # ビジネスロジック
│   │   │   ├── ai-context/        # Acontextサービス群
│   │   │   │   ├── ai-session.ts  # セッション管理
│   │   │   │   ├── task-extraction.ts  # タスク抽出
│   │   │   │   ├── skill-learning.ts   # スキル学習
│   │   │   │   ├── skill-search.ts      # スキル検索
│   │   │   │   ├── storage-adapter.ts   # ストレージアダプター
│   │   │   │   └── experience-agent.ts  # バックグラウンドジョブ
│   │   │   ├── ai-council/        # Council合議制サービス
│   │   │   │   ├── council.ts     # Councilコアロジック
│   │   │   │   ├── prompts.ts    # Council用プロンプト
│   │   │   │   └── index.ts      # エクスポート
│   │   │   ├── chatgpt.ts
│   │   │   ├── claude.ts
│   │   │   ├── gemini.ts
│   │   │   ├── grok.ts
│   │   │   ├── image-generation.ts
│   │   │   ├── video-generation.ts
│   │   │   └── ...（その他）
│   │   └── utils/                 # サーバーユーティリティ
│   ├── types/                     # 型定義
│   │   ├── ai-context-settings.ts # Acontext設定の型定義
│   │   ├── ai-council.ts          # Council型定義
│   │   └── strategy.ts            # 戦略分析型定義
│   └── trpc/                      # tRPCクライアント設定
├── prisma/                        # データベーススキーマ
│   ├── migrations/                # マイグレーションファイル
│   └── schema.prisma              # Prismaスキーマ
├── docs/                          # ドキュメント（整理済み）
│   ├── archive/                   # アーカイブ
│   ├── api/                       # APIドキュメント
│   ├── deployment/                # デプロイドキュメント
│   ├── features/                  # 機能ドキュメント
│   └── implementation/            # 実装ドキュメント
├── scripts/                       # スクリプト
└── tests/                         # テストディレクトリ（準備済み）
```

詳細は `PROJECT_STRUCTURE.md` を参照してください。

---

## セットアップ

### 前提条件

- Node.js 18以上
- MySQL 8.0以上
- npm または yarn

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd beautyproject
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env`ファイルを作成し、以下の環境変数を設定：

```env
# データベース
DATABASE_URL="mysql://user:password@localhost:3306/beautyclinic"

# AI APIキー
GEMINI_API_KEY="your_gemini_api_key"
GROK_API_KEY="your_grok_api_key"
CLAUDE_API_KEY="your_claude_api_key"
OPENAI_API_KEY="your_openai_api_key"

# 動画生成APIキー
FAL_KEY="your_fal_key"                    # Pika Labs（優先）
PIKA_LABS_API_KEY="your_pika_api_key"     # Pika Labs（フォールバック）
SYNTHESIA_API_KEY="your_synthesia_api_key"

# Web検索API（オプション）
SERP_API_KEY="your_serp_api_key"
GOOGLE_CUSTOM_SEARCH_API_KEY="your_google_custom_search_api_key"
GOOGLE_CUSTOM_SEARCH_ENGINE_ID="your_engine_id"

# AIモデル設定（オプション）
GEMINI_MODEL="gemini-2.5-pro"
CLAUDE_MODEL="claude-opus-4-1"
OPENAI_MODEL="gpt-5.1"
GROK_MODEL="grok-4"
IMAGE_GENERATION_PROVIDER="dalle"

# Acontext設定（オプション）
AI_STORAGE_TYPE="database"                # "database" | "s3"
AI_STORAGE_S3_BUCKET="your_bucket_name"  # S3使用時
AI_STORAGE_DB_THRESHOLD=1048576          # 1MB（この値を超えるファイルはS3に保存）
```

### 4. データベースのセットアップ

```bash
# Prismaクライアントの生成
npx prisma generate

# データベースマイグレーション
npx prisma db push

# または、マイグレーションファイルを作成
npx prisma migrate dev --name init
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセス

### 6. ビルド

```bash
npm run build
npm start
```

---

## 使用方法

### 1. APIキーの設定

1. `/api-key`ページにアクセス
2. 各AIサービスのAPIキーを入力
3. 「APIキーを設定」ボタンをクリック
4. 「接続を確認」ボタンで接続をテスト
5. サーバーを再起動して変更を反映

### 2. 商品管理

1. `/`ページにアクセス
2. 「商品を追加」ボタンで商品を登録
3. 原価・販売価格・説明文を入力

### 3. 市場調査の実行

1. `/market-research`ページにアクセス
2. 調査タイプを選択（トレンド分析、価格調査、競合調査）
3. 必要なパラメータを入力
4. 「調査を開始」ボタンをクリック

### 4. SNS調査の実行

1. `/sns-research`ページにアクセス
2. プラットフォームを選択（Twitter/X、Instagram、YouTube）
3. キーワードを入力
4. 「調査を開始」ボタンをクリック

### 5. 戦略分析の実行

#### 5.1 単一AI版

1. `/strategy-analysis`ページにアクセス
2. ページヘッダーの「AI」ドロップダウンから、Claude、ChatGPT、Gemini、Grokのいずれかを選択
3. 分析タイプを選択（総合分析、価格設定提案、キャンペーン案生成、新施術導入提案）
4. 必要な情報を入力
5. 分析を実行

#### 5.2 Council合議制版

1. `/strategy-analysis-council`ページにアクセス
2. 分析タイプを選択
3. 分析モードを「Council（合議制）」に設定
4. Council設定：
   - 参加モデルを2つ以上選択
   - ピアレビューを有効/無効に設定
   - 議長選択モードを選択（自動/手動）
5. 分析を実行
6. 結果を確認：
   - 最終統合結果
   - ピアレビュー結果（ランキング）
   - 各AIの個別回答

### 6. コンテンツ生成

1. `/content`ページにアクセス
2. コンテンツカテゴリを選択（テキスト、画像、動画）
3. コンテンツタイプを選択
4. キャンペーン情報を入力
5. オプション設定（トーン、画像スタイル、動画設定など）
6. 「コンテンツを生成」ボタンをクリック
7. プレビューで結果を確認

### 7. Acontext機能の使用

#### 7.1 セッションの作成と会話

1. `/ai-context`ページにアクセス
2. 「新しいセッションを作成」ボタンをクリック
3. メッセージを入力して送信（⌘+Enter / Ctrl+Enter）
4. アシスタントからの返信を確認

#### 7.2 タスクの抽出と編集

1. 会話が進んだら「タスク抽出」ボタンをクリック
2. 抽出されたタスクが一覧表示される
3. タスクカードをクリックして編集モーダルを開く
4. ステータス、進捗メモ、ユーザー嗜好を編集して保存

#### 7.3 スペースでの整理

1. `/ai-context/spaces`ページにアクセス
2. 「新規スペース作成」ボタンでスペースを作成
3. セッション作成時にスペースを指定（オプション）
4. スペース詳細ページでセッション・スキルを確認

#### 7.4 スキルの検索と活用

1. `/ai-context/skills`ページにアクセス
2. 検索バーでキーワードを入力して検索（Fast / Agentic）
3. フィルターで複雑度やソート順を変更
4. スキル詳細ページで手順（SOP）を確認

#### 7.5 メトリクスの確認

1. `/ai-context/metrics`ページにアクセス
2. サマリーカードで今日の活動を確認
3. グラフで過去の推移を確認
4. フィルターでスペースや期間を変更

#### 7.6 設定のカスタマイズ

1. `/ai-context/settings`ページにアクセス
2. 各設定項目を変更
3. 「設定を保存」ボタンで保存
4. 環境変数リファレンスを確認して本番環境に反映

---

## 開発ガイド

### コードスタイル

- **TypeScript**: 厳格な型チェックを有効化
- **ESLint**: Next.jsのデフォルト設定を使用

### データベースマイグレーション

```bash
# 開発環境
npx prisma migrate dev --name migration_name

# 本番環境
npx prisma migrate deploy

# Prismaクライアントの再生成
npx prisma generate
```

### エラーハンドリング

- **tRPC**: `TRPCError`を使用してエラーを返す
- **フロントエンド**: `@tanstack/react-query`のエラーハンドリングを使用
- **ログ**: `console.error`でサーバー側エラーを記録

### 主要な設計パターン

1. **コンポーネントのモジュール化**: 機能別にコンポーネントを分割
2. **カスタムフック**: ロジックをフックに分離（`useContentGenerationFormState`など）
3. **tRPCルーターの用途別分割**: 大きなルーターを用途別に分割（`content-text.ts`、`content-image.ts`など）
4. **スキーマの集約**: Zodスキーマを`schemas/`ディレクトリに集約

---

## デプロイ

### Vercel

詳細は `DEPLOYMENT.md` を参照してください。

```bash
# Vercel CLIを使用
vercel deploy
```

### Vercel Cron Jobs設定

Acontextのバックグラウンド処理のために、`vercel.json`に以下の設定が必要：

```json
{
  "crons": [
    {
      "path": "/api/cron/process-experience-jobs",
      "schedule": "*/1 * * * *"
    },
    {
      "path": "/api/cron/aggregate-metrics",
      "schedule": "0 1 * * *"
    }
  ]
}
```

### その他のプラットフォーム

- **Docker**: `Dockerfile`を使用
- **AWS Amplify**: `amplify.yml`を使用
- **GCP App Engine**: `app.yaml`を使用

---

## トラブルシューティング

### ビルドエラーが発生する場合

```bash
# .nextフォルダを削除して再ビルド
rm -rf .next
npm run build
```

### API接続エラーが発生する場合

1. `/api-key`ページでAPIキーが正しく設定されているか確認
2. 「接続を確認」ボタンで接続をテスト
3. サーバーを再起動して環境変数を再読み込み

### Prismaクエリエンジンが見つからないエラー（Apple Silicon）

`prisma/schema.prisma`の`generator`セクションに`binaryTargets`を追加：

```prisma
generator client {
  provider      = "prisma-client"
  output        = "../src/generated/prisma"
  binaryTargets = ["native", "darwin-arm64"]
}
```

その後、`npx prisma generate`を実行。

### モジュールが見つからないエラー

```bash
# 依存関係を再インストール
rm -rf node_modules .next
npm install
npm run dev
```

### Council分析でエラーが発生する場合

1. 参加モデルが2つ以上選択されているか確認
2. 議長自動選択時はピアレビューが有効になっているか確認
3. 各AIのAPIキーが正しく設定されているか確認

### Acontextでタスクが抽出されない場合

1. OpenAI APIキーが正しく設定されているか確認
2. 会話履歴が十分にあるか確認（最低2-3往復の会話が必要）
3. タスク抽出のタイムアウト設定を確認（`/ai-context/settings`）

---

## 医療広告ガイドライン対応

### 禁止表現リスト

以下の表現は自動的に検出・修正されます：

- 断定表現: "完全に治る"、"必ず治る"、"絶対に治る"
- 比較優良誤認: "No.1"、"一番"、"最高"、"最強"
- 誇大表現: "革命的な"、"驚異的な"、"奇跡的な"
- 即効性の強調: "即効性"、"即座に"、"すぐに治る"
- 副作用・リスクの否定: "副作用なし"、"リスクなし"

### 自動修正機能

禁止表現は自動的に適切な表現に置換されます。

### 注意書きの自動付与

以下の注意書きが自動的に付与されます：

- "※効果には個人差があります"
- "※施術内容により、効果の程度や持続期間は異なります"
- "※事前のカウンセリングで、ご希望やご予算に合わせた最適なプランをご提案いたします"

---

## 関連ドキュメント

- `REQUIREMENTS_DOCUMENT.md` - 要件定義書
- `DEPLOYMENT.md` - デプロイ手順
- `DATABASE_SETUP.md` - データベースセットアップ
- `CHANGELOG_RECENT.md` - 最近の変更履歴
- `PROJECT_STRUCTURE.md` - プロジェクト構造の詳細
- `ACONTEXT_IMPLEMENTATION_STATUS.md` - Acontext実装状況
- `docs/` - その他のドキュメント

---

## ライセンス

このプロジェクトのライセンス情報は、リポジトリのルートディレクトリにあるLICENSEファイルを参照してください。

---

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

---

## サポート

問題が発生した場合は、GitHubのIssuesで報告してください。
