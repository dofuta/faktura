import type Database from "better-sqlite3";

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      language TEXT NOT NULL DEFAULT 'ja',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoice_sequences (
      period TEXT PRIMARY KEY,
      last_number INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      client_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      subtotal INTEGER NOT NULL,
      tax_amount INTEGER NOT NULL,
      total INTEGER NOT NULL,
      draft_path TEXT NOT NULL,
      pdf_path TEXT NOT NULL,
      google_drive_file_id TEXT,
      google_drive_url TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      unit_price INTEGER NOT NULL,
      quantity REAL NOT NULL,
      tax_rate REAL NOT NULL,
      subtotal INTEGER NOT NULL,
      tax_amount INTEGER NOT NULL,
      total INTEGER NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );
  `);

  const invoiceColumns = db.prepare("PRAGMA table_info(invoices)").all() as Array<{ name: string }>;
  if (!invoiceColumns.some((column) => column.name === "title")) {
    db.exec("ALTER TABLE invoices ADD COLUMN title TEXT NOT NULL DEFAULT ''");
  }

  const clientColumns = db.prepare("PRAGMA table_info(clients)").all() as Array<{ name: string }>;
  if (!clientColumns.some((column) => column.name === "language")) {
    db.exec("ALTER TABLE clients ADD COLUMN language TEXT NOT NULL DEFAULT 'ja'");
  }
}
