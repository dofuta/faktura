import { addDays, format } from "date-fns";
import { NextResponse } from "next/server";
import { buildPdfFileName } from "@/invoice/filename";
import { renderInvoiceHtml } from "@/invoice/render";
import { getCompanyProfile, toCompanySnapshot } from "@/server/company";
import { getInvoiceDetail } from "@/server/invoices";
import { renderPdfFromHtml } from "@/server/pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const detail = await getInvoiceDetail(Number(id));
  if (!detail) {
    return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 });
  }

  const { invoice, client, items } = detail;
  const company = toCompanySnapshot(await getCompanyProfile());
  const validUntil = format(addDays(new Date(invoice.issueDate), 30), "yyyy-MM-dd");

  const html = renderInvoiceHtml({
    invoiceNumber: null,
    documentType: "quotation",
    language: client.language,
    company,
    client: { name: client.name, address: client.address, email: client.email },
    title: invoice.title,
    issueDate: invoice.issueDate,
    dueDate: validUntil,
    notes: invoice.notes,
    items: items.map((item) => ({
      description: item.description,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      taxRate: item.taxRate,
    })),
  });

  const pdf = await renderPdfFromHtml(html);
  const fileName = buildPdfFileName(invoice.issueDate, client.name, client.language, "QUOTATION");

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
