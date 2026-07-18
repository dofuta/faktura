"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { invoiceFormSchema, type InvoiceFormValues } from "@/invoice/formSchema";
import { generateDraftWithAi } from "@/server/ai";
import { getClientById } from "@/server/clients";
import { deleteDriveFile } from "@/server/google";
import {
  createDraftInvoice,
  getInvoiceDetail,
  removeInvoice,
  updateDraftInvoice,
} from "@/server/invoices";
import { issueInvoice } from "@/server/issue";

const newDraftSchema = z.object({
  clientId: z.number().int().positive("取引先を選択してください"),
  instruction: z.string(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
  notes: z.string(),
});

export type NewDraftValues = z.infer<typeof newDraftSchema>;

type ActionResult = { error?: string; id?: number; warning?: string };

export async function createDraftAction(
  values: NewDraftValues,
  mode: "ai" | "manual",
): Promise<ActionResult> {
  const parsed = newDraftSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const client = await getClientById(data.clientId);
  if (!client) {
    return { error: "取引先が見つかりません" };
  }

  try {
    if (mode === "manual") {
      const id = await createDraftInvoice({
        clientId: data.clientId,
        title: "",
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        notes: data.notes,
        items: [{ description: "", unitPrice: 0, quantity: 1, taxRate: 0.1 }],
      });
      return { id };
    }

    if (!data.instruction.trim()) {
      return { error: "請求内容を入力してください" };
    }

    const draft = await generateDraftWithAi({
      client,
      instruction: data.instruction,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      notes: data.notes,
    });

    const id = await createDraftInvoice({
      clientId: data.clientId,
      title: draft.title,
      issueDate: draft.issueDate,
      dueDate: draft.dueDate,
      notes: draft.notes,
      items: draft.items,
    });
    return { id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function updateDraftAction(
  id: number,
  values: InvoiceFormValues,
): Promise<ActionResult> {
  const parsed = invoiceFormSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await updateDraftInvoice(id, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  revalidatePath("/");
  revalidatePath(`/invoices/${id}`);
  return {};
}

export async function issueInvoiceAction(id: number): Promise<ActionResult> {
  try {
    const result = await issueInvoice(id);
    if (result.error) {
      return { error: result.error };
    }
    revalidatePath("/");
    revalidatePath(`/invoices/${id}`);
    return { warning: result.warning };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function deleteInvoiceAction(id: number): Promise<ActionResult> {
  const detail = await getInvoiceDetail(id);
  if (!detail) {
    return { error: "請求書が見つかりません" };
  }

  let warning: string | undefined;
  if (detail.invoice.driveFileId) {
    try {
      await deleteDriveFile(detail.invoice.driveFileId);
    } catch (error) {
      warning = `Drive上のPDF削除に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  }

  await removeInvoice(id);
  revalidatePath("/");
  return { warning };
}
