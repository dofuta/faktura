import {
  blob,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const now = () => new Date().toISOString();

export const tenants = sqliteTable("tenants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const companyProfiles = sqliteTable("company_profiles", {
  tenantId: integer("tenant_id")
    .primaryKey()
    .references(() => tenants.id),
  name: text("name").notNull().default(""),
  nameEn: text("name_en").notNull().default(""),
  postalCode: text("postal_code").notNull().default(""),
  address: text("address").notNull().default(""),
  addressEn: text("address_en").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  registrationNumber: text("registration_number").notNull().default(""),
  invoiceNotes: text("invoice_notes").notNull().default(""),
  invoiceNotesEn: text("invoice_notes_en").notNull().default(""),
  quotationNotes: text("quotation_notes")
    .notNull()
    .default("上記のとおり、見積り申し上げます。"),
  quotationNotesEn: text("quotation_notes_en")
    .notNull()
    .default("As stated above, we hereby submit our quotation."),
  deliveryNotes: text("delivery_notes")
    .notNull()
    .default("上記のとおり、納品いたします。"),
  deliveryNotesEn: text("delivery_notes_en")
    .notNull()
    .default("As stated above, we hereby confirm delivery."),
  bankName: text("bank_name").notNull().default(""),
  bankNameEn: text("bank_name_en").notNull().default(""),
  bankBranch: text("bank_branch").notNull().default(""),
  bankBranchEn: text("bank_branch_en").notNull().default(""),
  bankAccountType: text("bank_account_type").notNull().default(""),
  bankAccountTypeEn: text("bank_account_type_en").notNull().default(""),
  bankAccountNumber: text("bank_account_number").notNull().default(""),
  bankAccountHolder: text("bank_account_holder").notNull().default(""),
  bankAccountHolderEn: text("bank_account_holder_en").notNull().default(""),
});

export const settings = sqliteTable(
  "settings",
  {
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id),
    key: text("key").notNull(),
    value: text("value").notNull(),
  },
  (table) => [primaryKey({ columns: [table.tenantId, table.key] })],
);

export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: text("name").notNull(),
  email: text("email").notNull().default(""),
  address: text("address").notNull().default(""),
  language: text("language", { enum: ["ja", "en"] })
    .notNull()
    .default("ja"),
  createdAt: text("created_at").notNull().$defaultFn(now),
  updatedAt: text("updated_at").notNull().$defaultFn(now),
});

export const invoices = sqliteTable(
  "invoices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id),
    status: text("status", { enum: ["draft", "issued"] })
      .notNull()
      .default("draft"),
    invoiceNumber: text("invoice_number"),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id),
    title: text("title").notNull().default(""),
    issueDate: text("issue_date").notNull(),
    dueDate: text("due_date").notNull(),
    notes: text("notes").notNull().default(""),
    subtotal: integer("subtotal"),
    taxAmount: integer("tax_amount"),
    total: integer("total"),
    companySnapshot: text("company_snapshot"),
    pdf: blob("pdf", { mode: "buffer" }),
    driveFileId: text("drive_file_id"),
    driveUrl: text("drive_url"),
    createdAt: text("created_at").notNull().$defaultFn(now),
    updatedAt: text("updated_at").notNull().$defaultFn(now),
    issuedAt: text("issued_at"),
  },
  (table) => [uniqueIndex("invoices_invoice_number_unique").on(table.invoiceNumber)],
);

export const invoiceItems = sqliteTable("invoice_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
  description: text("description").notNull().default(""),
  unitPrice: integer("unit_price").notNull().default(0),
  quantity: real("quantity").notNull().default(1),
  taxRate: real("tax_rate").notNull().default(0.1),
});

export const invoiceSequences = sqliteTable(
  "invoice_sequences",
  {
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id),
    period: text("period").notNull(),
    lastNumber: integer("last_number").notNull(),
  },
  (table) => [primaryKey({ columns: [table.tenantId, table.period] })],
);

export type Tenant = typeof tenants.$inferSelect;
export type CompanyProfile = typeof companyProfiles.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
