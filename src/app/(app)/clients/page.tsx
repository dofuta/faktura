import { listClientsWithInvoiceCount } from "@/server/clients";
import { ClientsView } from "./clients-view";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await listClientsWithInvoiceCount();
  return <ClientsView clients={clients} />;
}
