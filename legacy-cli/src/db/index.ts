import { getDb } from "./client.js";
import { runMigrations } from "./migrations.js";

export async function openDatabase() {
  const db = await getDb();
  runMigrations(db);
  return db;
}
