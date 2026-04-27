import { format } from "date-fns";
import type Database from "better-sqlite3";

export function getInvoicePeriod(date = new Date()): string {
  return format(date, "yyyyMM");
}

export function reserveInvoiceNumber(db: Database.Database, date = new Date()): string {
  const period = getInvoicePeriod(date);

  const tx = db.transaction(() => {
    const row = db
      .prepare("SELECT last_number AS lastNumber FROM invoice_sequences WHERE period = ?")
      .get(period) as { lastNumber: number } | undefined;

    const next = (row?.lastNumber ?? 0) + 1;

    db.prepare(
      `INSERT INTO invoice_sequences (period, last_number)
       VALUES (@period, @lastNumber)
       ON CONFLICT(period) DO UPDATE SET last_number = excluded.last_number`,
    ).run({ period, lastNumber: next });

    return next;
  });

  const next = tx();
  return `${period}-${String(next).padStart(3, "0")}`;
}

export function buildDraftFileName(invoiceNumber: string, extension = "yml"): string {
  return `${invoiceNumber}.${extension}`;
}
