import { defineConfig } from "drizzle-kit";

for (const file of [".env", ".env.local"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // ファイルがなければ無視
  }
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? "file:data/dev.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
