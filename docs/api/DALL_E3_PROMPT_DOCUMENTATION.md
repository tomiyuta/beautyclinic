# DALL-E 3 画像生成プロンプト仕様

## 更新日
2025年11月22日

## プロンプト構築ロジック

### 1. ベースプロンプト
```
Create a professional image for a beauty clinic marketing material. {themePrompt}. The image should be appropriate for medical advertising guidelines, avoiding exaggerated claims. Style: modern, clean, professional.
```

### 2. テーマプロンプト（getThemePrompt関数）

テーマに応じて以下のプロンプトが追加されます：

| テーマ | プロンプト内容 |
|--------|--------------|
| `before_after` | "before and after comparison, professional medical photography, clean background, side by side comparison" |
| `season_event` | "seasonal theme, festive atmosphere, elegant and modern design" |
| `clinic_interior` | "modern clinic interior, clean and professional medical facility, bright and welcoming atmosphere" |
| `texture_skin` | "close-up of healthy skin texture, natural lighting, professional medical photography" |
| その他 | "professional medical aesthetic content, clean and modern design" |

### 3. コンテンツテキストからのキーワード抽出
- コンテンツテキストが提供された場合、3文字以上の単語を抽出
- 最大5つのキーワードを抽出
- 形式: `, related to: {keywords}`

### 4. カスタムプロンプト（API経由）

APIルーター（`content.ts`）から以下のカスタムプロンプトが追加されます：

```typescript
prompt: `${input.campaignInfo.description}. Style: ${input.imageStyle}. ${input.colorScheme ? `Color scheme: ${input.colorScheme}.` : ""}${input.includeElements?.logo ? " Include clinic logo." : ""}${input.includeElements?.price ? " Include price information." : ""}${input.includeElements?.textOverlay ? " Include text overlay." : ""}`
```

#### 追加要素
- **キャンペーン説明**: `input.campaignInfo.description`
- **画像スタイル**: `Style: ${input.imageStyle}` (minimal, gorgeous, natural, modern, elegant)
- **カラースキーム**: `Color scheme: ${input.colorScheme}` (オプション)
- **ロゴ**: `Include clinic logo.` (includeElements.logoがtrueの場合)
- **価格情報**: `Include price information.` (includeElements.priceがtrueの場合)
- **テキストオーバーレイ**: `Include text overlay.` (includeElements.textOverlayがtrueの場合)

## プロンプト生成例

### 例1: Instagram投稿（正方形）
**入力:**
- imageType: `instagram_square`
- campaignInfo: { title: "ボトックスキャンペーン", description: "若返り効果抜群" }
- imageStyle: `modern`
- colorScheme: `pink and white`
- includeElements: { logo: true, textOverlay: true }

**生成されるプロンプト:**
```
若返り効果抜群. Style: modern. Color scheme: pink and white. Include clinic logo. Include text overlay.
```

**最終的なDALL-E 3へのプロンプト:**
```
Create a professional image for a beauty clinic marketing material. professional medical aesthetic content, clean and modern design, related to: 若返り効果抜群. The image should be appropriate for medical advertising guidelines, avoiding exaggerated claims. Style: modern, clean, professional.
```

ただし、カスタムプロンプトが指定されている場合は、カスタムプロンプトが優先されます。

### 例2: LP用ビジュアル（ビフォーアフター）
**入力:**
- imageType: `lp_visual`
- campaignInfo: { title: "シワ取り", description: "効果実証済み" }
- imageStyle: `elegant`
- includeElements: { beforeAfter: true }

**生成されるプロンプト:**
```
効果実証済み. Style: elegant. Include clinic logo.
```

**最終的なDALL-E 3へのプロンプト:**
```
Create a professional image for a beauty clinic marketing material. before and after comparison, professional medical photography, clean background, side by side comparison, related to: 効果実証済み. The image should be appropriate for medical advertising guidelines, avoiding exaggerated claims. Style: modern, clean, professional.
```

## プロンプト構築の流れ

```typescript
// 1. テーマプロンプトを取得
const themePrompt = getThemePrompt(options.theme, contentText);

// 2. 最終プロンプトを構築
const prompt = options.prompt || 
  `Create a professional image for a beauty clinic marketing material. ${themePrompt}. The image should be appropriate for medical advertising guidelines, avoiding exaggerated claims. Style: modern, clean, professional.`;

// 3. DALL-E 3に送信
const response = await openai.images.generate({
  model: "dall-e-3",
  prompt: prompt,
  size: "1024x1024" | "1792x1024" | "1024x1792",
  quality: "standard",
  n: 1,
});
```

## サイズマッピング

DALL-E 3のサイズ制限に合わせて自動的にマッピングされます：

| 幅×高さ | DALL-E 3サイズ |
|---------|---------------|
| width > height | `1792x1024` |
| height > width | `1024x1792` |
| width === height | `1024x1024` |

## 医療広告ガイドライン準拠

プロンプトには常に以下の文言が含まれます：
- "appropriate for medical advertising guidelines"
- "avoiding exaggerated claims"

これにより、誇大表現を避けた適切な画像が生成されます。

## 実装ファイル

- `src/server/services/image-generation.ts` - 画像生成サービス
- `src/server/api/routers/content.ts` - APIエンドポイント（generateImage）

## プロンプトの優先順位

1. **カスタムプロンプト** (`options.prompt`) - 最優先
2. **デフォルトプロンプト** - カスタムプロンプトがない場合
   - ベースプロンプト + テーマプロンプト + キーワード

## 注意事項

- DALL-E 3はプロンプトを自動的に改善するため、実際に送信されるプロンプトは若干異なる場合があります
- 日本語のキーワードはそのまま含まれますが、DALL-E 3が適切に解釈します
- 医療広告ガイドラインに準拠するため、誇大表現は避けられます
