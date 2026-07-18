import path from "node:path";
import YAML from "yaml";
import { z } from "zod";
import { readTextFile, writeTextFile } from "../utils/files.js";

export const draftClientSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  email: z.string().optional().default(""),
  address: z.string().optional().default(""),
  language: z.enum(["ja", "en"]).optional().default("ja"),
});

export const invoiceItemSchema = z.object({
  description: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().positive(),
  taxRate: z.number().min(0).max(1),
});

export const invoiceDraftSchema = z.object({
  client: draftClientSchema,
  title: z.string().optional().default(""),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(invoiceItemSchema).min(1),
  notes: z.string().optional().default(""),
});

export type InvoiceDraft = z.infer<typeof invoiceDraftSchema>;
export type InvoiceItem = z.infer<typeof invoiceItemSchema>;

export function parseInvoiceDraft(raw: unknown): InvoiceDraft {
  return invoiceDraftSchema.parse(raw);
}

export async function readInvoiceDraft(filePath: string): Promise<InvoiceDraft> {
  const raw = await readTextFile(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const parsed = extension === ".json" ? JSON.parse(raw) : YAML.parse(raw);
  return parseInvoiceDraft(parsed);
}

export async function writeInvoiceDraft(filePath: string, draft: InvoiceDraft): Promise<void> {
  const extension = path.extname(filePath).toLowerCase();
  const content =
    extension === ".json"
      ? `${JSON.stringify(draft, null, 2)}\n`
      : YAML.stringify(draft, { lineWidth: 0 });

  await writeTextFile(filePath, content);
}
