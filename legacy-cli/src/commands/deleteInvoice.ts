import { unlink } from "node:fs/promises";
import type Database from "better-sqlite3";
import { deleteInvoice, listInvoices } from "../db/repositories.js";
import type { InvoiceRecord } from "../db/schema.js";
import { deleteDriveFile } from "../integrations/googleDrive.js";
import { confirm, select } from "../utils/prompts.js";
import { formatYen } from "../invoice/totals.js";

const BACK = "__back__";

export async function runDeleteInvoiceCommand(db: Database.Database): Promise<void> {
  const invoices = listInvoices(db);
  if (invoices.length === 0) {
    console.log("削除できる請求書がありません。");
    return;
  }

  const invoice = await select<InvoiceRecord | typeof BACK>("削除する請求書を選択してください", [
    ...invoices.map((item) => {
      const title = item.title.trim() ? ` ${item.title}` : "";
      return {
        name: String(item.id),
        message: `${item.invoiceNumber}${title} ${item.clientName} ${formatYen(item.total)} ${item.googleDriveUrl ?? ""}`.trim(),
        value: item,
      };
    }),
    { name: BACK, shortcut: "b", message: "↩️ トップに戻る", value: BACK },
  ]);
  if (invoice === BACK) {
    return;
  }

  await deleteInvoiceRecord(db, invoice);
}

export async function deleteInvoiceRecord(db: Database.Database, invoice: InvoiceRecord): Promise<void> {
  console.log(`請求番号: ${invoice.invoiceNumber}`);
  if (invoice.title.trim()) {
    console.log(`件名: ${invoice.title}`);
  }
  console.log(`取引先: ${invoice.clientName}`);
  console.log(`合計: ${formatYen(invoice.total)}`);
  console.log(`PDF: ${invoice.pdfPath}`);
  if (invoice.googleDriveUrl) {
    console.log(`Google Drive: ${invoice.googleDriveUrl}`);
  }

  const confirmed = await confirm("Google Drive上のPDFとSQLiteの請求書レコードを削除しますか", false);
  if (!confirmed) {
    console.log("キャンセルしました。");
    return;
  }

  if (invoice.googleDriveFileId) {
    await deleteDriveFile(invoice.googleDriveFileId);
    console.log("Google Drive上のPDFを削除しました。");
  } else {
    console.log("Google Drive file IDがないため、Drive削除はスキップしました。");
  }

  deleteInvoice(db, invoice.id);
  console.log("SQLiteから請求書を削除しました。");

  if (await confirm("ローカルPDFも削除しますか", false)) {
    await unlink(invoice.pdfPath).catch((error: unknown) => {
      if (error instanceof Error) {
        console.warn(`ローカルPDF削除をスキップしました: ${error.message}`);
      }
    });
  }
}
