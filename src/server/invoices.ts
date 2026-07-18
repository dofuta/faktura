import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { CompanySnapshot, InvoiceRenderInput } from "@/invoice/render";
import { calculateTotals, type InvoiceItemInput } from "@/invoice/totals";
import { TENANT_ID } from "@/lib/tenant";
import { getCompanyProfile, toCompanySnapshot } from "./company";

export type InvoiceDraftData = {
  clientId: number;
  title: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  items: InvoiceItemInput[];
};

export async function listInvoicesWithClient() {
  return db
    .select({
      id: schema.invoices.id,
      status: schema.invoices.status,
      invoiceNumber: schema.invoices.invoiceNumber,
      title: schema.invoices.title,
      issueDate: schema.invoices.issueDate,
      total: schema.invoices.total,
      driveUrl: schema.invoices.driveUrl,
      createdAt: schema.invoices.createdAt,
      clientName: schema.clients.name,
      clientLanguage: schema.clients.language,
    })
    .from(schema.invoices)
    .innerJoin(schema.clients, eq(schema.clients.id, schema.invoices.clientId))
    .where(eq(schema.invoices.tenantId, TENANT_ID))
    .orderBy(desc(schema.invoices.createdAt), desc(schema.invoices.id));
}

export async function getInvoiceDetail(id: number) {
  const rows = await db
    .select()
    .from(schema.invoices)
    .innerJoin(schema.clients, eq(schema.clients.id, schema.invoices.clientId))
    .where(and(eq(schema.invoices.tenantId, TENANT_ID), eq(schema.invoices.id, id)));

  const row = rows[0];
  if (!row) {
    return undefined;
  }

  const items = await db
    .select()
    .from(schema.invoiceItems)
    .where(eq(schema.invoiceItems.invoiceId, id))
    .orderBy(asc(schema.invoiceItems.position), asc(schema.invoiceItems.id));

  return { invoice: row.invoices, client: row.clients, items };
}

export async function createDraftInvoice(data: InvoiceDraftData): Promise<number> {
  const rows = await db
    .insert(schema.invoices)
    .values({
      tenantId: TENANT_ID,
      status: "draft",
      clientId: data.clientId,
      title: data.title,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      notes: data.notes,
    })
    .returning({ id: schema.invoices.id });

  const invoiceId = rows[0].id;
  await replaceItems(invoiceId, data.items);
  return invoiceId;
}

export async function updateDraftInvoice(id: number, data: InvoiceDraftData): Promise<void> {
  const detail = await getInvoiceDetail(id);
  if (!detail || detail.invoice.status !== "draft") {
    throw new Error("編集できるのは下書きだけです");
  }

  await db
    .update(schema.invoices)
    .set({
      clientId: data.clientId,
      title: data.title,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      notes: data.notes,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(schema.invoices.tenantId, TENANT_ID), eq(schema.invoices.id, id)));

  await replaceItems(id, data.items);
}

async function replaceItems(invoiceId: number, items: InvoiceItemInput[]): Promise<void> {
  await db.delete(schema.invoiceItems).where(eq(schema.invoiceItems.invoiceId, invoiceId));
  if (items.length === 0) {
    return;
  }
  await db.insert(schema.invoiceItems).values(
    items.map((item, index) => ({
      invoiceId,
      position: index,
      description: item.description,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      taxRate: item.taxRate,
    })),
  );
}

export async function removeInvoice(id: number): Promise<void> {
  await db
    .delete(schema.invoices)
    .where(and(eq(schema.invoices.tenantId, TENANT_ID), eq(schema.invoices.id, id)));
}

export async function buildRenderInput(id: number): Promise<InvoiceRenderInput | undefined> {
  const detail = await getInvoiceDetail(id);
  if (!detail) {
    return undefined;
  }

  const { invoice, client, items } = detail;

  const company: CompanySnapshot =
    invoice.status === "issued" && invoice.companySnapshot
      ? (JSON.parse(invoice.companySnapshot) as CompanySnapshot)
      : toCompanySnapshot(await getCompanyProfile());

  return {
    invoiceNumber: invoice.invoiceNumber,
    language: client.language,
    company,
    client: { name: client.name, address: client.address, email: client.email },
    title: invoice.title,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    notes: invoice.notes,
    items: items.map((item) => ({
      description: item.description,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      taxRate: item.taxRate,
    })),
  };
}

export function totalsForItems(items: InvoiceItemInput[]) {
  return calculateTotals(items);
}
