import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// Vercel環境でのPrisma Client初期化を確実にする
if (process.env.NODE_ENV === "production") {
  // 本番環境では、Prisma Clientが正しく初期化されていることを確認
  void db.$connect().catch((error) => {
    console.error("Failed to connect to database:", error);
  });
}

