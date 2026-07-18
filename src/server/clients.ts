import { and, count, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { TENANT_ID } from "@/lib/tenant";

export type ClientInput = {
  name: string;
  email: string;
  address: string;
  language: "ja" | "en";
};

export async function listClientsWithInvoiceCount() {
  return db
    .select({
      id: schema.clients.id,
      name: schema.clients.name,
      email: schema.clients.email,
      address: schema.clients.address,
      language: schema.clients.language,
      invoiceCount: count(schema.invoices.id),
    })
    .from(schema.clients)
    .leftJoin(schema.invoices, eq(schema.invoices.clientId, schema.clients.id))
    .where(eq(schema.clients.tenantId, TENANT_ID))
    .groupBy(schema.clients.id)
    .orderBy(desc(schema.clients.createdAt), desc(schema.clients.id));
}

export async function getClientById(id: number) {
  const rows = await db
    .select()
    .from(schema.clients)
    .where(and(eq(schema.clients.tenantId, TENANT_ID), eq(schema.clients.id, id)));
  return rows[0];
}

export async function insertClient(input: ClientInput) {
  const rows = await db
    .insert(schema.clients)
    .values({ tenantId: TENANT_ID, ...input })
    .returning();
  return rows[0];
}

export async function saveClient(id: number, input: ClientInput) {
  await db
    .update(schema.clients)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(and(eq(schema.clients.tenantId, TENANT_ID), eq(schema.clients.id, id)));
}

export async function removeClient(id: number): Promise<{ error?: string }> {
  const invoiceCount = await db
    .select({ value: count() })
    .from(schema.invoices)
    .where(and(eq(schema.invoices.tenantId, TENANT_ID), eq(schema.invoices.clientId, id)));

  if ((invoiceCount[0]?.value ?? 0) > 0) {
    return { error: "請求書がある取引先は削除できません" };
  }

  await db
    .delete(schema.clients)
    .where(and(eq(schema.clients.tenantId, TENANT_ID), eq(schema.clients.id, id)));
  return {};
}
