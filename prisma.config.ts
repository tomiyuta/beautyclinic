import "dotenv/config";

import { defineConfig, env } from "prisma/config";

// DATABASE_URLが設定されていない場合のデフォルト値
const databaseUrl = process.env.DATABASE_URL || "mysql://dummy:dummy@localhost:3306/dummy";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: databaseUrl,
  },
});
