import { db } from "@/server/db";
import type { GeneratedContent } from "@/generated/prisma/client";
import type { AiAgent, ContentType } from "@/generated/prisma/enums";

type FileMetadata = {
  url?: string | null;
  size?: number | null;
  mimeType?: string | null;
};

type ComplianceMetadata = {
  status?: string | null;
  report?: unknown;
};

type SaveGeneratedContentParams = {
  userId: number;
  strategyId?: number;
  templateId?: number;
  contentType: ContentType;
  title: string;
  content: string;
  aiAgent: AiAgent;
  metadata?: unknown;
  file?: FileMetadata;
  compliance?: ComplianceMetadata;
  variations?: unknown;
};

export async function saveGeneratedContent(
  params: SaveGeneratedContentParams,
): Promise<GeneratedContent> {
  return db.generatedContent.create({
    data: {
      userId: params.userId,
      strategyId: params.strategyId ?? 0,
      templateId: params.templateId,
      contentType: params.contentType,
      title: params.title,
      content: params.content,
      metadata: stringifyNullableJson(params.metadata),
      fileUrl: params.file?.url ?? null,
      fileSize: params.file?.size ?? null,
      mimeType: params.file?.mimeType ?? null,
      aiAgent: params.aiAgent,
      complianceStatus: params.compliance?.status ?? null,
      complianceReport: stringifyNullableJson(params.compliance?.report),
      variations: stringifyNullableJson(params.variations),
    },
  });
}

export function stringifyNullableJson(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

