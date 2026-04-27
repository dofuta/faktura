import Database from "better-sqlite3";
import path from "node:path";
import { ensureDir } from "../utils/files.js";
import { loadEnv } from "../config/env.js";

let db: Database.Database | undefined;

export async function getDb(): Promise<Database.Database> {
  if (db) {
    return db;
  }

  const env = loadEnv();
  await ensureDir(path.dirname(env.databasePath));
  db = new Database(env.databasePath);
  db.pragma("foreign_keys = ON");
  return db;
}

export function closeDb(): void {
  db?.close();
  db = undefined;
}
