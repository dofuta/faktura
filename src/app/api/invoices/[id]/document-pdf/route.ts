import { NextResponse } from "next/server";
import { z } from "zod";
import { buildPdfFileName } from "@/invoice/filename";
import { renderInvoiceHtml } from "@/invoice/render";
import { getCompanyProfile, toCompanySnapshot } from "@/server/company";
import { getInvoiceDetail } from "@/server/invoices";
import { renderPdfFromHtml } from "@/server/pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  documentType: z.enum(["quotation", "delivery"]),
  secondDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal(""))
    .default(""),
});

const FILENAME_PREFIX = { quotation: "QUOTATION", delivery: "DELIVERY" } as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const detail = await getInvoiceDetail(Number(id));
  if (!detail) {
    return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 });
  }

  const { invoice, client, items } = detail;
  const company = toCompanySnapshot(await getCompanyProfile());

  const html = renderInvoiceHtml({
    invoiceNumber: null,
    documentType: parsed.data.documentType,
    language: client.language,
    company,
    client: { name: client.name, address: client.address, email: client.email },
    title: invoice.title,
    issueDate: invoice.issueDate,
    dueDate: parsed.data.secondDate,
    notes: invoice.notes,
    items: items.map((item) => ({
      description: item.description,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      taxRate: item.taxRate,
    })),
  });

  const pdf = await renderPdfFromHtml(html);
  const fileName = buildPdfFileName(
    invoice.issueDate,
    client.name,
    client.language,
    FILENAME_PREFIX[parsed.data.documentType],
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
