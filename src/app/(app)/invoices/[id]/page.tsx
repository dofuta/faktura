import { notFound } from "next/navigation";
import { getInvoiceDetail } from "@/server/invoices";
import { listClientsWithInvoiceCount } from "@/server/clients";
import { InvoiceEditor } from "./invoice-editor";
import { IssuedInvoiceView } from "./issued-view";

export const dynamic = "force-dynamic";
// 発行(Chromium起動+PDF生成+Driveアップロード)がこのページのserver actionで走る
export const maxDuration = 60;

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoiceId = Number(id);
  if (!Number.isInteger(invoiceId)) {
    notFound();
  }

  const detail = await getInvoiceDetail(invoiceId);
  if (!detail) {
    notFound();
  }

  if (detail.invoice.status === "issued") {
    return (
      <IssuedInvoiceView
        invoice={{
          id: detail.invoice.id,
          invoiceNumber: detail.invoice.invoiceNumber,
          title: detail.invoice.title,
          issueDate: detail.invoice.issueDate,
          dueDate: detail.invoice.dueDate,
          total: detail.invoice.total,
          driveUrl: detail.invoice.driveUrl,
          clientName: detail.client.name,
          clientLanguage: detail.client.language,
        }}
      />
    );
  }

  const clients = await listClientsWithInvoiceCount();

  return (
    <InvoiceEditor
      invoiceId={detail.invoice.id}
      clients={clients.map((client) => ({ id: client.id, name: client.name }))}
      initial={{
        clientId: detail.invoice.clientId,
        title: detail.invoice.title,
        issueDate: detail.invoice.issueDate,
        dueDate: detail.invoice.dueDate,
        notes: detail.invoice.notes,
        items: detail.items.map((item) => ({
          description: item.description,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          taxRate: item.taxRate,
        })),
      }}
    />
  );
}
