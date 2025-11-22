# 美容クリニックコンテンツ生成システム 詳細設計書

## 文書情報

- **作成日**: 2025年11月20日
- **バージョン**: 1.0
- **ベース文書**: REQUIREMENTS_DOCUMENT.md
- **対象システム**: 既存システムの拡張

---

## 1. システムアーキテクチャ

### 1.1. 全体アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                        フロントエンド層                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  ダッシュボード │  │ テキスト生成 │  │ 画像生成     │         │
│  │  コンポーネント │  │ コンポーネント│  │ コンポーネント│         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ 短尺動画生成 │  │ 説明動画生成 │  │ 生成履歴     │         │
│  │ コンポーネント │  │ コンポーネント│  │ コンポーネント│         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────────┬──────────────────────────────────┘
                             │ tRPC
┌────────────────────────────┴──────────────────────────────────┐
│                        API層 (tRPC)                            │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  contentRouter (拡張)                                    │ │
│  │  - generateText                                          │ │
│  │  - generateImage                                          │ │
│  │  - generateShortVideo                                    │ │
│  │  - generateExplanationVideo                              │ │
│  │  - getHistory                                             │ │
│  │  - checkCompliance                                        │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────┬──────────────────────────────────┘
                             │
┌────────────────────────────┴──────────────────────────────────┐
│                      サービス層                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  text-       │  │  image-      │  │  video-      │         │
│  │  generation  │  │  generation  │  │  generation  │         │
│  │  service     │  │  service     │  │  service     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  compliance- │  │  file-       │  │  template-   │         │
│  │  checker     │  │  storage     │  │  service     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────────┬──────────────────────────────────┘
                             │
┌────────────────────────────┴──────────────────────────────────┐
│                    AI API統合層                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  OpenAI API  │  │  Pika Labs   │  │  Synthesia    │         │
│  │  (ChatGPT,   │  │  API         │  │  API         │         │
│  │   DALL-E 3)  │  │              │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────────┬──────────────────────────────────┘
                             │
┌────────────────────────────┴──────────────────────────────────┐
│                    データ層                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   MySQL      │  │  AWS S3 /    │  │  Redis       │         │
│  │  (Prisma)    │  │  Cloudflare  │  │  (Cache)     │         │
│  │              │  │  R2          │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2. レイヤー説明

**フロントエンド層:**
- Next.js App Router
- Reactコンポーネント（Atlassian Design System）
- tRPC Client for React
- 状態管理: React Context + tRPC

**API層:**
- tRPC Router
- Zodによるバリデーション
- エラーハンドリング

**サービス層:**
- ビジネスロジック
- AI API呼び出し
- データ変換・加工
- コンプライアンスチェック

**データ層:**
- MySQL（Prisma ORM）
- ファイルストレージ（AWS S3 / Cloudflare R2）
- Redis（キャッシュ、将来実装）

---

## 2. データベース設計

### 2.1. Prismaスキーマ拡張

#### 2.1.1. ContentType Enum拡張

```prisma
enum ContentType {
  // 既存
  instagram_lp
  website_article
  campaign_copy
  
  // テキストコンテンツ（新規）
  instagram_post_text      // Instagram投稿文
  listing_ad_text          // リスティング広告文
  blog_article            // ブログ記事
  
  // 画像コンテンツ（新規）
  instagram_post_image_square    // Instagram投稿（正方形）
  instagram_post_image_vertical  // Instagram投稿（縦型）
  instagram_story                // Instagramストーリー
  ad_banner_horizontal           // 広告バナー（横型）
  ad_banner_square               // 広告バナー（正方形）
  lp_visual                      // LP用ビジュアル
  
  // 短尺動画コンテンツ（新規）
  instagram_reels                // Instagram Reels
  tiktok_video                   // TikTok
  youtube_shorts                  // YouTube Shorts
  
  // 説明動画コンテンツ（新規）
  treatment_explanation_video    // 施術の詳細説明
  pre_care_video                 // 術前ケア説明
  post_care_video                // 術後ケア説明
  faq_video                      // FAQ動画
}
```

#### 2.1.2. GeneratedContent モデル拡張

```prisma
model GeneratedContent {
  id          Int           @id @default(autoincrement())
  userId      Int
  strategyId  Int           @default(0)
  contentType ContentType
  title       String        @db.VarChar(255)
  content     String        @db.Text  // テキスト or Base64 or URL
  metadata    String?       @db.Text   // JSON形式で拡張情報
  
  // 新規追加フィールド
  fileUrl     String?       @db.VarChar(500)  // 画像・動画の外部ストレージURL
  fileSize    Int?                            // ファイルサイズ（bytes）
  mimeType    String?       @db.VarChar(100) // MIME type
  complianceStatus String?   @db.VarChar(50)  // "compliant" | "warning" | "violation"
  complianceReport String?   @db.Text         // コンプライアンスチェック結果（JSON）
  templateId  Int?                            // 使用したテンプレートID
  variations  String?       @db.Text          // バリエーション情報（JSON）
  parentContentId Int?                        // 親コンテンツID（バリエーションの場合）
  
  aiAgent     AiAgent
  status      ContentStatus @default(draft)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  // リレーション
  template    ContentTemplate? @relation(fields: [templateId], references: [id])
  parent      GeneratedContent? @relation("ContentVariations", fields: [parentContentId], references: [id])
  children    GeneratedContent[] @relation("ContentVariations")
  complianceChecks ComplianceCheckLog[]

  @@index([userId, contentType])
  @@index([userId, createdAt])
  @@index([complianceStatus])
  @@map("generatedContents")
}
```

#### 2.1.3. 新規テーブル

```prisma
// コンテンツテンプレート
model ContentTemplate {
  id          Int      @id @default(autoincrement())
  userId      Int
  name        String   @db.VarChar(255)
  description String?  @db.Text
  contentType ContentType
  settings    String   @db.Text  // JSON形式の設定
  isDefault   Boolean  @default(false)
  isPublic    Boolean  @default(false)  // 他のユーザーも使用可能
  usageCount  Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  contents    GeneratedContent[]

  @@index([userId])
  @@index([contentType, isPublic])
  @@map("contentTemplates")
}

// コンプライアンスチェックログ
model ComplianceCheckLog {
  id          Int      @id @default(autoincrement())
  contentId   Int
  checkType   String   @db.VarChar(50)  // "text" | "image" | "video"
  violations  String   @db.Text         // JSON形式: [{type, message, position}]
  warnings    String   @db.Text         // JSON形式: [{type, message, suggestion}]
  status      String   @db.VarChar(50)  // "compliant" | "warning" | "violation"
  checkedAt   DateTime @default(now())
  
  content     GeneratedContent @relation(fields: [contentId], references: [id], onDelete: Cascade)

  @@index([contentId])
  @@index([status, checkedAt])
  @@map("complianceCheckLogs")
}

// ファイルストレージメタデータ
model FileStorage {
  id          Int      @id @default(autoincrement())
  contentId   Int
  fileName    String   @db.VarChar(255)
  filePath    String   @db.VarChar(500)  // S3 key or R2 key
  fileUrl     String   @db.VarChar(500)
  fileSize    Int
  mimeType    String   @db.VarChar(100)
  storageType String   @db.VarChar(50)   // "s3" | "r2" | "local"
  uploadedAt  DateTime @default(now())
  expiresAt   DateTime?                  // 一時ファイルの有効期限

  @@index([contentId])
  @@index([expiresAt])
  @@map("fileStorages")
}
```

### 2.2. データモデル詳細

#### 2.2.1. GeneratedContent.metadata (JSON構造)

```typescript
interface ContentMetadata {
  // テキストコンテンツ
  tone?: "formal" | "casual" | "friendly" | "professional";
  wordCount?: number;
  keywords?: string[];
  ctaType?: "reserve" | "view_details" | "contact" | "check_now";
  seoKeywords?: string[];
  
  // 画像コンテンツ
  imageSize?: { width: number; height: number };
  colorScheme?: string;
  includedElements?: {
    logo?: boolean;
    price?: boolean;
    textOverlay?: boolean;
    beforeAfter?: boolean;
  };
  imageStyle?: "minimal" | "gorgeous" | "natural" | "modern" | "elegant";
  
  // 動画コンテンツ
  videoLength?: number; // seconds
  videoOrientation?: "portrait" | "landscape" | "square";
  hasBGM?: boolean;
  bgmGenre?: string;
  textOverlay?: string;
  avatarType?: string;
  language?: "ja" | "en" | "zh" | "ko";
  
  // 共通
  designApproach?: "minimal" | "bold" | "elegant" | "trendy";
  targetAudience?: string;
  campaignInfo?: {
    title: string;
    description: string;
    promotion?: string;
  };
  generationSettings?: Record<string, unknown>;
}
```

#### 2.2.2. GeneratedContent.variations (JSON構造)

```typescript
interface ContentVariations {
  count: number;
  variations: Array<{
    index: number;
    content: string; // or URL for image/video
    score?: number;  // AI生成スコア（将来実装）
    selected?: boolean;
  }>;
}
```

#### 2.2.3. ComplianceCheckLog.violations/warnings (JSON構造)

```typescript
interface ComplianceIssue {
  type: string;  // "forbidden_word" | "exaggerated_claim" | "comparison_ad" etc.
  message: string;
  position?: {
    start: number;
    end: number;
    line?: number;
  };
  severity: "error" | "warning";
  suggestion?: string;  // 代替案
  ruleId: string;  // ルールID
}
```

---

## 3. API設計（tRPC）

### 3.1. contentRouter 拡張

#### 3.1.1. テキスト生成エンドポイント

```typescript
// src/server/api/routers/content.ts

generateText: publicProcedure
  .input(
    z.object({
      userId: z.number().int().positive(),
      strategyId: z.number().int().positive().optional(),
      contentType: z.enum([
        "instagram_post_text",
        "website_article",
        "campaign_copy",
        "listing_ad_text",
        "blog_article",
      ]),
      campaignTitle: z.string().min(1),
      campaignDescription: z.string().min(1),
      targetAudience: z.string().optional(),
      tone: z.enum(["formal", "casual", "friendly", "professional"]).optional(),
      wordCountLimit: z.number().int().positive().optional(),
      keywords: z.array(z.string()).optional(),
      ctaType: z.enum(["reserve", "view_details", "contact", "check_now"]).optional(),
      seoKeywords: z.array(z.string()).optional(),
      variationCount: z.number().int().min(1).max(3).default(3),
      checkCompliance: z.boolean().default(true),
    })
  )
  .mutation(async ({ input }) => {
    // 実装詳細は後述
  })
```

**レスポンス型:**
```typescript
interface GenerateTextResponse {
  success: boolean;
  results: Array<{
    id: number;
    index: number;
    content: string;
    wordCount: number;
    complianceStatus: "compliant" | "warning" | "violation";
    complianceIssues?: ComplianceIssue[];
  }>;
  message: string;
  metadata: {
    generationTime: number;
    model: string;
    tokensUsed?: number;
  };
}
```

#### 3.1.2. 画像生成エンドポイント

```typescript
generateImage: publicProcedure
  .input(
    z.object({
      userId: z.number().int().positive(),
      strategyId: z.number().int().positive().optional(),
      imageType: z.enum([
        "instagram_post_image_square",
        "instagram_post_image_vertical",
        "instagram_story",
        "ad_banner_horizontal",
        "ad_banner_square",
        "lp_visual",
      ]),
      campaignTitle: z.string().min(1),
      campaignDescription: z.string().min(1),
      imageSize: z.object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      }).optional(),
      colorScheme: z.string().optional(),
      includedElements: z.object({
        logo: z.boolean().optional(),
        price: z.boolean().optional(),
        textOverlay: z.boolean().optional(),
        beforeAfter: z.boolean().optional(),
      }).optional(),
      imageStyle: z.enum(["minimal", "gorgeous", "natural", "modern", "elegant"]).optional(),
      variationCount: z.number().int().min(1).max(4).default(4),
      checkCompliance: z.boolean().default(true),
    })
  )
  .mutation(async ({ input }) => {
    // 実装詳細は後述
  })
```

**レスポンス型:**
```typescript
interface GenerateImageResponse {
  success: boolean;
  results: Array<{
    id: number;
    index: number;
    fileUrl: string;
    thumbnailUrl?: string;
    width: number;
    height: number;
    fileSize: number;
    complianceStatus: "compliant" | "warning" | "violation";
  }>;
  message: string;
  metadata: {
    generationTime: number;
    model: string;
  };
}
```

#### 3.1.3. 短尺動画生成エンドポイント

```typescript
generateShortVideo: publicProcedure
  .input(
    z.object({
      userId: z.number().int().positive(),
      strategyId: z.number().int().positive().optional(),
      videoType: z.enum(["instagram_reels", "tiktok_video", "youtube_shorts"]),
      campaignTitle: z.string().min(1),
      campaignDescription: z.string().min(1),
      videoLength: z.number().int().min(5).max(60),
      videoOrientation: z.enum(["portrait", "landscape", "square"]).optional(),
      hasBGM: z.boolean().default(true),
      textOverlay: z.string().optional(),
      variationCount: z.number().int().min(1).max(2).default(2),
    })
  )
  .mutation(async ({ input }) => {
    // 実装詳細は後述
  })
```

#### 3.1.4. 説明動画生成エンドポイント

```typescript
generateExplanationVideo: publicProcedure
  .input(
    z.object({
      userId: z.number().int().positive(),
      videoType: z.enum([
        "treatment_explanation_video",
        "pre_care_video",
        "post_care_video",
        "faq_video",
      ]),
      treatmentName: z.string().min(1),
      script: z.string().min(1).max(5000),
      videoLength: z.number().int().min(60).max(180).optional(),
      avatarType: z.string().optional(),
      language: z.enum(["ja", "en", "zh", "ko"]).default("ja"),
    })
  )
  .mutation(async ({ input }) => {
    // 実装詳細は後述
  })
```

#### 3.1.5. 共通エンドポイント

```typescript
// 生成履歴取得
getHistory: publicProcedure
  .input(
    z.object({
      userId: z.number().int().positive(),
      contentType: z.nativeEnum(ContentType).optional(),
      moduleType: z.enum(["text", "image", "short_video", "explanation_video"]).optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    })
  )
  .query(async ({ input }) => {
    // 実装
  })

// コンプライアンスチェック
checkCompliance: publicProcedure
  .input(
    z.object({
      content: z.string(),
      contentType: z.enum(["text", "image", "video"]),
    })
  )
  .mutation(async ({ input }) => {
    // 実装
  })

// コンテンツ取得
getById: publicProcedure
  .input(
    z.object({
      id: z.number().int().positive(),
      userId: z.number().int().positive(),
    })
  )
  .query(async ({ input }) => {
    // 実装
  })

// コンテンツ更新
update: publicProcedure
  .input(
    z.object({
      id: z.number().int().positive(),
      userId: z.number().int().positive(),
      content: z.string().optional(),
      status: z.nativeEnum(ContentStatus).optional(),
      metadata: z.record(z.unknown()).optional(),
    })
  )
  .mutation(async ({ input }) => {
    // 実装
  })

// コンテンツ削除
delete: publicProcedure
  .input(
    z.object({
      id: z.number().int().positive(),
      userId: z.number().int().positive(),
    })
  )
  .mutation(async ({ input }) => {
    // 実装
  })
```

---

## 4. サービス層設計

### 4.1. テキスト生成サービス

**ファイル**: `src/server/services/text-generation.ts`

```typescript
export interface TextGenerationOptions {
  contentType: "instagram_post_text" | "website_article" | "campaign_copy" | "listing_ad_text" | "blog_article";
  campaignTitle: string;
  campaignDescription: string;
  targetAudience?: string;
  tone?: "formal" | "casual" | "friendly" | "professional";
  wordCountLimit?: number;
  keywords?: string[];
  ctaType?: "reserve" | "view_details" | "contact" | "check_now";
  seoKeywords?: string[];
  variationCount?: number;
}

export interface TextGenerationResult {
  content: string;
  wordCount: number;
  model: string;
  tokensUsed?: number;
}

export async function generateText(
  options: TextGenerationOptions
): Promise<TextGenerationResult[]> {
  // 1. プロンプト構築
  const prompt = buildTextPrompt(options);
  
  // 2. Web検索結果取得（オプション）
  const webSearchResults = await getWebSearchResults(options);
  
  // 3. ChatGPT API呼び出し（バリエーション生成）
  const results = await Promise.all(
    Array.from({ length: options.variationCount || 3 }).map(() =>
      callChatGPT(prompt, systemPrompt, maxTokens)
    )
  );
  
  // 4. コンプライアンスチェック
  const checkedResults = await Promise.all(
    results.map(result => checkTextCompliance(result.content))
  );
  
  return checkedResults;
}

function buildTextPrompt(options: TextGenerationOptions): string {
  // コンテンツタイプに応じたプロンプト構築
  // 既存のprompt-helper.tsを拡張
}
```

### 4.2. 画像生成サービス

**ファイル**: `src/server/services/image-generation-enhanced.ts`

```typescript
export interface ImageGenerationOptions {
  imageType: string;
  campaignTitle: string;
  campaignDescription: string;
  imageSize?: { width: number; height: number };
  colorScheme?: string;
  includedElements?: {
    logo?: boolean;
    price?: boolean;
    textOverlay?: boolean;
    beforeAfter?: boolean;
  };
  imageStyle?: "minimal" | "gorgeous" | "natural" | "modern" | "elegant";
  variationCount?: number;
}

export interface ImageGenerationResult {
  fileUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  fileSize: number;
  model: string;
}

export async function generateImage(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult[]> {
  // 1. 画像サイズ決定
  const size = getImageSize(options.imageType, options.imageSize);
  
  // 2. プロンプト構築
  const prompt = buildImagePrompt(options);
  
  // 3. DALL-E 3 API呼び出し
  const images = await Promise.all(
    Array.from({ length: options.variationCount || 4 }).map(() =>
      generateImageWithDalle({
        preset: mapImageTypeToPreset(options.imageType),
        theme: "clinic_interior", // デフォルト
        customSize: size,
        prompt,
      })
    )
  );
  
  // 4. ファイルストレージにアップロード
  const uploadedImages = await Promise.all(
    images.map(img => uploadToStorage(img.url, options))
  );
  
  // 5. コンプライアンスチェック
  const checkedImages = await Promise.all(
    uploadedImages.map(img => checkImageCompliance(img))
  );
  
  return checkedImages;
}

async function uploadToStorage(
  imageUrl: string,
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  // 1. 画像をダウンロード
  const imageBuffer = await downloadImage(imageUrl);
  
  // 2. リサイズ・最適化（必要に応じて）
  const optimizedBuffer = await optimizeImage(imageBuffer, options);
  
  // 3. ストレージにアップロード
  const fileUrl = await uploadToS3OrR2(optimizedBuffer, options);
  
  return {
    fileUrl,
    width: options.imageSize?.width || 1080,
    height: options.imageSize?.height || 1080,
    fileSize: optimizedBuffer.length,
    model: "dall-e-3",
  };
}
```

### 4.3. 動画生成サービス

**ファイル**: `src/server/services/video-generation.ts`

```typescript
export interface ShortVideoGenerationOptions {
  videoType: "instagram_reels" | "tiktok_video" | "youtube_shorts";
  campaignTitle: string;
  campaignDescription: string;
  videoLength: number;
  videoOrientation?: "portrait" | "landscape" | "square";
  hasBGM?: boolean;
  textOverlay?: string;
  variationCount?: number;
}

export interface ExplanationVideoGenerationOptions {
  videoType: "treatment_explanation_video" | "pre_care_video" | "post_care_video" | "faq_video";
  treatmentName: string;
  script: string;
  videoLength?: number;
  avatarType?: string;
  language?: "ja" | "en" | "zh" | "ko";
}

export async function generateShortVideo(
  options: ShortVideoGenerationOptions
): Promise<VideoGenerationResult[]> {
  // Pika Labs API統合（要調査・実装）
  // フォールバック: Runway ML等
}

export async function generateExplanationVideo(
  options: ExplanationVideoGenerationOptions
): Promise<VideoGenerationResult> {
  // Synthesia API統合
}
```

### 4.4. コンプライアンスチェックサービス

**ファイル**: `src/server/services/compliance-checker.ts`

```typescript
export interface ComplianceCheckResult {
  status: "compliant" | "warning" | "violation";
  violations: ComplianceIssue[];
  warnings: ComplianceIssue[];
  score: number; // 0-100
}

// 禁止ワードリスト
const FORBIDDEN_WORDS = [
  "日本一", "No.1", "一番", "最高", "絶対",
  "永久保証", "100%", "必ず",
  "満足度100%", "他院より",
  // ... 13の禁止表現に対応
];

// 禁止表現パターン
const FORBIDDEN_PATTERNS = [
  {
    pattern: /(日本一|No\.1|一番|最高|絶対)/g,
    type: "comparison_ad",
    message: "比較広告表現が含まれています",
    suggestion: "具体的な数値や実績に置き換えてください",
  },
  {
    pattern: /(永久保証|100%|必ず)/g,
    type: "exaggerated_claim",
    message: "誇大表現が含まれています",
    suggestion: "個人差があることを明記してください",
  },
  // ... その他のパターン
];

export async function checkTextCompliance(
  content: string
): Promise<ComplianceCheckResult> {
  const violations: ComplianceIssue[] = [];
  const warnings: ComplianceIssue[] = [];
  
  // 1. 禁止ワードチェック
  FORBIDDEN_WORDS.forEach(word => {
    const regex = new RegExp(word, "g");
    let match;
    while ((match = regex.exec(content)) !== null) {
      violations.push({
        type: "forbidden_word",
        message: `禁止ワード「${word}」が含まれています`,
        position: { start: match.index, end: match.index + word.length },
        severity: "error",
        suggestion: getSuggestion(word),
        ruleId: `FORBIDDEN_WORD_${word}`,
      });
    }
  });
  
  // 2. 禁止表現パターンチェック
  FORBIDDEN_PATTERNS.forEach(pattern => {
    const matches = content.matchAll(pattern.pattern);
    for (const match of matches) {
      const issue: ComplianceIssue = {
        type: pattern.type,
        message: pattern.message,
        position: match.index !== undefined
          ? { start: match.index, end: match.index + match[0].length }
          : undefined,
        severity: "error",
        suggestion: pattern.suggestion,
        ruleId: `PATTERN_${pattern.type}`,
      };
      violations.push(issue);
    }
  });
  
  // 3. スコア計算
  const score = calculateComplianceScore(violations, warnings);
  
  // 4. ステータス決定
  const status = violations.length > 0
    ? "violation"
    : warnings.length > 0
    ? "warning"
    : "compliant";
  
  return { status, violations, warnings, score };
}

export async function checkImageCompliance(
  imageUrl: string
): Promise<ComplianceCheckResult> {
  // 画像のコンプライアンスチェック
  // - ビフォーアフター写真の条件チェック
  // - 加工された写真の検出（将来実装）
  // - わいせつ・残虐な画像の検出（将来実装）
}

export async function checkVideoCompliance(
  videoUrl: string
): Promise<ComplianceCheckResult> {
  // 動画のコンプライアンスチェック
  // - 音声テキストの抽出とチェック
  // - ビフォーアフター動画の条件チェック
}
```

### 4.5. ファイルストレージサービス

**ファイル**: `src/server/services/file-storage.ts`

```typescript
export interface StorageConfig {
  type: "s3" | "r2" | "local";
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
}

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  options?: { folder?: string; expiresIn?: number }
): Promise<{ url: string; key: string }> {
  const config = getStorageConfig();
  
  switch (config.type) {
    case "s3":
      return uploadToS3(buffer, fileName, contentType, options);
    case "r2":
      return uploadToR2(buffer, fileName, contentType, options);
    case "local":
      return uploadToLocal(buffer, fileName, contentType, options);
  }
}

export async function deleteFile(fileKey: string): Promise<void> {
  // ファイル削除
}

export async function getFileUrl(fileKey: string, expiresIn?: number): Promise<string> {
  // 署名付きURL生成
}
```

---

## 5. フロントエンド設計

### 5.1. コンポーネント階層

```
src/
├── app/
│   └── content/
│       └── page.tsx (メインページ)
├── features/
│   └── content/
│       ├── content-generation-dashboard.tsx (ダッシュボード)
│       ├── text-content-generation/
│       │   ├── index.tsx
│       │   ├── type-selection.tsx
│       │   ├── input-form.tsx
│       │   └── preview-editor.tsx
│       ├── image-content-generation/
│       │   ├── index.tsx
│       │   ├── type-selection.tsx
│       │   ├── input-form.tsx
│       │   └── preview-editor.tsx
│       ├── short-video-generation/
│       │   ├── index.tsx
│       │   ├── type-selection.tsx
│       │   ├── input-form.tsx
│       │   └── preview-editor.tsx
│       ├── explanation-video-generation/
│       │   ├── index.tsx
│       │   ├── type-selection.tsx
│       │   ├── input-form.tsx
│       │   └── preview-editor.tsx
│       ├── content-history.tsx
│       └── compliance-checker.tsx
└── components/
    └── content/
        ├── content-card.tsx
        ├── variation-tabs.tsx
        ├── compliance-badge.tsx
        └── file-download-button.tsx
```

### 5.2. 主要コンポーネント設計

#### 5.2.1. ContentGenerationDashboard

```typescript
// src/features/content/content-generation-dashboard.tsx

"use client";

import { useState } from "react";
import Button from "@atlaskit/button";

type ModuleType = "text" | "image" | "short_video" | "explanation_video";

const MODULES = [
  {
    type: "text" as const,
    title: "テキスト生成",
    description: "SNS投稿文、HP記事、広告コピーを生成",
    icon: "📝",
    color: "#7ED321",
  },
  {
    type: "image" as const,
    title: "画像生成",
    description: "Instagram投稿、広告バナー、LP画像を生成",
    icon: "🖼️",
    color: "#F5A623",
  },
  {
    type: "short_video" as const,
    title: "短尺動画生成",
    description: "Instagram Reels、TikTok動画を生成",
    icon: "🎬",
    color: "#BD10E0",
  },
  {
    type: "explanation_video" as const,
    title: "説明動画生成",
    description: "施術説明、術前術後ケア動画を生成",
    icon: "🎥",
    color: "#50E3C2",
  },
];

export function ContentGenerationDashboard() {
  const [selectedModule, setSelectedModule] = useState<ModuleType | null>(null);

  if (selectedModule) {
    return <ModuleContent moduleType={selectedModule} onBack={() => setSelectedModule(null)} />;
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 16px" }}>
      <header style={{ marginBottom: "40px" }}>
        <h1>コンテンツ生成</h1>
        <p>マーケティング素材を自動生成します</p>
      </header>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px" }}>
        {MODULES.map(module => (
          <ModuleCard
            key={module.type}
            module={module}
            onClick={() => setSelectedModule(module.type)}
          />
        ))}
      </div>
    </div>
  );
}
```

#### 5.2.2. TextContentGeneration

```typescript
// src/features/content/text-content-generation/index.tsx

"use client";

import { useState } from "react";
import { api } from "@/trpc/react";

type Step = "type_selection" | "input_form" | "preview_edit";

export function TextContentGeneration({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>("type_selection");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [formData, setFormData] = useState<TextGenerationFormData | null>(null);
  const [results, setResults] = useState<TextGenerationResult[] | null>(null);

  const generateMutation = api.content.generateText.useMutation({
    onSuccess: (data) => {
      setResults(data.results);
      setStep("preview_edit");
    },
    onError: (error) => {
      // エラーハンドリング
    },
  });

  if (step === "type_selection") {
    return <TypeSelection onSelect={setSelectedType} onNext={() => setStep("input_form")} />;
  }

  if (step === "input_form") {
    return (
      <InputForm
        contentType={selectedType!}
        onSubmit={(data) => {
          setFormData(data);
          generateMutation.mutate(data);
        }}
        onBack={() => setStep("type_selection")}
      />
    );
  }

  if (step === "preview_edit" && results) {
    return (
      <PreviewEditor
        results={results}
        onSave={handleSave}
        onRegenerate={() => generateMutation.mutate(formData!)}
        onBack={() => setStep("input_form")}
      />
    );
  }

  return null;
}
```

### 5.3. 状態管理

```typescript
// src/features/content/context/content-generation-context.tsx

"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ContentGenerationState {
  currentModule: "text" | "image" | "short_video" | "explanation_video" | null;
  history: GeneratedContent[];
  templates: ContentTemplate[];
}

const ContentGenerationContext = createContext<{
  state: ContentGenerationState;
  setState: React.Dispatch<React.SetStateAction<ContentGenerationState>>;
} | null>(null);

export function ContentGenerationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ContentGenerationState>({
    currentModule: null,
    history: [],
    templates: [],
  });

  return (
    <ContentGenerationContext.Provider value={{ state, setState }}>
      {children}
    </ContentGenerationContext.Provider>
  );
}

export function useContentGeneration() {
  const context = useContext(ContentGenerationContext);
  if (!context) {
    throw new Error("useContentGeneration must be used within ContentGenerationProvider");
  }
  return context;
}
```

---

## 6. AI API統合詳細

### 6.1. OpenAI API統合（拡張）

**既存**: `src/server/services/chatgpt.ts` を拡張

```typescript
// テキスト生成のバリエーション対応
export async function generateTextWithVariations(
  prompt: string,
  systemPrompt?: string,
  variationCount: number = 3,
  maxTokens: number = 2000
): Promise<Array<{ content: string; model: string; tokensUsed?: number }>> {
  const results = await Promise.all(
    Array.from({ length: variationCount }).map(async (_, index) => {
      // 各バリエーションで少し異なるプロンプトを生成
      const variationPrompt = addVariationToPrompt(prompt, index);
      
      const completion = await openai.chat.completions.create({
        model: getBestAvailableModel(),
        messages: [
          { role: "system", content: systemPrompt || DEFAULT_SYSTEM_PROMPT },
          { role: "user", content: variationPrompt },
        ],
        temperature: 0.8 + (index * 0.1), // バリエーションのために温度を変える
        max_tokens: maxTokens,
      });

      return {
        content: completion.choices[0]?.message?.content || "",
        model: completion.model,
        tokensUsed: completion.usage?.total_tokens,
      };
    })
  );

  return results;
}

// DALL-E 3統合（既存のimage-generation.tsを拡張）
export async function generateImageWithDalle3(
  prompt: string,
  size: { width: number; height: number },
  quality: "standard" | "hd" = "standard",
  style: "vivid" | "natural" = "natural"
): Promise<{ url: string; revisedPrompt?: string }> {
  const dalleSize = mapSizeToDalleFormat(size);
  
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    size: dalleSize,
    quality: quality,
    style: style,
    n: 1,
  });

  return {
    url: response.data[0]?.url || "",
    revisedPrompt: response.data[0]?.revised_prompt,
  };
}
```

### 6.2. Pika Labs API統合

**ファイル**: `src/server/services/pika-labs.ts` (新規)

```typescript
const PIKA_LABS_API_URL = "https://api.pika.art/v1";
const PIKA_LABS_API_KEY = process.env.PIKA_LABS_API_KEY;

export interface PikaLabsVideoOptions {
  prompt: string;
  duration: number; // seconds
  aspectRatio: "9:16" | "16:9" | "1:1";
  style?: string;
}

export async function generateVideoWithPikaLabs(
  options: PikaLabsVideoOptions
): Promise<{ videoUrl: string; status: string; jobId: string }> {
  // 1. ジョブ作成
  const jobResponse = await fetch(`${PIKA_LABS_API_URL}/generate`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${PIKA_LABS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: options.prompt,
      duration: options.duration,
      aspect_ratio: options.aspectRatio,
      style: options.style,
    }),
  });

  const job = await jobResponse.json();
  
  // 2. ポーリングで完了を待つ
  return pollVideoGeneration(job.job_id);
}

async function pollVideoGeneration(jobId: string): Promise<{ videoUrl: string; status: string }> {
  const maxAttempts = 60; // 5分間（5秒間隔）
  let attempts = 0;

  while (attempts < maxAttempts) {
    const statusResponse = await fetch(`${PIKA_LABS_API_URL}/status/${jobId}`, {
      headers: {
        "Authorization": `Bearer ${PIKA_LABS_API_KEY}`,
      },
    });

    const status = await statusResponse.json();

    if (status.status === "completed") {
      return { videoUrl: status.video_url, status: "completed" };
    }

    if (status.status === "failed") {
      throw new Error(`Video generation failed: ${status.error}`);
    }

    await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒待機
    attempts++;
  }

  throw new Error("Video generation timeout");
}
```

### 6.3. Synthesia API統合

**ファイル**: `src/server/services/synthesia.ts` (新規)

```typescript
const SYNTHESIA_API_URL = "https://api.synthesia.io/v2";
const SYNTHESIA_API_KEY = process.env.SYNTHESIA_API_KEY;

export interface SynthesiaVideoOptions {
  script: string;
  avatarId: string;
  language: "ja" | "en" | "zh" | "ko";
  background?: string;
}

export async function generateVideoWithSynthesia(
  options: SynthesiaVideoOptions
): Promise<{ videoUrl: string; status: string; videoId: string }> {
  // 1. ビデオ作成
  const createResponse = await fetch(`${SYNTHESIA_API_URL}/videos`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SYNTHESIA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      test: false,
      input: [
        {
          scriptText: options.script,
          avatar: options.avatarId,
          background: options.background || "off_white",
          voice: getVoiceForLanguage(options.language),
        },
      ],
    }),
  });

  const video = await createResponse.json();
  
  // 2. ポーリングで完了を待つ
  return pollVideoGeneration(video.id);
}

async function pollVideoGeneration(videoId: string): Promise<{ videoUrl: string; status: string }> {
  const maxAttempts = 120; // 10分間（5秒間隔）
  let attempts = 0;

  while (attempts < maxAttempts) {
    const statusResponse = await fetch(`${SYNTHESIA_API_URL}/videos/${videoId}`, {
      headers: {
        "Authorization": `Bearer ${SYNTHESIA_API_KEY}`,
      },
    });

    const status = await statusResponse.json();

    if (status.status === "complete") {
      return { videoUrl: status.download, status: "complete" };
    }

    if (status.status === "failed") {
      throw new Error(`Video generation failed: ${status.error}`);
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error("Video generation timeout");
}
```

---

## 7. エラーハンドリング

### 7.1. エラー分類

```typescript
// src/server/utils/errors.ts

export class ContentGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ContentGenerationError";
  }
}

export const ERROR_CODES = {
  // AI API関連
  AI_API_ERROR: "AI_API_ERROR",
  AI_API_TIMEOUT: "AI_API_TIMEOUT",
  AI_API_QUOTA_EXCEEDED: "AI_API_QUOTA_EXCEEDED",
  
  // ファイルストレージ関連
  FILE_UPLOAD_ERROR: "FILE_UPLOAD_ERROR",
  FILE_DOWNLOAD_ERROR: "FILE_DOWNLOAD_ERROR",
  FILE_SIZE_EXCEEDED: "FILE_SIZE_EXCEEDED",
  
  // バリデーション関連
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  
  // コンプライアンス関連
  COMPLIANCE_VIOLATION: "COMPLIANCE_VIOLATION",
  
  // データベース関連
  DATABASE_ERROR: "DATABASE_ERROR",
  RECORD_NOT_FOUND: "RECORD_NOT_FOUND",
} as const;
```

### 7.2. エラーハンドリング実装

```typescript
// tRPCルーターでのエラーハンドリング
.mutation(async ({ input }) => {
  try {
    // 処理
  } catch (error) {
    if (error instanceof ContentGenerationError) {
      throw new TRPCError({
        code: mapErrorCodeToTRPCCode(error.code),
        message: error.message,
        cause: error,
      });
    }
    
    // 予期しないエラー
    await logError({
      userId: input.userId,
      module: "content_generation",
      errorType: "UNEXPECTED_ERROR",
      errorMessage: error instanceof Error ? error.message : String(error),
      stackTrace: error instanceof Error ? error.stack : undefined,
      context: { input },
    });
    
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "コンテンツ生成中にエラーが発生しました",
    });
  }
})
```

---

## 8. セキュリティ設計

### 8.1. 認証・認可

```typescript
// 既存の認証システムを利用
// userIdによるリソースアクセス制御

.mutation(async ({ input, ctx }) => {
  // userIdの検証
  if (!ctx.userId || ctx.userId !== input.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "認証が必要です",
    });
  }
  
  // レート制限チェック
  await checkRateLimit(input.userId, "content_generation");
})
```

### 8.2. 入力検証

```typescript
// Zodスキーマによる厳密な検証
const contentGenerationSchema = z.object({
  userId: z.number().int().positive(),
  contentType: z.enum([...]),
  campaignTitle: z.string().min(1).max(255),
  campaignDescription: z.string().min(1).max(5000),
  // ...
}).refine(
  (data) => validateContentTypeSpecificRules(data),
  { message: "コンテンツタイプに応じた入力規則に違反しています" }
);
```

### 8.3. ファイルアップロードセキュリティ

```typescript
// ファイルタイプ検証
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function validateFile(file: Buffer, mimeType: string): void {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new ContentGenerationError(
      "許可されていないファイルタイプです",
      ERROR_CODES.INVALID_INPUT
    );
  }
  
  if (file.length > MAX_FILE_SIZE) {
    throw new ContentGenerationError(
      "ファイルサイズが上限を超えています",
      ERROR_CODES.FILE_SIZE_EXCEEDED
    );
  }
}
```

---

## 9. パフォーマンス最適化

### 9.1. キャッシング戦略

```typescript
// Redisキャッシュ（将来実装）
async function getCachedContent(key: string): Promise<string | null> {
  // Redisから取得
}

async function setCachedContent(key: string, value: string, ttl: number): Promise<void> {
  // Redisに保存
}

// プロンプトテンプレートのキャッシュ
const PROMPT_CACHE_TTL = 3600; // 1時間
```

### 9.2. 非同期処理

```typescript
// 長時間かかる処理は非同期で実行
export async function generateVideoAsync(
  options: VideoGenerationOptions
): Promise<{ jobId: string; status: "processing" }> {
  // 1. ジョブをデータベースに保存
  const job = await db.videoGenerationJob.create({
    data: {
      userId: options.userId,
      status: "processing",
      options: JSON.stringify(options),
    },
  });
  
  // 2. バックグラウンドで処理開始（非同期）
  processVideoGeneration(job.id, options).catch(error => {
    logError({ ... });
  });
  
  return { jobId: job.id.toString(), status: "processing" };
}
```

### 9.3. データベース最適化

```prisma
// インデックス追加
model GeneratedContent {
  // ...
  @@index([userId, contentType, createdAt])
  @@index([complianceStatus, createdAt])
  @@index([status, userId])
}
```

---

## 10. テスト設計

### 10.1. 単体テスト

```typescript
// src/server/services/__tests__/text-generation.test.ts

import { generateText } from "../text-generation";
import { checkTextCompliance } from "../compliance-checker";

describe("generateText", () => {
  it("should generate text content with variations", async () => {
    const result = await generateText({
      contentType: "instagram_post_text",
      campaignTitle: "テストキャンペーン",
      campaignDescription: "テスト説明",
      variationCount: 3,
    });
    
    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty("content");
    expect(result[0]).toHaveProperty("wordCount");
  });
  
  it("should check compliance", async () => {
    const result = await checkTextCompliance("日本一のクリニック");
    expect(result.status).toBe("violation");
    expect(result.violations).toHaveLength(1);
  });
});
```

### 10.2. 統合テスト

```typescript
// src/server/api/routers/__tests__/content.test.ts

import { appRouter } from "../../root";
import { createCallerFactory } from "../../trpc";

describe("contentRouter", () => {
  it("should generate text content via tRPC", async () => {
    const caller = createCallerFactory(appRouter)({});
    
    const result = await caller.content.generateText({
      userId: 1,
      contentType: "instagram_post_text",
      campaignTitle: "テスト",
      campaignDescription: "テスト説明",
    });
    
    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(3);
  });
});
```

---

## 11. 実装チェックリスト

### フェーズ1: テキスト生成拡張 + 画像生成

- [ ] Prismaスキーマ拡張
  - [ ] ContentType enum拡張
  - [ ] GeneratedContentモデル拡張
  - [ ] 新規テーブル作成（ContentTemplate, ComplianceCheckLog）
  - [ ] マイグレーション実行

- [ ] サービス層実装
  - [ ] text-generation.ts 実装
  - [ ] image-generation-enhanced.ts 実装
  - [ ] compliance-checker.ts 実装
  - [ ] file-storage.ts 実装

- [ ] API層実装
  - [ ] contentRouter拡張
  - [ ] generateText エンドポイント
  - [ ] generateImage エンドポイント
  - [ ] getHistory エンドポイント
  - [ ] checkCompliance エンドポイント

- [ ] フロントエンド実装
  - [ ] ContentGenerationDashboard
  - [ ] TextContentGeneration モジュール
  - [ ] ImageContentGeneration モジュール
  - [ ] ContentHistory コンポーネント
  - [ ] ComplianceChecker コンポーネント

- [ ] テスト
  - [ ] 単体テスト
  - [ ] 統合テスト
  - [ ] E2Eテスト

### フェーズ2: 短尺動画生成

- [ ] Pika Labs API調査・統合
- [ ] video-generation.ts 実装
- [ ] generateShortVideo エンドポイント
- [ ] ShortVideoGeneration フロントエンド
- [ ] ファイルストレージ統合

### フェーズ3: 説明動画生成

- [ ] Synthesia API統合
- [ ] generateExplanationVideo 実装
- [ ] ExplanationVideoGeneration フロントエンド
- [ ] テンプレート機能
- [ ] バッチ生成機能

---

## 12. 環境変数

```bash
# .env.example に追加

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.1

# Pika Labs
PIKA_LABS_API_KEY=pk-...

# Synthesia
SYNTHESIA_API_KEY=...

# ファイルストレージ
STORAGE_TYPE=s3  # or "r2" or "local"
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-northeast-1
AWS_S3_BUCKET=...
# or
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET=...

# Redis (将来実装)
REDIS_URL=redis://localhost:6379
```

---

## 付録

### A. 参考実装

- 既存の `src/server/services/chatgpt.ts`
- 既存の `src/server/services/image-generation.ts`
- 既存の `src/server/api/routers/content.ts`

### B. 変更履歴

| バージョン | 日付 | 変更内容 | 変更者 |
|---|---|---|---|
| 1.0 | 2025/11/20 | 初版作成 | - |


