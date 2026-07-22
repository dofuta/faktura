import { z } from "zod";
import { invoiceItemFormSchema } from "./formSchema";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください");

export const quickDocumentTypeSchema = z.enum(["quotation", "delivery"]);
export type QuickDocumentType = z.infer<typeof quickDocumentTypeSchema>;

export const quickDocumentFormSchema = z.object({
  documentType: quickDocumentTypeSchema,
  clientId: z.number().int().positive("取引先を選択してください"),
  title: z.string(),
  issueDate: dateString,
  secondDate: dateString.or(z.literal("")),
  notes: z.string(),
  items: z.array(invoiceItemFormSchema),
});

export type QuickDocumentFormValues = z.infer<typeof quickDocumentFormSchema>;
