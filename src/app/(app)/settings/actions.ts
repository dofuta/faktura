"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { SETTING_KEYS, setSetting } from "@/lib/settings";
import { TENANT_ID } from "@/lib/tenant";
import { disconnectDrive } from "@/server/google";
import { getCompanyProfile } from "@/server/company";

const companySchema = z.object({
  name: z.string(),
  postalCode: z.string(),
  address: z.string(),
  email: z.string(),
  phone: z.string(),
  registrationNumber: z.string(),
  invoiceNotes: z.string(),
  bankName: z.string(),
  bankBranch: z.string(),
  bankAccountType: z.string(),
  bankAccountNumber: z.string(),
  bankAccountHolder: z.string(),
});

export type CompanyFormValues = z.infer<typeof companySchema>;

export async function saveCompanyAction(
  values: CompanyFormValues,
): Promise<{ error?: string }> {
  const parsed = companySchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await getCompanyProfile();
  await db
    .update(schema.companyProfiles)
    .set(parsed.data)
    .where(eq(schema.companyProfiles.tenantId, TENANT_ID));

  revalidatePath("/settings");
  return {};
}

export async function saveOpenAiAction(values: {
  apiKey: string;
  model: string;
}): Promise<{ error?: string }> {
  if (values.apiKey.trim()) {
    await setSetting(SETTING_KEYS.openaiApiKey, values.apiKey.trim());
  }
  await setSetting(SETTING_KEYS.openaiModel, values.model.trim());
  revalidatePath("/settings");
  return {};
}

export async function saveGoogleClientAction(values: {
  clientId: string;
  clientSecret: string;
}): Promise<{ error?: string }> {
  if (values.clientId.trim()) {
    await setSetting(SETTING_KEYS.googleClientId, values.clientId.trim());
  }
  if (values.clientSecret.trim()) {
    await setSetting(SETTING_KEYS.googleClientSecret, values.clientSecret.trim());
  }
  revalidatePath("/settings");
  return {};
}

export async function disconnectDriveAction(): Promise<{ error?: string }> {
  await disconnectDrive();
  revalidatePath("/settings");
  return {};
}
