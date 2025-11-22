# DALL-E 3 画像生成プロンプト実例

## 更新日
2025年11月22日

## プロンプト構築の実際の流れ

### コード実装箇所

**ファイル**: `src/server/services/image-generation.ts` (90行目)
```typescript
const prompt = options.prompt || 
  `Create a professional image for a beauty clinic marketing material. ${themePrompt}. The image should be appropriate for medical advertising guidelines, avoiding exaggerated claims. Style: modern, clean, professional.`;
```

**API経由のカスタムプロンプト**: `src/server/api/routers/content.ts` (674行目)
```typescript
prompt: `${input.campaignInfo.description}. Style: ${input.imageStyle}. ${input.colorScheme ? `Color scheme: ${input.colorScheme}.` : ""}${input.includeElements?.logo ? " Include clinic logo." : ""}${input.includeElements?.price ? " Include price information." : ""}${input.includeElements?.textOverlay ? " Include text overlay." : ""}`
```

## 実際のプロンプト例

### 例1: Instagram投稿（正方形）- モダンスタイル

**入力パラメータ:**
- imageType: `instagram_square`
- campaignInfo.title: "ボトックスキャンペーン"
- campaignInfo.description: "若返り効果抜群のボトックス施術"
- imageStyle: `modern`
- colorScheme: `pink and white`
- includeElements: { logo: true, textOverlay: true, price: false, beforeAfter: false }

**生成されるカスタムプロンプト（options.prompt）:**
```
若返り効果抜群のボトックス施術. Style: modern. Color scheme: pink and white. Include clinic logo. Include text overlay.
```

**このプロンプトがそのままDALL-E 3に送信されます**（カスタムプロンプトが優先されるため）

---

### 例2: LP用ビジュアル - エレガントスタイル

**入力パラメータ:**
- imageType: `lp_visual`
- campaignInfo.title: "シワ取り施術"
- campaignInfo.description: "効果実証済みのシワ取り"
- imageStyle: `elegant`
- colorScheme: (なし)
- includeElements: { logo: true, price: true, textOverlay: false, beforeAfter: true }

**生成されるカスタムプロンプト:**
```
効果実証済みのシワ取り. Style: elegant. Include clinic logo. Include price information.
```

---

### 例3: カスタムプロンプトなしの場合（デフォルト）

**入力パラメータ:**
- imageType: `instagram_story`
- campaignInfo.title: "キャンペーン"
- campaignInfo.description: "特別価格"
- theme: `clinic_interior` (テーマ指定)
- options.prompt: (未指定)

**テーマプロンプト（getThemePrompt関数）:**
```
modern clinic interior, clean and professional medical facility, bright and welcoming atmosphere
```

**コンテンツテキストからのキーワード:**
```
, related to: キャンペーン, 特別価格
```

**最終的なDALL-E 3へのプロンプト:**
```
Create a professional image for a beauty clinic marketing material. modern clinic interior, clean and professional medical facility, bright and welcoming atmosphere, related to: キャンペーン, 特別価格. The image should be appropriate for medical advertising guidelines, avoiding exaggerated claims. Style: modern, clean, professional.
```

---

### 例4: ビフォーアフターテーマ

**入力パラメータ:**
- theme: `before_after`
- campaignInfo.description: "シワ改善効果"
- options.prompt: (未指定)

**テーマプロンプト:**
```
before and after comparison, professional medical photography, clean background, side by side comparison
```

**最終的なDALL-E 3へのプロンプト:**
```
Create a professional image for a beauty clinic marketing material. before and after comparison, professional medical photography, clean background, side by side comparison, related to: シワ改善効果. The image should be appropriate for medical advertising guidelines, avoiding exaggerated claims. Style: modern, clean, professional.
```

## プロンプトの優先順位

1. **最優先**: `options.prompt`（API経由で渡されるカスタムプロンプト）
   - この場合、ベースプロンプトは使用されず、カスタムプロンプトがそのままDALL-E 3に送信される

2. **デフォルト**: カスタムプロンプトがない場合
   - ベースプロンプト + テーマプロンプト + キーワード

## DALL-E 3 API呼び出し

```typescript
const response = await openai.images.generate({
  model: "dall-e-3",
  prompt: prompt,  // 上記で構築されたプロンプト
  size: "1024x1024" | "1792x1024" | "1024x1792",  // アスペクト比に応じて自動選択
  quality: "standard",
  n: 1,
});
```

## 重要な注意事項

⚠️ **カスタムプロンプトが指定されている場合、ベースプロンプトは使用されません**

現在の実装では、APIルーターから`options.prompt`としてカスタムプロンプトが渡されるため、**実際にDALL-E 3に送信されるプロンプトは、キャンペーン説明 + スタイル + カラースキーム + 要素指定のみ**です。

ベースプロンプト（"Create a professional image..."）は、カスタムプロンプトが**ない場合のみ**使用されます。

## 実際の送信プロンプト例（現在の実装）

### ケース1: カスタムプロンプトあり（通常）
```
若返り効果抜群のボトックス施術. Style: modern. Color scheme: pink and white. Include clinic logo. Include text overlay.
```

### ケース2: カスタムプロンプトなし（稀）
```
Create a professional image for a beauty clinic marketing material. professional medical aesthetic content, clean and modern design. The image should be appropriate for medical advertising guidelines, avoiding exaggerated claims. Style: modern, clean, professional.
```
