import { listClientsWithInvoiceCount } from "@/server/clients";
import { QuickDocumentForm } from "./quick-document-form";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const clients = await listClientsWithInvoiceCount();

  return (
    <QuickDocumentForm
      clients={clients.map((client) => ({ id: client.id, name: client.name }))}
    />
  );
}
