import { notFound } from "next/navigation";
import { renderInvoiceHtml } from "@/invoice/render";
import { buildRenderInput } from "@/server/invoices";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const input = await buildRenderInput(Number(id));
  if (!input) {
    notFound();
  }

  return new Response(renderInvoiceHtml(input), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
