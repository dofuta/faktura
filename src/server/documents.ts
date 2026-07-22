import type { QuickDocumentFormValues } from "@/invoice/documentFormSchema";
import type { InvoiceRenderInput } from "@/invoice/render";
import { getClientById } from "./clients";
import { getCompanyProfile, toCompanySnapshot } from "./company";

export async function buildQuickDocumentRenderInput(
  input: QuickDocumentFormValues,
): Promise<InvoiceRenderInput> {
  const client = await getClientById(input.clientId);
  if (!client) {
    throw new Error("取引先が見つかりません");
  }

  const company = toCompanySnapshot(await getCompanyProfile());

  return {
    invoiceNumber: null,
    documentType: input.documentType,
    language: client.language,
    company,
    client: { name: client.name, address: client.address, email: client.email },
    title: input.title,
    issueDate: input.issueDate,
    dueDate: input.secondDate,
    notes: input.notes,
    items: input.items,
  };
}
