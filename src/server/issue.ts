import { and, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { renderInvoiceHtml } from "@/invoice/render";
import { calculateTotals } from "@/invoice/totals";
import { TENANT_ID } from "@/lib/tenant";
import { getCompanyProfile, toCompanySnapshot } from "./company";
import { getDriveStatus, uploadPdfToDrive } from "./google";
import { getInvoiceDetail } from "./invoices";
import { reserveInvoiceNumber } from "./numbering";
import { renderPdfFromHtml } from "./pdf";

function sanitizeFileNamePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
}

export function buildPdfFileName(
  issueDate: string,
  clientName: string,
  language: "ja" | "en",
): string {
  const compactIssueDate = issueDate.replaceAll("-", "");
  const displayName =
    language === "ja" && !clientName.endsWith("様") ? `${clientName}様` : clientName;
  const safeName = sanitizeFileNamePart(displayName) || "client";
  return `INVOICE_${compactIssueDate}_${safeName}.pdf`;
}

async function invoiceNumberExists(invoiceNumber: string): Promise<boolean> {
  const rows = await db
    .select({ id: schema.invoices.id })
    .from(schema.invoices)
    .where(
      and(
        eq(schema.invoices.invoiceNumber, invoiceNumber),
        isNotNull(schema.invoices.invoiceNumber),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export type IssueResult = {
  error?: string;
  warning?: string;
};

export async function issueInvoice(id: number): Promise<IssueResult> {
  const detail = await getInvoiceDetail(id);
  if (!detail) {
    return { error: "請求書が見つかりません" };
  }
  const { invoice, client, items } = detail;

  if (invoice.status !== "draft") {
    return { error: "発行済みの請求書です" };
  }
  if (items.length === 0 || items.some((item) => !item.description.trim())) {
    return { error: "明細を1行以上入力し、品目を埋めてください" };
  }

  let invoiceNumber = await reserveInvoiceNumber(new Date(invoice.issueDate));
  while (await invoiceNumberExists(invoiceNumber)) {
    invoiceNumber = await reserveInvoiceNumber(new Date(invoice.issueDate));
  }

  const company = toCompanySnapshot(await getCompanyProfile());
  const itemInputs = items.map((item) => ({
    description: item.description,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    taxRate: item.taxRate,
  }));
  const totals = calculateTotals(itemInputs);

  const html = renderInvoiceHtml({
    invoiceNumber,
    language: client.language,
    company,
    client: { name: client.name, address: client.address, email: client.email },
    title: invoice.title,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    notes: invoice.notes,
    items: itemInputs,
  });
  const pdf = await renderPdfFromHtml(html);

  let driveFileId: string | undefined;
  let driveUrl: string | undefined;
  let warning: string | undefined;
  const driveStatus = await getDriveStatus();
  if (driveStatus.connected) {
    try {
      const uploaded = await uploadPdfToDrive(
        buildPdfFileName(invoice.issueDate, client.name, client.language),
        pdf,
      );
      driveFileId = uploaded.fileId;
      driveUrl = uploaded.webViewLink;
    } catch (error) {
      warning = `Driveアップロードに失敗しました(発行は完了): ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  }

  await db
    .update(schema.invoices)
    .set({
      status: "issued",
      invoiceNumber,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      total: totals.total,
      companySnapshot: JSON.stringify(company),
      pdf,
      driveFileId: driveFileId ?? null,
      driveUrl: driveUrl ?? null,
      issuedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(schema.invoices.tenantId, TENANT_ID), eq(schema.invoices.id, id)));

  return { warning };
}
