# コンテンツ生成機能拡充ロードマップ

## 作成日
2025年1月

## 概要

本ロードマップは、クリマケ（クリニック向けAI統合リサーチ）のコンテンツ生成機能を、静止画像生成から動画生成まで拡充するための具体的な実装計画です。

提案書「美容クリニック向けコンテンツ生成AI API選定・導入提案書」に基づき、3フェーズで段階的に機能を拡充します。

---

## 現状分析

### 実装済み機能

1. **静止画像生成**
   - ✅ OpenAI DALL-E 3 API統合済み
   - ✅ 画像プリセット（Instagram正方形、LPバナー、カスタムサイズ）
   - ✅ 画像テーマ（ビフォーアフター、季節イベント、クリニック内装、肌質テクスチャ）
   - ✅ コンテンツ生成と連携した画像生成

2. **テキストコンテンツ生成**
   - ✅ Instagram LP（キャプション + ハッシュタグ）
   - ✅ ブログ記事（SEO最適化）
   - ✅ LPテキスト（セクション構造）

### 未実装機能

1. **動画生成**
   - ❌ 短尺SNS動画（Instagram Reels、TikTok向け）
   - ❌ 施術説明動画（AIアバター使用）
   - ❌ 動画生成履歴管理

2. **高度な画像生成**
   - ❌ Google Gemini (Imagen) 統合
   - ❌ 画像編集機能（インペインティング等）

---

## フェーズ1: 基盤構築と短尺動画生成（0〜3ヶ月）

### 目標
- SNS投稿頻度を2倍に増加
- エンゲージメント率を15%向上
- 短尺動画生成の自動化を実現

### 実装タスク

#### 1.1 Pika Labs API統合（優先度: 最高）

**期間**: 2週間

**実装内容**:
- [ ] Pika Labs APIキーの環境変数設定
- [ ] `src/server/services/video-generation.ts` の作成
  - [ ] `generateShortVideoWithPika()` 関数の実装
  - [ ] プロンプト最適化ロジック
  - [ ] エラーハンドリング
- [ ] tRPCルーターへの追加（`src/server/api/routers/content.ts`）
  - [ ] `generateShortVideo` プロシージャの追加
- [ ] データベーススキーマ拡張（`prisma/schema.prisma`）
  - [ ] `GeneratedVideo` モデルの追加
  - [ ] `VideoPreset` enumの追加（`reels`, `tiktok`, `youtube_shorts`）
- [ ] フロントエンドUI実装（`src/features/content/content-generator.tsx`）
  - [ ] 動画生成フォームの追加
  - [ ] 動画プレビュー機能
  - [ ] 動画ダウンロード機能

**技術仕様**:
```typescript
// 動画生成オプション
interface VideoGenerationOptions {
  preset: "reels" | "tiktok" | "youtube_shorts";
  prompt: string;
  duration: 5 | 10 | 15; // 秒
  aspectRatio: "9:16" | "16:9" | "1:1";
}

// 生成された動画
interface GeneratedVideo {
  id: number;
  url: string;
  duration: number;
  preset: string;
  thumbnailUrl?: string;
}
```

**API統合例**:
```typescript
// Pika Labs API呼び出し（仮想実装）
async function generateShortVideoWithPika(
  options: VideoGenerationOptions,
  contentText?: string
): Promise<GeneratedVideo> {
  // プロンプトを医療広告ガイドラインに準拠させる
  const sanitizedPrompt = sanitizePromptForMedicalGuidelines(options.prompt);
  
  // Pika Labs API呼び出し
  const response = await pikaLabsClient.videos.generate({
    prompt: sanitizedPrompt,
    duration: options.duration,
    aspectRatio: options.aspectRatio,
  });
  
  return {
    url: response.videoUrl,
    duration: response.duration,
    preset: options.preset,
    thumbnailUrl: response.thumbnailUrl,
  };
}
```

**期待される成果物**:
- Instagram Reels用5〜15秒動画の生成機能
- TikTok用動画の生成機能
- YouTube Shorts用動画の生成機能
- 動画生成履歴の管理機能

---

#### 1.2 コンテンツ生成と動画生成の統合

**期間**: 1週間

**実装内容**:
- [ ] Instagram LP生成時に動画生成オプションを追加
- [ ] キャンペーン案から自動的に動画プロンプトを生成
- [ ] 動画と画像の組み合わせ生成機能

**統合フロー**:
```
1. ユーザーがInstagram LPを生成
2. システムがキャプションから動画プロンプトを自動生成
3. Pika Labsで短尺動画を生成
4. 画像と動画をセットで保存・プレビュー
```

---

#### 1.3 動画生成履歴管理

**期間**: 1週間

**実装内容**:
- [ ] 動画生成履歴の表示機能
- [ ] 動画の再利用機能
- [ ] 動画の削除機能
- [ ] 動画のメタデータ管理（生成日時、使用されたプロンプト、コスト等）

---

### フェーズ1の成果指標

| 指標 | 目標値 | 測定方法 |
|---|---|---|
| SNS投稿頻度 | 2倍 | 週次投稿数の比較 |
| エンゲージメント率 | +15% | Instagram/TikTokのエンゲージメント率 |
| 動画生成数 | 週20本以上 | システム内の動画生成履歴 |
| ユーザー満足度 | 4.0/5.0以上 | ユーザーフィードバック |

---

## フェーズ2: 施術説明動画生成（3〜6ヶ月）

### 目標
- 主要施術の説明動画を多言語で制作
- ウェブサイトの直帰率を10%改善
- 施術理解度を向上

### 実装タスク

#### 2.1 Synthesia API統合

**期間**: 3週間

**実装内容**:
- [ ] Synthesia APIキーの環境変数設定
- [ ] `src/server/services/video-generation.ts` に追加
  - [ ] `generateExplanationVideoWithSynthesia()` 関数の実装
  - [ ] AIアバター選択ロジック
  - [ ] 多言語対応ロジック
- [ ] tRPCルーターへの追加
  - [ ] `generateExplanationVideo` プロシージャの追加
- [ ] データベーススキーマ拡張
  - [ ] `ExplanationVideo` モデルの追加
  - [ ] `Language` enumの追加（日本語、英語、中国語、韓国語等）
  - [ ] `TreatmentType` enumの追加
- [ ] フロントエンドUI実装
  - [ ] 施術説明動画生成フォーム
  - [ ] AIアバター選択UI
  - [ ] 言語選択UI
  - [ ] スクリプト編集機能

**技術仕様**:
```typescript
// 施術説明動画生成オプション
interface ExplanationVideoOptions {
  treatmentId: number;
  treatmentName: string;
  language: "ja" | "en" | "zh" | "ko";
  avatarId: string; // SynthesiaのアバターID
  script: string; // 動画のスクリプト
  duration?: number; // 秒（オプション）
}

// 生成された説明動画
interface ExplanationVideo {
  id: number;
  url: string;
  treatmentId: number;
  language: string;
  duration: number;
  transcript?: string; // 字幕テキスト
}
```

**API統合例**:
```typescript
async function generateExplanationVideoWithSynthesia(
  options: ExplanationVideoOptions
): Promise<ExplanationVideo> {
  // スクリプトを医療広告ガイドラインに準拠させる
  const sanitizedScript = sanitizeScriptForMedicalGuidelines(options.script);
  
  // Synthesia API呼び出し
  const response = await synthesiaClient.videos.create({
    script: sanitizedScript,
    avatar: options.avatarId,
    language: options.language,
    title: `${options.treatmentName} - ${options.language}`,
  });
  
  return {
    url: response.videoUrl,
    treatmentId: options.treatmentId,
    language: options.language,
    duration: response.duration,
    transcript: response.transcript,
  };
}
```

---

#### 2.2 施術データベースとの統合

**期間**: 1週間

**実装内容**:
- [ ] 商品管理（`ClinicProduct`）と説明動画の関連付け
- [ ] 施術ごとの説明動画ライブラリ機能
- [ ] 動画の自動推奨機能（施術ページで自動表示）

**統合フロー**:
```
1. ユーザーが商品管理で施術を登録
2. システムが説明動画生成を推奨
3. ユーザーがスクリプトを入力（または自動生成）
4. Synthesiaで多言語動画を生成
5. 施術ページに自動埋め込み
```

---

#### 2.3 多言語動画の一括生成

**期間**: 1週間

**実装内容**:
- [ ] 1つのスクリプトから複数言語の動画を一括生成
- [ ] 翻訳機能の統合（Google Translate API等）
- [ ] 動画のバージョン管理

---

### フェーズ2の成果指標

| 指標 | 目標値 | 測定方法 |
|---|---|---|
| 説明動画制作数 | 主要施術10種類以上 | システム内の動画生成履歴 |
| 多言語対応 | 4言語以上（日・英・中・韓） | 生成された動画の言語分布 |
| ウェブサイト直帰率 | -10% | Google Analytics |
| 動画視聴完了率 | 60%以上 | 動画視聴分析 |

---

## フェーズ3: 高度化と最適化（6〜9ヶ月）

### 目標
- CVR（コンバージョン率）を5%向上
- CAC（顧客獲得コスト）を15%削減
- 高度なコンテンツ生成機能の実装

### 実装タスク

#### 3.1 Google Gemini (Imagen) 統合

**期間**: 2週間

**実装内容**:
- [ ] Google Gemini APIキーの環境変数設定
- [ ] `src/server/services/image-generation.ts` に追加
  - [ ] `generateImageWithGemini()` 関数の実装
  - [ ] 画像編集機能（インペインティング）
- [ ] 画像生成プロバイダーの選択機能
  - [ ] DALL-E 3とGeminiの使い分けロジック
- [ ] フロントエンドUI実装
  - [ ] 画像生成プロバイダー選択UI
  - [ ] 画像編集UI

**技術仕様**:
```typescript
// 画像生成プロバイダー
type ImageProvider = "dalle" | "gemini";

// 画像編集オプション
interface ImageEditOptions {
  originalImageUrl: string;
  editPrompt: string; // 編集内容の説明
  maskRegion?: { x: number; y: number; width: number; height: number };
}

// Gemini画像生成
async function generateImageWithGemini(
  options: ImageGenerationOptions,
  contentText?: string
): Promise<GeneratedImage> {
  // Gemini Imagen API呼び出し
  const response = await geminiClient.images.generate({
    prompt: options.prompt || generatePromptFromTheme(options.theme),
    size: `${options.customSize?.width || 1024}x${options.customSize?.height || 1024}`,
  });
  
  return {
    url: response.imageUrl,
    width: options.customSize?.width || 1024,
    height: options.customSize?.height || 1024,
    preset: options.preset,
    theme: options.theme,
  };
}
```

---

#### 3.2 A/Bテスト機能の実装

**期間**: 3週間

**実装内容**:
- [ ] 複数バージョンのコンテンツ生成機能
- [ ] A/Bテスト設定UI
- [ ] パフォーマンス追跡機能
- [ ] 自動最適化機能（効果の高いクリエイティブを自動選択）

**技術仕様**:
```typescript
// A/Bテスト設定
interface ABTestConfig {
  testName: string;
  variants: Array<{
    id: string;
    contentId: number;
    imageId?: number;
    videoId?: number;
  }>;
  trafficSplit: number[]; // 各バリアントのトラフィック割合
  metric: "engagement" | "conversion" | "click";
}

// A/Bテスト結果
interface ABTestResult {
  testId: number;
  winnerVariantId: string;
  improvement: number; // 改善率（%）
  confidence: number; // 信頼度（%）
}
```

---

#### 3.3 Runway API統合（オプション）

**期間**: 2週間

**実装内容**:
- [ ] Runway APIキーの環境変数設定
- [ ] `src/server/services/video-generation.ts` に追加
  - [ ] `generateCinematicVideoWithRunway()` 関数の実装
- [ ] 高品質な広告動画生成機能
- [ ] フロントエンドUI実装

**用途**:
- プレミアムな広告キャンペーン
- ブランディング動画
- 高品質なマーケティング資料

---

#### 3.4 コンテンツ生成ワークフローの自動化

**期間**: 2週間

**実装内容**:
- [ ] スケジュール投稿機能
- [ ] コンテンツ生成の自動トリガー（キャンペーン開始日等）
- [ ] バッチ生成機能（複数コンテンツの一括生成）
- [ ] コンテンツ生成レポート機能

---

### フェーズ3の成果指標

| 指標 | 目標値 | 測定方法 |
|---|---|---|
| CVR（コンバージョン率） | +5% | Google Analytics / CRM |
| CAC（顧客獲得コスト） | -15% | マーケティングコスト分析 |
| A/Bテスト実施数 | 月10回以上 | システム内のA/Bテスト履歴 |
| 自動生成コンテンツ数 | 月100件以上 | システム内の生成履歴 |

---

## データベーススキーマ拡張計画

### フェーズ1で追加

```prisma
enum VideoPreset {
  reels      // Instagram Reels用
  tiktok     // TikTok用
  youtube_shorts  // YouTube Shorts用
}

enum VideoStatus {
  pending    // 生成中
  completed  // 完了
  failed     // 失敗
}

model GeneratedVideo {
  id          Int         @id @default(autoincrement())
  userId      Int
  contentId   Int?        // 関連するコンテンツID（オプション）
  preset      VideoPreset
  prompt      String      @db.Text
  url         String      @db.VarChar(500)
  thumbnailUrl String?    @db.VarChar(500)
  duration    Int         // 秒
  status      VideoStatus @default(pending)
  provider    String      @default("pika") @db.VarChar(20) // "pika", "runway", "synthesia"
  metadata    Json?       // 追加メタデータ
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  user        User        @relation(fields: [userId], references: [id])
  content     GeneratedContent? @relation(fields: [contentId], references: [id])

  @@map("generatedVideos")
}
```

### フェーズ2で追加

```prisma
enum Language {
  ja  // 日本語
  en  // 英語
  zh  // 中国語
  ko  // 韓国語
}

model ExplanationVideo {
  id          Int       @id @default(autoincrement())
  userId      Int
  treatmentId Int      // 商品管理の施術ID
  language    Language
  avatarId    String   @db.VarChar(100) // SynthesiaのアバターID
  script      String   @db.Text
  url         String   @db.VarChar(500)
  transcript  String?  @db.Text // 字幕テキスト
  duration    Int      // 秒
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id])
  treatment   ClinicProduct @relation(fields: [treatmentId], references: [id])

  @@unique([treatmentId, language])
  @@map("explanationVideos")
}
```

### フェーズ3で追加

```prisma
model ABTest {
  id          Int       @id @default(autoincrement())
  userId      Int
  testName    String    @db.VarChar(200)
  variants    Json      // バリアント情報
  trafficSplit Json     // トラフィック分割
  metric      String    @db.VarChar(50) // "engagement", "conversion", "click"
  status      String    @default("running") @db.VarChar(20) // "running", "completed", "paused"
  startDate   DateTime
  endDate     DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user        User      @relation(fields: [userId], references: [id])
  results     ABTestResult[]

  @@map("abTests")
}

model ABTestResult {
  id          Int       @id @default(autoincrement())
  testId      Int
  variantId   String    @db.VarChar(100)
  impressions Int      @default(0)
  clicks      Int      @default(0)
  conversions Int      @default(0)
  engagement  Float     @default(0) // エンゲージメント率
  date        DateTime

  test        ABTest    @relation(fields: [testId], references: [id], onDelete: Cascade)

  @@unique([testId, variantId, date])
  @@map("abTestResults")
}
```

---

## API統合の詳細仕様

### Pika Labs API統合

**エンドポイント**: `https://api.pikalabs.com/v1/videos/generate`

**認証**: APIキーベース認証

**リクエスト例**:
```typescript
const response = await fetch('https://api.pikalabs.com/v1/videos/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.PIKA_LABS_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: sanitizedPrompt,
    duration: 10, // 秒
    aspectRatio: '9:16', // Instagram Reels / TikTok
    style: 'cinematic',
  }),
});
```

**レスポンス例**:
```typescript
{
  videoId: string,
  status: 'processing' | 'completed' | 'failed',
  videoUrl?: string,
  thumbnailUrl?: string,
  duration: number,
}
```

### Synthesia API統合

**エンドポイント**: `https://api.synthesia.io/v2/videos`

**認証**: APIキーベース認証

**リクエスト例**:
```typescript
const response = await fetch('https://api.synthesia.io/v2/videos', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.SYNTHESIA_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    script: sanitizedScript,
    avatar: avatarId,
    language: 'ja',
    title: `${treatmentName} - 説明動画`,
  }),
});
```

**レスポンス例**:
```typescript
{
  videoId: string,
  status: 'queued' | 'processing' | 'completed' | 'failed',
  videoUrl?: string,
  transcript?: string,
  duration?: number,
}
```

---

## コスト見積もり

### フェーズ1（Pika Labs）

| 項目 | 月間使用量 | 単価 | 月間コスト |
|---|---|---|---|
| 短尺動画生成（5-15秒） | 80本 | $0.10/本 | $8.00 |
| **合計** | | | **$8.00/月** |

### フェーズ2（Synthesia）

| 項目 | 月間使用量 | 単価 | 月間コスト |
|---|---|---|---|
| 説明動画生成（1-3分） | 10本 | $2.00/分 | $40.00 |
| **合計** | | | **$40.00/月** |

### フェーズ3（追加）

| 項目 | 月間使用量 | 単価 | 月間コスト |
|---|---|---|---|
| Gemini画像生成 | 50枚 | $0.02/枚 | $1.00 |
| Runway動画生成（オプション） | 10本 | $0.50/本 | $5.00 |
| **合計** | | | **$6.00/月** |

**総コスト見積もり**: 約$54/月（フェーズ3完了時）

---

## リスク管理

### 技術的リスク

1. **APIの可用性**
   - **リスク**: APIサービスがダウンする可能性
   - **対策**: フォールバック機能の実装、エラーハンドリングの強化

2. **生成品質のばらつき**
   - **リスク**: 生成されるコンテンツの品質が一定しない
   - **対策**: プロンプト最適化、品質チェック機能の実装

3. **コストの予測困難性**
   - **リスク**: 使用量が予想以上に増加する可能性
   - **対策**: 使用量制限機能、コストアラート機能の実装

### 法的リスク

1. **医療広告ガイドライン違反**
   - **リスク**: 生成されたコンテンツがガイドラインに違反する可能性
   - **対策**: 自動チェック機能の強化、人間による最終確認プロセスの確立

2. **著作権問題**
   - **リスク**: 生成されたコンテンツの著作権が不明確
   - **対策**: 各APIの利用規約の確認、適切なクレジット表示

---

## 実装優先順位

### 最優先（フェーズ1）

1. ✅ Pika Labs API統合
2. ✅ 短尺動画生成UI
3. ✅ 動画生成履歴管理

### 高優先度（フェーズ2）

1. ✅ Synthesia API統合
2. ✅ 施術説明動画生成
3. ✅ 多言語対応

### 中優先度（フェーズ3）

1. ✅ Google Gemini統合
2. ✅ A/Bテスト機能
3. ✅ ワークフロー自動化

### 低優先度（将来検討）

1. ⏳ Runway API統合
2. ⏳ 動画編集機能
3. ⏳ リアルタイム動画生成

---

## 成功の定義

### フェーズ1完了時

- [ ] 週20本以上の短尺動画を生成可能
- [ ] SNS投稿頻度が2倍に増加
- [ ] エンゲージメント率が15%向上

### フェーズ2完了時

- [ ] 主要施術10種類以上の説明動画を制作
- [ ] 4言語以上（日・英・中・韓）に対応
- [ ] ウェブサイト直帰率が10%改善

### フェーズ3完了時

- [ ] CVRが5%向上
- [ ] CACが15%削減
- [ ] 月100件以上のコンテンツを自動生成

---

## 次のステップ

1. **即座に開始可能なタスク**
   - [ ] Pika Labs APIキーの取得
   - [ ] APIドキュメントの確認
   - [ ] プロトタイプの作成

2. **準備が必要なタスク**
   - [ ] Synthesiaアカウントの作成
   - [ ] Google Gemini APIキーの取得
   - [ ] コスト予算の承認

3. **検討が必要なタスク**
   - [ ] 医療広告ガイドラインとの整合性確認
   - [ ] 法的レビューの実施
   - [ ] ユーザーテストの計画

---

## 参考資料

- [動画生成API調査結果.md](./動画生成API調査結果.md)
- [美容クリニック向けコンテンツ生成AI API選定・導入提案書.md](./美容クリニック向けコンテンツ生成AI API選定・導入提案書.md)
- [Pika Labs API Documentation](https://docs.pikalabs.com)
- [Synthesia API Documentation](https://docs.synthesia.io)
- [Google Gemini API Documentation](https://ai.google.dev/docs)

