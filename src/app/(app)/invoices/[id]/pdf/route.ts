import { notFound } from "next/navigation";
import { buildPdfFileName } from "@/invoice/filename";
import { getInvoiceDetail } from "@/server/invoices";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const detail = await getInvoiceDetail(Number(id));
  if (!detail || detail.invoice.status !== "issued" || !detail.invoice.pdf) {
    notFound();
  }

  const fileName = buildPdfFileName(
    detail.invoice.issueDate,
    detail.client.name,
    detail.client.language,
  );

  return new Response(new Uint8Array(detail.invoice.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
