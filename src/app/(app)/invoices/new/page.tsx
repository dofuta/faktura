import { listClientsWithInvoiceCount } from "@/server/clients";
import { NewInvoiceForm } from "./new-invoice-form";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const clients = await listClientsWithInvoiceCount();
  return (
    <NewInvoiceForm
      clients={clients.map((client) => ({ id: client.id, name: client.name }))}
    />
  );
}
