"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { insertClient, removeClient, saveClient } from "@/server/clients";

const clientSchema = z.object({
  name: z.string().min(1, "名前を入力してください"),
  email: z.string(),
  address: z.string(),
  language: z.enum(["ja", "en"]),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

export async function createClientAction(
  values: ClientFormValues,
): Promise<{ error?: string; id?: number }> {
  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const client = await insertClient(parsed.data);
  revalidatePath("/clients");
  return { id: client.id };
}

export async function updateClientAction(
  id: number,
  values: ClientFormValues,
): Promise<{ error?: string }> {
  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await saveClient(id, parsed.data);
  revalidatePath("/clients");
  return {};
}

export async function deleteClientAction(id: number): Promise<{ error?: string }> {
  const result = await removeClient(id);
  revalidatePath("/clients");
  return result;
}
