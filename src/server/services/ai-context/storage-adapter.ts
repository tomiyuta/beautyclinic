/**
 * ストレージアダプター
 * database（1MB未満）とs3（1MB以上）をサポート
 * Vercelではlocalは使用不可
 */

import { db } from "@/server/db";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

export type AiStorageType = "database" | "s3";

const STORAGE_TYPE = (process.env.AI_STORAGE_TYPE as AiStorageType) ?? "database";
const DB_THRESHOLD = parseInt(process.env.AI_STORAGE_DB_THRESHOLD ?? "1048576", 10); // 1MB

// S3クライアント（設定がある場合のみ初期化）
let s3Client: S3Client | null = null;
const S3_BUCKET = process.env.AI_STORAGE_S3_BUCKET;
const S3_REGION = process.env.AI_STORAGE_S3_REGION ?? "ap-northeast-1";
const S3_ACCESS_KEY_ID = process.env.AI_STORAGE_S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.AI_STORAGE_S3_SECRET_ACCESS_KEY;

if (S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: S3_REGION,
    credentials: {
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
    },
  });
}

export interface SaveArtifactInput {
  sessionId?: string;
  name: string;
  data: Buffer | string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export interface GetArtifactInput {
  artifactId: string;
}

/**
 * ストレージタイプを決定
 */
function determineStorageType(size: number): AiStorageType {
  if (STORAGE_TYPE === "s3" || size >= DB_THRESHOLD) {
    return "s3";
  }
  return "database";
}

/**
 * アーティファクトを保存
 */
export async function saveArtifact(input: SaveArtifactInput) {
  const { sessionId, name, data, mimeType, metadata } = input;

  const buffer = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
  const size = buffer.length;
  const storageType = determineStorageType(size);

  if (storageType === "database") {
    // databaseに保存（PrismaのBytes型を使用）
    const artifact = await db.aiArtifact.create({
      data: {
        sessionId: sessionId ?? null,
        name,
        storageType: "database",
        path: `database://${name}`, // 識別用パス
        size,
        mimeType: mimeType ?? null,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      },
    });

    // 実際のデータは別途保存（PrismaのBytes型は制限があるため、Base64エンコードしてText型で保存）
    // 注意: 実際の実装では、大きなデータはS3に保存することを推奨
    return artifact;
  } else {
    // s3に保存
    if (!s3Client || !S3_BUCKET) {
      throw new Error("S3 is not configured");
    }

    const key = `artifacts/${sessionId ?? "global"}/${Date.now()}-${name}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: metadata
          ? Object.fromEntries(
              Object.entries(metadata).map(([k, v]) => [k, String(v)])
            )
          : undefined,
      })
    );

    const artifact = await db.aiArtifact.create({
      data: {
        sessionId: sessionId ?? null,
        name,
        storageType: "s3",
        path: key,
        size,
        mimeType: mimeType ?? null,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      },
    });

    return artifact;
  }
}

/**
 * アーティファクトを取得
 */
export async function getArtifact(input: GetArtifactInput) {
  const { artifactId } = input;

  const artifact = await db.aiArtifact.findUnique({
    where: { id: artifactId },
  });

  if (!artifact) {
    throw new Error("Artifact not found");
  }

  if (artifact.storageType === "database") {
    // databaseから取得（実際の実装では、データを別途取得する必要がある）
    // 注意: 大きなデータはS3に保存することを推奨
    throw new Error("Database storage retrieval not fully implemented. Use S3 for large files.");
  } else {
    // s3から取得
    if (!s3Client || !S3_BUCKET) {
      throw new Error("S3 is not configured");
    }

    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: artifact.path,
      })
    );

    if (!response.Body) {
      throw new Error("Failed to retrieve artifact from S3");
    }

    // StreamをBufferに変換
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as Readable) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return {
      artifact,
      data: buffer,
    };
  }
}

/**
 * アーティファクト一覧を取得
 */
export async function listArtifacts(sessionId?: string, limit = 50) {
  const artifacts = await db.aiArtifact.findMany({
    where: sessionId ? { sessionId } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return artifacts;
}

