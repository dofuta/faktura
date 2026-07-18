import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { TENANT_ID } from "@/lib/tenant";

export const SETTING_KEYS = {
  openaiApiKey: "openai_api_key",
  openaiModel: "openai_model",
  googleClientId: "google_client_id",
  googleClientSecret: "google_client_secret",
  googleRefreshToken: "google_refresh_token",
  driveFolderId: "drive_folder_id",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

const SECRET_KEYS: SettingKey[] = [
  SETTING_KEYS.openaiApiKey,
  SETTING_KEYS.googleClientSecret,
  SETTING_KEYS.googleRefreshToken,
];

export const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";

export async function getSetting(key: SettingKey): Promise<string | undefined> {
  const rows = await db
    .select()
    .from(schema.settings)
    .where(and(eq(schema.settings.tenantId, TENANT_ID), eq(schema.settings.key, key)));
  const value = rows[0]?.value;
  if (value === undefined || value === "") {
    return undefined;
  }
  return SECRET_KEYS.includes(key) ? decryptSecret(value) : value;
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  if (value === "") {
    await deleteSetting(key);
    return;
  }
  const stored = SECRET_KEYS.includes(key) ? encryptSecret(value) : value;
  await db
    .insert(schema.settings)
    .values({ tenantId: TENANT_ID, key, value: stored })
    .onConflictDoUpdate({
      target: [schema.settings.tenantId, schema.settings.key],
      set: { value: stored },
    });
}

export async function deleteSetting(key: SettingKey): Promise<void> {
  await db
    .delete(schema.settings)
    .where(and(eq(schema.settings.tenantId, TENANT_ID), eq(schema.settings.key, key)));
}

export async function hasSetting(key: SettingKey): Promise<boolean> {
  return (await getSetting(key)) !== undefined;
}
