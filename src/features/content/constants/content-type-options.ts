// コンテンツタイプのオプション定義

export type ContentTypeOption = {
  label: string;
  value: string;
  category: "text" | "image" | "video";
  size?: string;
  type?: "short" | "explanation";
};

// テキストコンテンツタイプ（要件定義書3.1に基づく）
export const textContentTypeOptions: ContentTypeOption[] = [
  { label: "Instagram用LP案", value: "instagram_lp", category: "text" },
  { label: "Instagram投稿文", value: "instagram_post_text", category: "text" },
  { label: "HP記事", value: "website_article", category: "text" },
  { label: "ブログ記事", value: "website_article", category: "text" }, // 暫定的にwebsite_articleを使用
  { label: "キャンペーンコピー", value: "campaign_copy", category: "text" },
  { label: "広告文（リスティング）", value: "ad_banner", category: "text" },
];

// 画像コンテンツタイプ（要件定義書3.2に基づく）
export const imageContentTypeOptions: ContentTypeOption[] = [
  { label: "Instagram投稿（正方形）", value: "instagram_square", category: "image", size: "1080x1080" },
  { label: "Instagram投稿（縦型）", value: "instagram_vertical", category: "image", size: "1080x1350" },
  { label: "Instagramストーリー", value: "instagram_story", category: "image", size: "1080x1920" },
  { label: "広告バナー（横型）", value: "ad_banner_horizontal", category: "image", size: "1200x628" },
  { label: "広告バナー（正方形）", value: "ad_banner_square", category: "image", size: "1080x1080" },
  { label: "LP用ビジュアル", value: "lp_visual", category: "image", size: "1920x1080" },
];

// 動画コンテンツタイプ（要件定義書3.3, 3.4に基づく）
export const videoContentTypeOptions: ContentTypeOption[] = [
  { label: "Instagram Reels", value: "instagram_reels", category: "video", type: "short" },
  { label: "TikTok動画", value: "tiktok_video", category: "video", type: "short" },
  { label: "YouTube Shorts", value: "youtube_shorts", category: "video", type: "short" },
  { label: "施術説明動画", value: "treatment_explanation_video", category: "video", type: "explanation" },
  { label: "事前ケア動画", value: "pre_care_video", category: "video", type: "explanation" },
  { label: "アフターケア動画", value: "post_care_video", category: "video", type: "explanation" },
  { label: "FAQ動画", value: "faq_video", category: "video", type: "explanation" },
];

export const contentTypeOptions: ContentTypeOption[] = [
  ...textContentTypeOptions,
  ...imageContentTypeOptions,
  ...videoContentTypeOptions,
];

// その他のオプション定義
export const designApproachOptions = [
  { label: "トレンディ", value: "trendy" },
  { label: "ミニマル", value: "minimal" },
  { label: "大胆", value: "bold" },
  { label: "エレガント", value: "elegant" },
] as const;

export const toneOptions = [
  { label: "フォーマル", value: "formal" },
  { label: "カジュアル", value: "casual" },
  { label: "親しみやすい", value: "friendly" },
  { label: "プロフェッショナル", value: "professional" },
];

export const ctaTypeOptions = [
  { label: "予約する", value: "reserve" },
  { label: "詳細を見る", value: "details" },
  { label: "問い合わせる", value: "inquiry" },
  { label: "今すぐチェック", value: "check_now" },
];

export const imageStyleOptions = [
  { label: "ミニマル", value: "minimal" },
  { label: "ゴージャス", value: "gorgeous" },
  { label: "ナチュラル", value: "natural" },
  { label: "モダン", value: "modern" },
  { label: "エレガント", value: "elegant" },
];

export const videoDurationOptions = [
  { label: "5秒", value: 5 },
  { label: "10秒", value: 10 },
  { label: "15秒", value: 15 },
];

export const videoAspectRatioOptions = [
  { label: "9:16 (縦型)", value: "9:16" },
  { label: "16:9 (横型)", value: "16:9" },
  { label: "1:1 (正方形)", value: "1:1" },
  { label: "4:5", value: "4:5" },
  { label: "5:4", value: "5:4" },
  { label: "3:2", value: "3:2" },
  { label: "2:3", value: "2:3" },
];

export const videoStyleOptions = [
  { label: "リアル", value: "realistic" },
  { label: "アニメーション", value: "animation" },
  { label: "スライドショー", value: "slideshow" },
];

export const videoLanguageOptions = [
  { label: "日本語", value: "ja" },
  { label: "英語", value: "en" },
  { label: "中国語", value: "zh" },
  { label: "韓国語", value: "ko" },
];

export const videoBackgroundOptions = [
  { label: "クリニック", value: "clinic" },
  { label: "シンプル", value: "simple" },
];

// コンテンツタイプごとのデフォルト最大文字数
export const getDefaultMaxLength = (contentType: string): number | undefined => {
  const defaults: Record<string, number> = {
    instagram_post_text: 2200,
    ad_banner: 100,
    website_article: 5000,
    campaign_copy: 1000,
  };
  return defaults[contentType];
};

