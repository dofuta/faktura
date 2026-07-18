import type Database from "better-sqlite3";
import { listInvoices } from "../db/repositories.js";
import type { InvoiceRecord } from "../db/schema.js";
import { formatYen } from "../invoice/totals.js";
import { openPdfPreview, revealInFinder } from "../utils/preview.js";
import { select } from "../utils/prompts.js";
import { deleteInvoiceRecord } from "./deleteInvoice.js";

const BACK = "__back__";

function invoiceLabel(invoice: InvoiceRecord): string {
  const title = invoice.title.trim() ? ` ${invoice.title}` : "";
  const driveState = invoice.googleDriveUrl || invoice.googleDriveFileId ? "Drive保存済み" : "ローカルのみ";
  return `${invoice.invoiceNumber}${title} ${invoice.clientName} ${formatYen(invoice.total)} ${driveState}`;
}

async function selectInvoice(db: Database.Database): Promise<InvoiceRecord | undefined> {
  const invoices = listInvoices(db);
  if (invoices.length === 0) {
    console.log("請求書はまだありません。");
    return undefined;
  }

  const selected = await select<InvoiceRecord | typeof BACK>("請求書を選択してください", [
    ...invoices.map((invoice) => ({
      name: String(invoice.id),
      message: invoiceLabel(invoice),
      value: invoice,
    })),
    { name: BACK, shortcut: "b", message: "↩️ トップに戻る", value: BACK },
  ]);

  return selected === BACK ? undefined : selected;
}

async function previewInvoice(invoice: InvoiceRecord): Promise<void> {
  console.log(`PDF: ${invoice.pdfPath}`);
  if (invoice.googleDriveUrl) {
    console.log(`Google Drive: ${invoice.googleDriveUrl}`);
  }

  await openPdfPreview(invoice.pdfPath);
}

export async function runInvoicesCommand(db: Database.Database): Promise<void> {
  while (true) {
    const invoice = await selectInvoice(db);
    if (!invoice) {
      return;
    }

    const action = await select("操作を選択してください", [
      { name: "preview", message: "👀 プレビュー", value: "preview" as const },
      { name: "finder", message: "📁 Finderで表示", value: "finder" as const },
      { name: "delete", message: "🗑️ 削除", value: "delete" as const },
      { name: "back", shortcut: "b", message: "↩️ トップに戻る", value: "back" as const },
    ]);

    if (action === "back") {
      return;
    }

    if (action === "preview") {
      await previewInvoice(invoice);
      continue;
    }

    if (action === "finder") {
      await revealInFinder(invoice.pdfPath);
      continue;
    }

    if (action === "delete") {
      await deleteInvoiceRecord(db, invoice);
    }
  }
}
