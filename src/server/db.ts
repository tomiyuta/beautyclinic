import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Vercel環境でのPrisma Client初期化を確実にする
const prismaClientOptions = {
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
  // Vercel環境でのバイナリ検出を確実にする
  ...(process.env.VERCEL && {
    __internal: {
      engine: {
        binaryTarget: "rhel-openssl-3.0.x",
      },
    },
  }),
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

