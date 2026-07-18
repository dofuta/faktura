/**
 * 旧CLI(better-sqlite3)のDBとcompany.ymlを新スキーマへ一回きり移行する。
 *
 *   npm run db:migrate-from-cli -- [旧DBパス] [company.ymlパス]
 *
 * デフォルト: data/invoices.db, config/company.yml
 * 既にデータがあるテーブルへはIDが衝突した行をスキップする。
 */
import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

for (const file of [".env", ".env.local"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // ファイルがなければ無視
  }
}

const OLD_DB_PATH = process.argv[2] ?? "data/invoices.db";
const COMPANY_YML_PATH = process.argv[3] ?? "config/company.yml";

async function main() {
  const { db, schema } = await import("../src/db");
  const { TENANT_ID } = await import("../src/lib/tenant");
  const { eq } = await import("drizzle-orm");

  const old = createClient({ url: `file:${OLD_DB_PATH}` });

  // 取引先
  const clients = await old.execute("SELECT * FROM clients");
  for (const row of clients.rows) {
    await db
      .insert(schema.clients)
      .values({
        id: Number(row.id),
        tenantId: TENANT_ID,
        name: String(row.name),
        email: String(row.email ?? ""),
        address: String(row.address ?? ""),
        language: row.language === "en" ? "en" : "ja",
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      })
      .onConflictDoNothing();
  }
  console.log(`clients: ${clients.rows.length}`);

  // 請求書(すべて発行済みとして移行。PDFはローカルファイルがあれば取り込む)
  const invoices = await old.execute("SELECT * FROM invoices");
  let pdfCount = 0;
  for (const row of invoices.rows) {
    let pdf: Buffer | null = null;
    try {
      pdf = await readFile(String(row.pdf_path));
      pdfCount += 1;
    } catch {
      // ローカルPDFが見つからない場合はBLOBなしで移行
    }

    await db
      .insert(schema.invoices)
      .values({
        id: Number(row.id),
        tenantId: TENANT_ID,
        status: "issued",
        invoiceNumber: String(row.invoice_number),
        clientId: Number(row.client_id),
        title: String(row.title ?? ""),
        issueDate: String(row.issue_date),
        dueDate: String(row.due_date),
        notes: String(row.notes ?? ""),
        subtotal: Number(row.subtotal),
        taxAmount: Number(row.tax_amount),
        total: Number(row.total),
        pdf,
        driveFileId: row.google_drive_file_id ? String(row.google_drive_file_id) : null,
        driveUrl: row.google_drive_url ? String(row.google_drive_url) : null,
        createdAt: String(row.created_at),
        updatedAt: String(row.created_at),
        issuedAt: String(row.created_at),
      })
      .onConflictDoNothing();
  }
  console.log(`invoices: ${invoices.rows.length} (PDF取り込み: ${pdfCount})`);

  // 明細
  const items = await old.execute("SELECT * FROM invoice_items ORDER BY id");
  for (const row of items.rows) {
    await db
      .insert(schema.invoiceItems)
      .values({
        id: Number(row.id),
        invoiceId: Number(row.invoice_id),
        position: Number(row.id),
        description: String(row.description),
        unitPrice: Number(row.unit_price),
        quantity: Number(row.quantity),
        taxRate: Number(row.tax_rate),
      })
      .onConflictDoNothing();
  }
  console.log(`invoice_items: ${items.rows.length}`);

  // 採番
  const sequences = await old.execute("SELECT * FROM invoice_sequences");
  for (const row of sequences.rows) {
    await db
      .insert(schema.invoiceSequences)
      .values({
        tenantId: TENANT_ID,
        period: String(row.period),
        lastNumber: Number(row.last_number),
      })
      .onConflictDoNothing();
  }
  console.log(`invoice_sequences: ${sequences.rows.length}`);

  // 会社情報 (company.yml)
  try {
    const YAML = (await import("yaml")).default;
    const raw = await readFile(COMPANY_YML_PATH, "utf8");
    const company = YAML.parse(raw) as {
      name?: string;
      postalCode?: string;
      address?: string;
      email?: string;
      phone?: string;
      registrationNumber?: string;
      invoiceNotes?: string;
      bank?: {
        name?: string;
        branch?: string;
        accountType?: string;
        accountNumber?: string;
        accountHolder?: string;
      };
    };

    await db
      .insert(schema.companyProfiles)
      .values({ tenantId: TENANT_ID })
      .onConflictDoNothing();
    await db
      .update(schema.companyProfiles)
      .set({
        name: company.name ?? "",
        postalCode: company.postalCode ?? "",
        address: company.address ?? "",
        email: company.email ?? "",
        phone: company.phone ?? "",
        registrationNumber: company.registrationNumber ?? "",
        invoiceNotes: company.invoiceNotes ?? "",
        bankName: company.bank?.name ?? "",
        bankBranch: company.bank?.branch ?? "",
        bankAccountType: company.bank?.accountType ?? "",
        bankAccountNumber: company.bank?.accountNumber ?? "",
        bankAccountHolder: company.bank?.accountHolder ?? "",
      })
      .where(eq(schema.companyProfiles.tenantId, TENANT_ID));
    console.log(`company profile: ${COMPANY_YML_PATH} から移行`);
  } catch {
    console.log(`company profile: ${COMPANY_YML_PATH} が読めないためスキップ`);
  }

  console.log("移行が完了しました。");
}

main().then(() => process.exit(0));
