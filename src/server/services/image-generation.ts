import OpenAI from "openai";

const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

export type ImagePreset = "instagram_square" | "lp_banner" | "custom";
export type ImageTheme =
  | "before_after"
  | "season_event"
  | "clinic_interior"
  | "texture_skin"
  | string;

export interface ImageGenerationOptions {
  preset: ImagePreset;
  theme: ImageTheme;
  customSize?: { width: number; height: number };
  prompt?: string; // カスタムプロンプト（オプション）
}

export interface GeneratedImage {
  url: string;
  width: number;
  height: number;
  preset: ImagePreset;
  theme: ImageTheme;
}

/**
 * 画像プリセットからサイズを取得
 */
function getPresetSize(preset: ImagePreset, customSize?: { width: number; height: number }): { width: number; height: number } {
  switch (preset) {
    case "instagram_square":
      return { width: 1080, height: 1080 };
    case "lp_banner":
      return { width: 1200, height: 630 };
    case "custom":
      if (!customSize) {
        throw new Error("custom preset requires customSize");
      }
      return customSize;
    default:
      return { width: 1080, height: 1080 };
  }
}

/**
 * テーマからプロンプトの一部を生成
 */
function getThemePrompt(theme: ImageTheme, contentText?: string): string {
  const themePrompts: Record<string, string> = {
    before_after: "before and after comparison, professional medical photography, clean background, side by side comparison",
    season_event: "seasonal theme, festive atmosphere, elegant and modern design",
    clinic_interior: "modern clinic interior, clean and professional medical facility, bright and welcoming atmosphere",
    texture_skin: "close-up of healthy skin texture, natural lighting, professional medical photography",
  };

  const basePrompt = themePrompts[theme] || "professional medical aesthetic content, clean and modern design";

  // コンテンツテキストがある場合は、それを参考にプロンプトを拡張
  if (contentText) {
    // コンテンツからキーワードを抽出（簡易版）
    const keywords = contentText
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .slice(0, 5)
      .join(", ");
    return `${basePrompt}, related to: ${keywords}`;
  }

  return basePrompt;
}

/**
 * DALL·Eを使用して画像を生成
 */
export async function generateImageWithDalle(
  options: ImageGenerationOptions,
  contentText?: string,
): Promise<GeneratedImage> {
  if (!openai) {
    throw new Error("OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.");
  }

  const { width, height } = getPresetSize(options.preset, options.customSize);
  const themePrompt = getThemePrompt(options.theme, contentText);

  // プロンプトを構築
  const prompt = options.prompt || `Create a professional image for a beauty clinic marketing material. ${themePrompt}. The image should be appropriate for medical advertising guidelines, avoiding exaggerated claims. Style: modern, clean, professional.`;

  try {
    // DALL·E 3のサイズ制限に合わせる
    let size: "1024x1024" | "1792x1024" | "1024x1792" = "1024x1024";
    if (width > height) {
      size = "1792x1024";
    } else if (height > width) {
      size = "1024x1792";
    }

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      size,
      quality: "standard",
      n: 1,
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error("Failed to generate image: No URL returned");
    }

    return {
      url: imageUrl,
      width,
      height,
      preset: options.preset,
      theme: options.theme,
    };
  } catch (error) {
    console.error("[Image Generation] DALL·E error:", error);
    throw new Error(
      error instanceof Error
        ? `Image generation failed: ${error.message}`
        : "Image generation failed",
    );
  }
}

/**
 * 画像生成（DALL·Eをデフォルトとして使用）
 */
export async function generateImage(
  options: ImageGenerationOptions,
  contentText?: string,
): Promise<GeneratedImage> {
  // 将来的にStable Diffusion等への切り替えも可能にする
  const imageProvider = process.env.IMAGE_GENERATION_PROVIDER || "dalle";

  switch (imageProvider) {
    case "dalle":
      return generateImageWithDalle(options, contentText);
    default:
      throw new Error(`Unsupported image generation provider: ${imageProvider}`);
  }
}

