import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください");

export const invoiceItemFormSchema = z.object({
  description: z.string(),
  unitPrice: z.number().nonnegative(),
  quantity: z.number(),
  taxRate: z.number().min(0).max(1),
});

export const invoiceFormSchema = z.object({
  clientId: z.number().int().positive(),
  title: z.string(),
  issueDate: dateString,
  // 空文字列は「支払期限の記載なし」
  dueDate: dateString.or(z.literal("")),
  notes: z.string(),
  items: z.array(invoiceItemFormSchema).min(1, "明細を1行以上入力してください"),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
