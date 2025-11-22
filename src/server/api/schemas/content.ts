import { z } from "zod";
import { ContentType } from "@/generated/prisma/enums";

export const userIdSchema = z.number().int().positive();
export const strategyIdSchema = z.number().int().positive().optional();
export const templateIdSchema = z.number().int().positive().optional();

export const baseCampaignInfoSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  targetAudience: z.string().optional(),
  promotion: z.string().optional(),
});

export const limitedCampaignInfoSchema = baseCampaignInfoSchema.extend({
  description: z.string().min(1).max(500),
});

export const shortDescriptionCampaignInfoSchema = baseCampaignInfoSchema.extend({
  description: z.string().min(1).max(300),
});

export const textToneSchema = z
  .enum(["formal", "casual", "friendly", "professional"] as const)
  .optional()
  .default("friendly");

export const ctaTypeSchema = z
  .enum(["reserve", "details", "inquiry", "check_now"] as const)
  .optional()
  .default("reserve");

export const textGenerationOptionsSchema = z.object({
  tone: textToneSchema,
  maxLength: z.number().int().positive().optional(),
  includeKeywords: z.array(z.string()).optional().default([]),
  ctaType: ctaTypeSchema,
  seoKeywords: z.array(z.string()).optional().default([]),
});

export const instagramLPInputSchema = z.object({
  userId: userIdSchema,
  strategyId: strategyIdSchema,
  campaignTitle: z.string().min(1, "キャンペーン名を入力してください"),
  campaignDescription: z.string().min(1, "キャンペーン説明を入力してください"),
  targetAudience: z.string().optional(),
  promotion: z.string().optional(),
  designApproach: z
    .enum(["minimal", "bold", "elegant", "trendy"] as const)
    .optional()
    .default("trendy"),
  count: z.number().int().min(1).max(5).optional().default(3),
});

export const websiteArticleInputSchema = z.object({
  userId: userIdSchema,
  strategyId: strategyIdSchema,
  campaignTitle: z.string().min(1, "キャンペーン名を入力してください"),
  campaignDescription: z.string().min(1, "キャンペーン説明を入力してください"),
  targetAudience: z.string().optional(),
  seoKeywords: z.array(z.string()).optional(),
});

export const campaignCopyInputSchema = z.object({
  userId: userIdSchema,
  strategyId: strategyIdSchema,
  campaignTitle: z.string().min(1, "キャンペーン名を入力してください"),
  campaignDescription: z.string().min(1, "キャンペーン説明を入力してください"),
  targetAudience: z.string().optional(),
  promotion: z.string().optional(),
  tone: z
    .enum(["professional", "friendly", "trendy"] as const)
    .optional()
    .default("friendly"),
});

export const contentListInputSchema = z.object({
  userId: userIdSchema,
  contentType: z.nativeEnum(ContentType).optional(),
});

export const contentByIdInputSchema = z.object({
  id: z.number().int().positive(),
  userId: userIdSchema,
});

export const updateContentStatusInputSchema = z.object({
  id: z.number().int().positive(),
  userId: userIdSchema,
  status: z.enum(["draft", "approved", "published"] as const),
});

export const textGenerationInputSchema = z.object({
  userId: userIdSchema,
  strategyId: strategyIdSchema,
  templateId: templateIdSchema,
  contentType: z.enum(
    ["instagram_post_text", "ad_banner", "website_article", "campaign_copy"] as const,
  ),
  campaignInfo: limitedCampaignInfoSchema,
  tone: textToneSchema,
  maxLength: z.number().int().positive().optional(),
  includeKeywords: z.array(z.string()).optional().default([]),
  ctaType: ctaTypeSchema,
  seoKeywords: z.array(z.string()).optional().default([]),
  count: z.number().int().min(1).max(5).optional().default(3),
});

export const listComplianceLogsInputSchema = z.object({
  userId: userIdSchema,
  contentId: z.number().int().positive().optional(),
  status: z.enum(["compliant", "warning", "violation"] as const).optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
});

export const complianceCheckInputSchema = z.object({
  content: z.string().min(1),
  contentType: z.enum(["text", "image", "video"] as const).default("text"),
  contentId: z.number().int().positive().optional(),
});

export const imageIncludeElementsSchema = z
  .object({
    logo: z.boolean().optional().default(false),
    price: z.boolean().optional().default(false),
    textOverlay: z.boolean().optional().default(false),
    beforeAfter: z.boolean().optional().default(false),
  })
  .optional();

export const imageGenerationInputSchema = z.object({
  userId: userIdSchema,
  strategyId: strategyIdSchema,
  templateId: templateIdSchema,
  imageType: z.enum(
    [
      "instagram_square",
      "instagram_vertical",
      "instagram_story",
      "ad_banner_horizontal",
      "ad_banner_square",
      "lp_visual",
    ] as const,
  ),
  campaignInfo: shortDescriptionCampaignInfoSchema.pick({
    title: true,
    description: true,
  }),
  colorScheme: z.string().optional(),
  includeElements: imageIncludeElementsSchema,
  imageStyle: z
    .enum(["minimal", "gorgeous", "natural", "modern", "elegant"] as const)
    .optional()
    .default("modern"),
  count: z.number().int().min(1).max(4).optional().default(4),
});

export const shortVideoGenerationInputSchema = z.object({
  userId: userIdSchema,
  strategyId: strategyIdSchema,
  templateId: templateIdSchema,
  videoType: z.enum(["reels", "tiktok", "youtube_shorts"] as const),
  campaignInfo: shortDescriptionCampaignInfoSchema.pick({ title: true, description: true }),
  duration: z
    .number()
    .int()
    .refine((val) => [5, 10, 15].includes(val))
    .optional()
    .default(10),
  aspectRatio: z
    .enum(["9:16", "16:9", "1:1", "4:5", "5:4", "3:2", "2:3"] as const)
    .optional()
    .default("9:16"),
  resolution: z.enum(["720p", "1080p"] as const).optional().default("720p"),
  bgmEnabled: z.boolean().optional().default(false),
  textOverlay: z.array(z.string()).optional().default([]),
  videoStyle: z
    .enum(["realistic", "animation", "slideshow"] as const)
    .optional()
    .default("realistic"),
  count: z.number().int().min(1).max(2).optional().default(2),
});

export const explanationVideoGenerationInputSchema = z.object({
  userId: userIdSchema,
  strategyId: strategyIdSchema,
  templateId: templateIdSchema,
  videoType: z.enum(
    ["treatment_explanation", "pre_care", "post_care", "faq"] as const,
  ),
  treatmentName: z.string().min(1),
  script: z.string().min(1).max(1000),
  duration: z
    .number()
    .int()
    .refine((val) => [60, 120, 180].includes(val))
    .optional()
    .default(120),
  avatarId: z.string().optional(),
  language: z.enum(["ja", "en", "zh", "ko"] as const).optional().default("ja"),
  background: z.enum(["clinic", "simple"] as const).optional().default("simple"),
});

export const templateCreateInputSchema = z.object({
  userId: userIdSchema,
  name: z.string().min(1, "テンプレート名を入力してください"),
  contentType: z.nativeEnum(ContentType),
  settings: z.record(z.string(), z.unknown()),
  isDefault: z.boolean().optional().default(false),
});

export const listTemplatesInputSchema = z.object({
  userId: userIdSchema,
  contentType: z.nativeEnum(ContentType).optional(),
});

export const getTemplateInputSchema = z.object({
  id: z.number().int().positive(),
  userId: userIdSchema,
});

export const updateTemplateInputSchema = z.object({
  id: z.number().int().positive(),
  userId: userIdSchema,
  name: z.string().min(1).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  isDefault: z.boolean().optional(),
});

export const deleteTemplateInputSchema = getTemplateInputSchema;

export const batchImageContentTypeSchema = z.enum(
  [
    "instagram_square",
    "instagram_vertical",
    "instagram_story",
    "ad_banner_horizontal",
    "ad_banner_square",
    "lp_visual",
  ] as const,
);

export const batchContentTypeSchema = z.enum(
  [
    "instagram_post_text",
    "ad_banner",
    "website_article",
    "campaign_copy",
    "instagram_square",
    "instagram_vertical",
    "instagram_story",
    "ad_banner_horizontal",
    "ad_banner_square",
    "lp_visual",
  ] as const,
);

export const batchCampaignSchema = limitedCampaignInfoSchema.pick({
  title: true,
  description: true,
  targetAudience: true,
  promotion: true,
});

export const batchOptionsSchema = z.object({
  tone: textToneSchema,
  maxLength: z.number().int().positive().optional(),
  includeKeywords: z.array(z.string()).optional().default([]),
  ctaType: ctaTypeSchema,
  seoKeywords: z.array(z.string()).optional().default([]),
  imageStyle: z.enum(["minimal", "gorgeous", "natural", "modern", "elegant"] as const).optional(),
  colorScheme: z.string().optional(),
  includeElements: imageIncludeElementsSchema,
  count: z.number().int().min(1).max(5).optional().default(1),
});

export const batchGenerateInputSchema = z.object({
  userId: userIdSchema,
  strategyId: strategyIdSchema,
  templateId: templateIdSchema,
  contentType: batchContentTypeSchema,
  campaigns: z.array(batchCampaignSchema).min(1).max(100),
  options: batchOptionsSchema.optional(),
});

export type InstagramLPInput = z.infer<typeof instagramLPInputSchema>;
export type WebsiteArticleInput = z.infer<typeof websiteArticleInputSchema>;
export type CampaignCopyInput = z.infer<typeof campaignCopyInputSchema>;
export type ContentListInput = z.infer<typeof contentListInputSchema>;
export type ContentByIdInput = z.infer<typeof contentByIdInputSchema>;
export type UpdateContentStatusInput = z.infer<typeof updateContentStatusInputSchema>;
export type TextGenerationInput = z.infer<typeof textGenerationInputSchema>;
export type ListComplianceLogsInput = z.infer<typeof listComplianceLogsInputSchema>;
export type ComplianceCheckInput = z.infer<typeof complianceCheckInputSchema>;
export type ImageGenerationInput = z.infer<typeof imageGenerationInputSchema>;
export type ShortVideoGenerationInput = z.infer<typeof shortVideoGenerationInputSchema>;
export type ExplanationVideoGenerationInput = z.infer<typeof explanationVideoGenerationInputSchema>;
export type TemplateCreateInput = z.infer<typeof templateCreateInputSchema>;
export type ListTemplatesInput = z.infer<typeof listTemplatesInputSchema>;
export type GetTemplateInput = z.infer<typeof getTemplateInputSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateInputSchema>;
export type DeleteTemplateInput = z.infer<typeof deleteTemplateInputSchema>;
export type BatchGenerateInput = z.infer<typeof batchGenerateInputSchema>;

