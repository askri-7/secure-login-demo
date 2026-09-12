import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
     seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma CLI commands use an ephemeral DATABASE_URL supplied by the migration workflow.
    url: env("DATABASE_URL"),
  },
});