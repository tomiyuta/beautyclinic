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
    // Vercel環境でのQuery Engineのパスを明示的に指定
    ...(process.env.VERCEL && {
      __internal: {
        engine: {
          binaryTargets: ["debian-openssl-3.0.x", "rhel-openssl-3.0.x", "linux-musl-openssl-3.0.x"],
        },
      },
    }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

