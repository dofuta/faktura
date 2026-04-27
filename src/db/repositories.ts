import type Database from "better-sqlite3";
import type { Client, InvoiceRecord, NewClient } from "./schema.js";
import type { InvoiceDraft } from "../invoice/schema.js";
import type { InvoiceTotals } from "../invoice/totals.js";

type ClientRow = {
  id: number;
  name: string;
  email: string;
  address: string;
  language: "ja" | "en";
  created_at: string;
  updated_at: string;
};

type InvoiceRow = {
  id: number;
  invoice_number: string;
  client_id: number;
  client_name: string;
  title: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  draft_path: string;
  pdf_path: string;
  google_drive_file_id: string | null;
  google_drive_url: string | null;
  created_at: string;
};

export type SaveInvoiceInput = {
  invoiceNumber: string;
  draft: InvoiceDraft;
  totals: InvoiceTotals;
  draftPath: string;
  pdfPath: string;
  googleDriveFileId?: string;
  googleDriveUrl?: string;
};

function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    address: row.address,
    language: row.language === "en" ? "en" : "ja",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInvoice(row: InvoiceRow): InvoiceRecord {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    clientId: row.client_id,
    clientName: row.client_name,
    title: row.title,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    subtotal: row.subtotal,
    taxAmount: row.tax_amount,
    total: row.total,
    draftPath: row.draft_path,
    pdfPath: row.pdf_path,
    googleDriveFileId: row.google_drive_file_id ?? undefined,
    googleDriveUrl: row.google_drive_url ?? undefined,
    createdAt: row.created_at,
  };
}

export function listClients(db: Database.Database): Client[] {
  const rows = db
    .prepare("SELECT * FROM clients ORDER BY name COLLATE NOCASE")
    .all() as ClientRow[];
  return rows.map(mapClient);
}

export function createClient(db: Database.Database, input: NewClient): Client {
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO clients (name, email, address, language, created_at, updated_at)
       VALUES (@name, @email, @address, @language, @now, @now)`,
    )
    .run({
      name: input.name,
      email: input.email ?? "",
      address: input.address ?? "",
      language: input.language ?? "ja",
      now,
    });

  const row = db.prepare("SELECT * FROM clients WHERE id = ?").get(info.lastInsertRowid) as ClientRow;
  return mapClient(row);
}

export function updateClient(db: Database.Database, id: number, input: NewClient): Client {
  db.prepare(
    `UPDATE clients
     SET name = @name, email = @email, address = @address, language = @language, updated_at = @updatedAt
     WHERE id = @id`,
  ).run({
    id,
    name: input.name,
    email: input.email ?? "",
    address: input.address ?? "",
    language: input.language ?? "ja",
    updatedAt: new Date().toISOString(),
  });

  const row = db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as ClientRow | undefined;
  if (!row) {
    throw new Error(`Client not found: ${id}`);
  }

  return mapClient(row);
}

export function getClient(db: Database.Database, id: number): Client | undefined {
  const row = db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as ClientRow | undefined;
  return row ? mapClient(row) : undefined;
}

export function saveInvoice(db: Database.Database, input: SaveInvoiceInput): InvoiceRecord {
  const insertInvoice = db.prepare(
    `INSERT INTO invoices (
      invoice_number, client_id, title, issue_date, due_date, notes,
      subtotal, tax_amount, total, draft_path, pdf_path,
      google_drive_file_id, google_drive_url
    ) VALUES (
      @invoiceNumber, @clientId, @title, @issueDate, @dueDate, @notes,
      @subtotal, @taxAmount, @total, @draftPath, @pdfPath,
      @googleDriveFileId, @googleDriveUrl
    )`,
  );

  const insertItem = db.prepare(
    `INSERT INTO invoice_items (
      invoice_id, description, unit_price, quantity, tax_rate,
      subtotal, tax_amount, total
    ) VALUES (
      @invoiceId, @description, @unitPrice, @quantity, @taxRate,
      @subtotal, @taxAmount, @total
    )`,
  );

  const tx = db.transaction(() => {
    const info = insertInvoice.run({
      invoiceNumber: input.invoiceNumber,
      clientId: input.draft.client.id,
      title: input.draft.title,
      issueDate: input.draft.issueDate,
      dueDate: input.draft.dueDate,
      notes: input.draft.notes ?? "",
      subtotal: input.totals.subtotal,
      taxAmount: input.totals.taxAmount,
      total: input.totals.total,
      draftPath: input.draftPath,
      pdfPath: input.pdfPath,
      googleDriveFileId: input.googleDriveFileId ?? null,
      googleDriveUrl: input.googleDriveUrl ?? null,
    });

    for (const item of input.totals.items) {
      insertItem.run({
        invoiceId: info.lastInsertRowid,
        description: item.description,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        taxRate: item.taxRate,
        subtotal: item.subtotal,
        taxAmount: item.taxAmount,
        total: item.total,
      });
    }

    return info.lastInsertRowid as number;
  });

  const invoiceId = tx();
  const invoice = getInvoice(db, invoiceId);
  if (!invoice) {
    throw new Error(`Invoice save failed: ${input.invoiceNumber}`);
  }

  return invoice;
}

export function getInvoice(db: Database.Database, id: number): InvoiceRecord | undefined {
  const row = db
    .prepare(
      `SELECT invoices.*, clients.name AS client_name
       FROM invoices
       JOIN clients ON clients.id = invoices.client_id
       WHERE invoices.id = ?`,
    )
    .get(id) as InvoiceRow | undefined;
  return row ? mapInvoice(row) : undefined;
}

export function invoiceNumberExists(db: Database.Database, invoiceNumber: string): boolean {
  const row = db
    .prepare("SELECT 1 FROM invoices WHERE invoice_number = ? LIMIT 1")
    .get(invoiceNumber) as { "1": number } | undefined;
  return Boolean(row);
}

export function listInvoices(db: Database.Database): InvoiceRecord[] {
  const rows = db
    .prepare(
      `SELECT invoices.*, clients.name AS client_name
       FROM invoices
       JOIN clients ON clients.id = invoices.client_id
       ORDER BY invoices.created_at DESC`,
    )
    .all() as InvoiceRow[];
  return rows.map(mapInvoice);
}

export function deleteInvoice(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM invoices WHERE id = ?").run(id);
}
